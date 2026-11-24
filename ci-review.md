# My CI workflow and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

Repository: the P4 folder · Workflow: `.github/workflows/playwright.yml` · Date: 2026-11-24

## 1. What my project needs
- **Node.js on my laptop (`node -v`):** 24.22.1
- **My whole suite on my laptop:** `npx playwright test` → 21 passed, 0 failed
- **What the GitHub computer needs (my words):**
  - Node.js v24.22.1 — the same version used on mty laptop
  - npm ci — because it installs the exact package versions specified in package-lock.json
  - Chromium only (from the example)

## 2. My prompt to Claude
```text
Task: Write a GitHub Actions workflow that runs this Playwright suite on every push and keeps the HTML report. My GitHub repository is the P4 folder, so save it as P4/.github/workflows/playwright.yml. After the file, write one line for each step: what it does.
Material: @P4/package.json @P4/playwright.config.ts @P4/README.md
Rules: Use actions/checkout@v6, actions/setup-node@v6 and actions/upload-artifact@v6. Do not run anything. Do not commit or push. Use Node.js v24.22.1, run npm ci to install the exact dependencies from package-lock.json, and install only Chromium using npx playwright install --with-deps chromium.
```

## 3. What Claude's workflow got wrong for my project
- **Claude's workflow:** my rule gave the Node.js version, so my workflow had `node-version: 24.22.1` (line 17). In another run, Claude wrote `node-version: 22`.
- **Claude said:** (in that other run) "ASSUMPTION: `node-version: 22` gets the newest Node 22, which is 22.13 or later. You could use 24 instead. Nothing in the material asks for a specific version."
- **My project needs:** Node.js v24.22.1 — the same version used on mty laptop
- **My answer to the developer:** No, don't merge it yet. Our laptop uses v24.22.1, and the project requires v >=22.13. we should use 24.22.1 in GitHub to match the version tested on our laptop and ensure consistent results.
- **My line to Claude:** In @P4/.github/workflows/playwright.yml, line 17 is the node-version line. Set it to `24.22.1` and add a comment above it explaining that my laptop ran the suite successfully with 21 passed on Node.js v24.22.1. This keeps GitHub Actions consistent with my laptop. Change nothing else. Do not run anything.

## 4. My reading of the workflow
- **When, where, the code and Node.js (lines 3–19):** 3–4: Runs the workflow whenever code is pushed to the repository; 6: Defines the jobs; 7: Names the job as test; 8: Runs the job on a Ubuntu computer; 9: Stops the workflow if it takes longer than 30 minutes; 10: Defines the steps to execute; 11–12: Names the step and checks outthe repository code; 14–15: Names the step and sets up Node.js; 16: version details; 17–18: Comments explaining why Node.js v24.22.1 is used; 19: Sets the Node.js version to 24.22.1.
- **Packages, browser, tests and the report (lines 20–36):** 21–22: Names the step and installs the exact project dependencies using npm ci; 24–25: Names the step and installs Chromium along with its required system dependencies; 27–28: Names the step and runs the Playwright test suite; 30: Names the step to save the HTML test report; 31: Uploads the report unless the workflow is cancelled; 32: Uses actions/upload-artifact@v6 to upload the report; 33: Provides configuration options; 34: Names the uploaded artifact playwright-report; 35: Specifies the folder containing the HTML report; 36: Keeps the report for 30 days before deleting it.

## 5. The first run on GitHub
- **Run:** Add the CI workflow · **Result:** … · **Tests:** …
- **The report (artifact):** …

## 6. A red run on purpose
- **The change:** `tests/example.spec.ts` line 6, `toBe(200)` → `toBe(201)`
- **My prediction:** …
- **What GitHub showed:** …

## 7. Fixed, and green again
- **The fix:** line 6 back to `toBe(200)` · **Run:** Fix the expected status · **Result:** …

## 8. Review notes for my other AI-written tests (written while CI ran)
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.
Monday's and Tuesday's tests that I did not review in depth on those days. Each one: kept, changed or removed, and why.

### Monday: `tests/api.spec.ts`
- "…": **kept / changed / removed**, because …

### Tuesday: `tests/contract.spec.ts`
- "…": **kept / changed / removed**, because …
