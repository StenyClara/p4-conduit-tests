# Tests from Playwright's agents, and my review (week 4, project P4)

The coach fills this in from your answers. Check that every line is what you saw and decided.

App: Conduit practice app on my laptop · Date: 2026-11-20

## 1. How I set up the agents
- **Command:** `npx playwright init-agents --loop=claude` (TESTS terminal, in `P4`)
- **What it made:** `.claude/agents/playwright-test-planner.md`, `playwright-test-generator.md`, `playwright-test-healer.md`; `.mcp.json`; `specs/README.md`; `tests/seed.spec.ts`
- **Browser hidden:** `"--headless"` added to `P4/.mcp.json`: yes
- **Where I started Claude for the agents:** in `P4`, because Claude finds the agents and their browser only there

## 2. What I asked the agents
- **Area:** the profile page and following an author
- **My prompt** (`P4/prompts/agents.md`):
  - Task: First use the playwright-test-planner agent to plan tests for the profile page and following an author. Save the plan as specs/profile-follow.md. Then use the playwright-test-generator agent to write one test for each scenario in the plan, in the folder tests/profile-follow/.
  - Material: Start on the page /profile/practice-author. For steps that need a signed-in user, use a practice user from README.md.
  - Rules: Plan at most 2 short scenarios, with at most 5 steps each. Do not change any other test file. Do not run the test suite. Find every button and field with getByRole and a { name }, and check that the follow is still there after a reload, not only the message on the screen.
- **The plan the planner saved:** `specs/profile-follow.md` (2 scenarios)
- **The test files the generator wrote:** `tests/profile-follow/signed-out-visitor-sees-profile-no-follow-button.spec.ts`, `tests/profile-follow/signed-in-user-unfollows-and-follows-author-persists-after-reload.spec.ts`
- `tests/seed.spec.ts` is the agents' start file. It checks nothing about the app, so it is not reviewed here.

## 3. My review of every generated test
- **The teammate's question:** "The agents walked this test through in their browser, and it follows the author again at the end. So we can keep it in our suite as it is, right?"
- **My answer:** The agent ran this test once and it passed. That does not mean we can trust it. Let’s keep it only after we fix three things: the test should set up its own starting state, put the state back even when the test fails, and log in using LoginPage. It changes the shared practice-reader account. line 10 signs in as practice-reader, and line 23 unfollows another user on that account
- "Signed-in user unfollows and follows an author, and it stays after reload" · **changed**, because It unfollows and follows on practice-reader, a shared user, so it must sign up its own new user by API and use that user instead.
- "Signed-out visitor sees the profile but no follow button" · **kept**, because It only reads the profile page and changes nothing: no click, no typing, no save. Every check uses getByRole with a nameand there is no waitForTimeout and no login.

## 4. What I asked Claude to change, and the result
- **My change** (the Changes line of `P4/prompts/stronger.md`): In @P4/tests/profile-follow/signed-in-user-unfollows-and-follows-author-persists-after-reload.spec.ts: It unfollows and follows on practice-reader, a shared user, so it must sign up its own new user by API and use that user instead.
- **Result:** No fault: 21 passed, 0 failed (the follow test now signs up its own user)
