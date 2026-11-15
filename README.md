# CareLoop

A prototype for the Future Health Digital Innovation Challenge 2026, under the challenge statement *Closing the Screening-to-Care Loop*.

CareLoop follows a person from a screening result to documented care. Each case has named owners, due dates and evidence for every step. A case closes only with evidence or a named clinician's decision. Patients control who can see their record, and every view is logged.

**Live demo:** see this repository's GitHub Pages link.

## What's in the prototype
- **Three patient profiles:**
  - Sara: the loop is in progress
  - Daniel: the loop broke, then was rescued
  - Mary: an emergency, with full access allowed
- **A case view** with eight steps, from Flagged to Closed: owners, due dates, evidence, escalation, rejection and reassignment, and messages to the patient.
- **Role-based views** for the patient, a clinic, a pharmacy, an ambulance, an admin and a regulator.
- **Simulated fingerprint identification:**
  - a one-to-one check at normal visits, a one-to-many search in emergencies
  - fallbacks: one-time code (demo code 4829), ID card + PIN (demo PIN 2580), or staff-assisted entry (flagged)
- **A patient access manager:** full access or chosen sections, kept on until the patient turns it off, plus access requests and an emergency-access switch.
- **An audit log** for every view, file opened, upload, request and emergency access.
- **Screening programmes:** the demo data is hypertension, and the dashboard shows the same case engine set up with example rules for diabetes, cervical cancer, TB and newborn sickle cell screening.
- **A closure dashboard** built from a simulated group of 60 cases: time to notification, confirmation and care; where cases drop off and why; overdue cases; small groups hidden.
- **A record assistant ("Ask the record"):** answers only from what the current viewer may see and cites its sources.
  - On the claude.ai version it uses AI for signed-in viewers.
  - Elsewhere, including this GitHub version, it falls back to an offline keyword search of the record, labelled "not AI".
  - Questions asking for a diagnosis, treatment or a dose get a fixed refusal before anything reaches the AI.

## Limits
This is a single browser-only page with made-up people and data. It isn't secure and isn't for clinical use. Fingerprint scans, codes and PINs are simulated. The hypertension rule (140/90 or above prompts a referral; 180/120 or above escalates the same day) is rule-based. It is not a diagnosis.
