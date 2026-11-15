# Running CareLoop's AI assistant on Azure

The page (`index.html`) and a small Azure Function (`api/`) deploy together as an Azure Static Web App. The function forwards record questions to Azure OpenAI. The API key is kept in Azure's settings, never in the code or the browser.

Never paste the key into chat, code, the README or a commit.

## 1. Activate the credits
On the Hack2skill dashboard, go to Resources and click **Explore your Azure resources**. Follow the steps until you have an Azure subscription at https://portal.azure.com.

## 2. Create the AI model
1. In the portal: **Create a resource**, then search **Azure OpenAI**, then **Create**.
2. Fill in:
   - **Resource group:** create a new one called `careloop`
   - **Region:** one that offers the model below, e.g. East US 2 or Sweden Central
   - **Name:** any name
   - **Pricing tier:** Standard S0
3. When it's created, open it and go to the Azure AI Foundry portal. Then **Deployments**, then **Deploy model**.
4. Pick a small chat model, such as `gpt-4.1-mini`. If that isn't listed, pick the cheapest "mini" chat model. Avoid reasoning models (o-series): with the short answer limit they can return empty answers.
5. Name the deployment `careloop-chat`. Set **Tokens per minute** low, e.g. 10K. This is your main cost cap.
6. Back on the resource in the portal, open **Keys and Endpoint**. Keep this tab open for step 4.

## 3. Publish the app
1. Commit and push this repository in GitHub Desktop first. The `api` folder and `staticwebapp.config.json` must be on GitHub.
2. In the portal: **Create a resource**, then **Static Web App**, then **Create**.
3. Fill in:
   - **Resource group:** `careloop`
   - **Name:** `careloop`
   - **Plan:** Free
   - **Source:** GitHub. Sign in, then choose your account, the repository `careloop` and the branch `main`.
   - **Build presets:** Custom
   - **App location:** `/`
   - **Api location:** `api`
   - **Output location:** leave empty
4. Click **Create**. Azure adds a workflow file to the repository and deploys. Watch progress in the repository's **Actions** tab on GitHub; it takes about 2–4 minutes.
5. In GitHub Desktop, click **Fetch origin**, then **Pull**, so you have the new workflow file.

## 4. Add the key
In the Static Web App, open **Settings**, then **Environment variables**, then **Production**. Add these, then click **Apply**:

| Name | Value |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | The Endpoint from Keys and Endpoint |
| `AZURE_OPENAI_KEY` | Key 1 |
| `AZURE_OPENAI_DEPLOYMENT` | `careloop-chat` |

## 5. Test
1. Open the app's URL (on its Overview page, ending in `azurestaticapps.net`) with `/api/ask` added at the end. It should show `{"ok":true}`.
2. Open the app itself and click **Ask the record**. It should be tagged **AI** and say "Answers by Azure OpenAI". Ask Sara's pharmacy question: "Any allergies I should know about?"

## 6. Set a budget alert
In **Cost Management**, open **Budgets** and add a budget (e.g. US$10) with an email alert.

## Built-in limits
- 6 questions a minute and 60 a day per visitor
- 600 a day in total (change this with a `DAILY_LIMIT` environment variable)
- 12 messages and 20,000 characters per request, and about 400 words of tokens per answer

These limits are simple, not bulletproof. Your real cost caps are the deployment's tokens-per-minute limit and the budget alert.

## If something goes wrong
- **`{"ok":false}`:** an environment variable is missing, or you didn't click Apply.
- **"AI didn't answer":**
  - Check that the deployment name and endpoint are right.
  - Open the Static Web App's **Functions** page, or Application Insights, for the error.
- **The deploy fails with a Node version error:** change `node:22` to `node:20` in `staticwebapp.config.json`, then commit and push.
- **Changes to the page:** commit and push. Azure and GitHub Pages both redeploy on their own.
