# API review: Claude's first API tests (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you decided and what you saw.

- **App:** Conduit, the practice app on your own laptop (`http://127.0.0.1:3000`)
- **API description:** `P4/API.md`
- **Test file:** `P4/tests/api.spec.ts`, written by Claude
- **Prompt file:** `P4/prompts/api.md`

## 1. My first look, by hand
The request my comment sent in the app, and the status that came back.
- Request method POST, Status code 201 Created

## 2. My predictions and the real answers
One line per request: what I predicted, and what the app really answered.
- **A** (a comment, with the token): I predicted 201 Endpoint found, token sent, article exists, body is valid. The app answered 201, with the comment "Clear and useful." by practice-reader.
- **B** (the same comment, with no token): I predicted 401 Same endpoint, but the token is needed and none was sent. The app answered 401, `{"errors":{"token":["is missing"]}}`.
- **C** (a comment on an article that does not exist): I predicted 404 The token is sent and the body is valid, but the article no-such-article doesn’t exist. The app answered 404, `{"errors":{"article":["not found"]}}`.

## 3. My prompt to Claude
```text
Task: Write at least 6 Playwright API tests for articles in the Conduit API: create, read, change and delete an article. At least 3 positive and at least 3 negative tests. Save them in P4/tests/api.spec.ts. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/tests/example.spec.ts Send requests with the request fixture, like this example.
Rules: Write the tests from API.md only. Do not read the app's code in P4/app. Do not run the tests. After every create, change or delete, send a GET for the same article and check the saved data matches. For an error, check the error message in the body as well as the status.
```

## 4. The run
- **Result:** 8 tests: 7 passed, 1 failed.
- **A red test, and who is wrong** (only if a test failed): "changes only the body, and the other fields stay as they were". Expected tagList `["testing", "api"]`, Received `[]`. API.md says: "Updating: every field is optional. A field you do not send stays as it was. `tagList: []` removes all tags." My answer: aPP IS WRONG HERE. the test sends only body. It doesn’t send tagList at all. API.md says that when updating, “a field you do not send stays as it was”. Only tagList: [] removes all tags. So the tags should still be ["testing", "api"] after the change. The app returned []
- **My note** (only if I kept a red test with `test.fail()`): App is wrong here. The test sends only body. API.md says "a field you do not send stays as it was". The app returned [].

## 5. The developer's question
The test I looked at, and my answer to: "So the app saved nothing, right?"
- **Test:** "create without a title gives 422 "title can't be blank"" (from another run; my own file reads the articles again after a refused request)
- **My answer:** No. This test only shows what the app said. It doesn’t show what the app did.

## 6. Tests I reviewed with the API checklist
The API checklist: status · body · shape · negative cases (a refused request changes nothing) · own test data.

### "creates an article and GET returns the saved data"
- **My decision:** Keep it: it checks the exact 201, the exact saved values, makes its own unique user, and reads the article back with a GET to prove it was saved. One small change: add a shape check that the answer has every key API.md lists for an article

## 7. My API rules
The rules I added to my `playwright-quality` skill, under `## API rules`:
1. After any create, change, delete or refused request, the test sends a GET and checks what the server really saved, or that nothing changed.
2. Every test makes its own user and data, and takes ids and slugs from the answer instead of hardcoding them.
3. Every test checks the exact status from API.md and the exact values in the body, including the error message for a refused request.
