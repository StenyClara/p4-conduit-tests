# My practice fault report (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Practice faults: `P4/faults/practice.json` (F1 to F6) · Date: 2026-11-20
**How to read it:** a "detect" fault is **caught** when at least one test that passed with no fault fails with it, and **missed** when every test still passes. A "robust" fault (the app is only slower) should **stay green**; if tests fail, it **went red**.

## 1. My guess this morning
- **The developer asked:** "Your suite is green. How many real problems would it catch?"
- **My answer:** A green suite only tells you that nothing failed, not that anything would fail if the app broke. I’d guess about half the tests would catch a real problem. Some are probably weak like example.spec.ts. To find out: break the app on purpose and see whether the suite notices.Repeat for 10 or so bugs, then count how many the suite caught out of how many we wrote

## 2. Before: my suite against the practice faults
- **Command:** `node materials/faults-run.mjs` (TESTS terminal, in `P4`, with no app running)
- **My test files:** api.spec.ts, contract.spec.ts, e2e.spec.ts, example.spec.ts, profile-follow/ (2 agent tests), seed.spec.ts
- **No fault:** 19 passed, 0 failed
- **F1:** caught (10 tests failed)
- **F2:** caught (8 tests failed)
- **F3:** caught (8 tests failed)
- **F4:** caught (1 test failed: "a signed-in user posts a comment on an article")
- **F5:** stayed green
- **F6:** caught (1 test failed: the same test)

## 3. The weak spot I chose, and why
Weakest spot is the comments. F4 and F6 are each caught by only one test, “a signed-in user posts a comment on an article”. If that one test breaks or is removed, nothing catches either fault.

## 4. How I made the suite stronger
- **My request for Claude** (the New tests line of `P4/prompts/stronger.md`): Only one test checks posting a comment on an article. Write P4/tests/comments.spec.ts with 2 API tests: a new user posts a comment on an article, and the answer has the same body text and the author is that user; then a GET of the comments list for that article shows this comment in the list.Each test must sign up its own new user by API and must not use practice-reader or any shared user. Check the status code and the body, not only the status.
- **New or changed test file:** new `tests/comments.spec.ts` (2 tests); changed the follow test in `tests/profile-follow/`

## 5. After: the run again
- **Command:** `node materials/faults-run.mjs F4 F6`
- **No fault:** 21 passed, 0 failed
- **The fault I chose:** F4: 2 tests failed (was 1) · F6: 3 tests failed (was 1)

## 6. What changed
Not half, and not perfect. It caught every fault I tried, and the comment area is now covered by more than one test. The follow area is still untested by faults, so I will check that next.
