# My end-to-end tests and review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you found and decided.

App: Conduit practice app · Test file: `P4/tests/e2e.spec.ts` · Date: 2026-11-20

## 1. My first look
- **After I published an article by hand, I would check:** I'll check if the article is publised, verify it's details and it displays the actual user-given content.
- **Where the page keeps my sign-in:** localStorage, key jwtToken

## 2. Practice
- **Worked example (the like test):** it signs in through the form as a practice user, so other tests can change its data.
- **Does its check at the end prove the journey?** No. Line 19 doesn’t prove the like worked.the heading is visible as soon as the article page opens, before line 16 clicks anything. So the check is true before the journey and true after it, and that means it can’t fail.

## 3. My prompt
```text
Task: Write 2 end-to-end tests in P4/tests/e2e.spec.ts. Test 1: a signed-in user publishes a new article in the editor. Test 2: a signed-in user posts a comment on an article. Make a new user with the API, give the page its token, do the journey in the page, and check the result with the API at the end. After the file, write one line per test: what it checks.
Material: @P4/API.md @P4/app/public/app.js app.js is the page's code: take the labels and button names from it. The page keeps the sign-in token in localStorage, key jwtToken.
Rules: Use app.js only for the labels and button names. Do not change the app. Do not run the tests. Finally, read the saved article or comment with the API: it exists, its title or body is exactly the text the page typed, and its author is the new user.
```

## 4. The run
- **Claude's 2 tests:** 2 passed, 0 failed ("a signed-in user publishes a new article in the editor", "a signed-in user posts a comment on an article")

## 5. The teammate's question
- **Claude said:** "Signs up a new user with the API, so every test has its own user and token." (and at the end of its answer: "The tests leave the new users, articles and comments in the app. There is no teardown.")
- **My answer:** No, the app isn’t clean after a run. Each test makes its own data, but nothing deletes it.

## 6. What I saw on the home page
- Chennai delivery check, Pune store test plan

## 7. My change
- **My line to Claude:** In @P4/tests/e2e.spec.ts, test 1 leaves a user and an article, and test 2 leaves a user, an article and a comment. Delete the comment and then the article in test.afterEach with the API calls in @P4/API.md, so the delete runs even when a check fails. Skip any part a test didn’t get to make. If API.md has no call to delete a user, add a comment in the file saying users stay behind. Do not run the tests.
- **The clean-up Claude added:** test.afterEach deletes the comments and the articles each test made, then checks the article is gone (404). Users stay behind.

## 8. Proof
- **Each test twice, on an app that keeps its data:** `npx playwright test tests/e2e.spec.ts --repeat-each=2` → 4 passed, 0 failed
- **The newest article on the home page after the run:** Your first end-to-end test
