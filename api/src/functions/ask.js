// CareLoop record assistant: a small proxy from the page to Azure OpenAI.
// The API key stays in the app's environment variables and never reaches the browser.
// Limits keep a public demo from running up the bill. They are simple, not bulletproof:
// also set a low tokens-per-minute limit on the model deployment and a budget alert in Azure.
const { app } = require("@azure/functions");

const SYSTEM = "You are the record assistant inside CareLoop, a hackathon prototype where all patients and data are made up. Only answer questions about the CareLoop record in the user's message, following the rules given there. If a request has nothing to do with that record, reply: \"I can only answer questions about this record.\"";
const MAX_MSGS = 12;          // messages per request
const MAX_CHARS = 20000;      // total characters per request
const PER_MIN = 6;            // questions per visitor per minute
const PER_DAY = 60;           // questions per visitor per day
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 600); // all visitors, per running instance

const hits = new Map();
let day = "", total = 0;

function clientIp(req) {
  const h = (req.headers.get("x-forwarded-for") || req.headers.get("x-client-ip") || "unknown").split(",")[0].trim();
  return h.includes(".") ? h.replace(/:\d+$/, "") : h; // drop the port from IPv4 addresses
}

// Returns a reason string when the request should be refused, or "" when it may go ahead.
function limitReason(ip) {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== day) { day = d; total = 0; hits.clear(); }
  if (total >= DAILY_LIMIT) return "The demo's daily AI limit is used up. Try again tomorrow.";
  const now = Date.now();
  const h = hits.get(ip) || { min: [], day: 0 };
  h.min = h.min.filter(t => now - t < 60000);
  if (h.min.length >= PER_MIN || h.day >= PER_DAY) { hits.set(ip, h); return "Too many questions. Wait a minute and try again."; }
  h.min.push(now); h.day++; total++; hits.set(ip, h);
  return "";
}

function cleanMessages(body) {
  const m = body && Array.isArray(body.messages) ? body.messages : null;
  if (!m || !m.length || m.length > MAX_MSGS) return null;
  let n = 0;
  for (const x of m) {
    if (!x || (x.role !== "user" && x.role !== "assistant") || typeof x.content !== "string") return null;
    n += x.content.length;
  }
  if (n > MAX_CHARS || m[m.length - 1].role !== "user") return null;
  return m.map(x => ({ role: x.role, content: x.content }));
}

function fail(status, message) { return Object.assign(new Error(message), { status }); }

async function callAzure(messages) {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const version = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(version)}`;
  const send = extra => fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "api-key": key },
    body: JSON.stringify({ messages: [{ role: "system", content: SYSTEM }, ...messages], ...extra }),
    signal: AbortSignal.timeout(25000)
  });
  let r = await send({ max_completion_tokens: 400 });
  if (r.status === 400) {
    // Older models and API versions only accept max_tokens.
    const t = await r.text();
    if (!/max_completion_tokens/.test(t)) throw fail(502, t.slice(0, 300));
    r = await send({ max_tokens: 400 });
  }
  if (r.status === 429) throw fail(429, "Azure rate limit");
  if (!r.ok) throw fail(502, (await r.text()).slice(0, 300));
  const j = await r.json();
  const c = j.choices && j.choices[0];
  if (c && c.finish_reason === "content_filter") return "I can't answer that.";
  return ((c && c.message && c.message.content) || "").trim();
}

app.http("ask", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    const ready = Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_KEY && process.env.AZURE_OPENAI_DEPLOYMENT);
    if (req.method === "GET") return { jsonBody: { ok: ready } }; // the page checks this to decide whether to offer AI
    if (!ready) return { status: 503, jsonBody: { error: "AI isn't set up yet." } };
    let body;
    try { body = await req.json(); } catch (e) { return { status: 400, jsonBody: { error: "Bad request" } }; }
    const messages = cleanMessages(body);
    if (!messages) return { status: 400, jsonBody: { error: "Bad request" } };
    const why = limitReason(clientIp(req));
    if (why) return { status: 429, jsonBody: { error: why } };
    try {
      return { jsonBody: { text: await callAzure(messages) } };
    } catch (e) {
      context.error("ask failed", e.status, e.message);
      return e.status === 429
        ? { status: 429, jsonBody: { error: "AI busy, try again in a minute." } }
        : { status: 502, jsonBody: { error: "AI didn't answer." } };
    }
  }
});
