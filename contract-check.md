# My schema, auth and contract checks (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-20

## 1. My first look
How I would check that an article answer has the right shape: shape tests which checks that the answer still has the keys and types

## 2. Practice: the key list check
File: `P4/materials/contract-example.spec.ts` (the sign-up answer).
Three changes: `bio` is missing · a new field `password` is added · `token` becomes a number.
- **The toMatchObject check (worked example):** missing: passes · new field: passes · number: fails
- **The key list check (my answer):** missing: fails, because bio is gone from the keys, so the list no longer matches. new field: fails, because password is an extra key in the list. number: passes, because the key list only checks names, and token is still there as a key, even though it’s now a number.

## 3. My prompt for Claude
```text
Task: Write Playwright API tests in P4/tests/contract.spec.ts. Schema checks: the answers of GET /api/articles/:slug and GET /api/user have the shape that API.md gives, checked with toMatchObject and expect.any. Auth tests: no token, a wrong token, and changing someone else's article. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. Every schema check also compares the exact key list from API.md, and every refused auth request checks the error body and is followed by a GET that proves nothing changed.
```

## 4. Claude's tests and my run
- **Run:** `npx playwright test tests/contract.spec.ts` · **Result:** 5 passed, 0 failed
- **A red test, and who was wrong:** No test failed.

## 5. The teammate's question
- **Claude's test:** "GET /api/articles/:slug answers with the Article shape" (from another run; my own file already checks the exact keys, lines 72–74)
- **Claude said:** "an anonymous reader gets 200 and the full Article shape."
- **My answer:** No, it stays green. toMatchObject only checks the fields you list, so an extra field like password is ignored and the test still passes.

## 6. My change
- **What I asked Claude:** My own file already had exact key lists (lines 73 and 114), so it needed no change. My line for the test from the other run: "In @P4/tests/contract.spec.ts, the test “GET /api/articles/:slug answers with the Article shape” lets in extra fields. Add checks that the article and its author have exactly the keys in API.md. Do not run the tests."
- **The run after it:** 5 passed, 0 failed

## 7. Proof: the contract test fails when the answer changes
- **My prediction before the run:** The article shape test will fail. The user shape test will pass.
- **Run with the practice fault F2 on:** `$env:CONDUIT_FAULT = "F2"`, then `npx playwright test tests/contract.spec.ts` · **Result:** 3 passed, 2 failed ("GET /api/articles/:slug answers with the Article shape from API.md" and "PUT /api/articles/:slug by another user is refused, and the article stays the same")
- **What Playwright showed:** the article key list: `-   "body",` (Expected - 1, Received + 0); the auth test, line 194: Expected the body text, Received undefined
- **My answer about a red test:** Line 194 reads saved.body from the follow-up GET, and with F2 on the app sent no body field, so the test got undefined instead of the original text.
- **Run with the fault off again:** `$env:CONDUIT_FAULT = ""`, then the same run · **Result:** 5 passed, 0 failed
