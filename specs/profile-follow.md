# Profile page and follow author

## Application Overview

Conduit practice app at http://127.0.0.1:3000. Page under test: /profile/practice-author. Signed in as practice-reader (practice-reader@example.com, password Practice123, from README.md). Fresh data assumed: on a fresh start practice-reader already follows practice-author (seen on the page: the button is "Unfollow practice-author"). The app shows no message text; the on-screen signal is the button name changing.

## Test Scenarios

### 1. Profile and follow

**Seed:** `tests/seed.spec.ts`

#### 1.1. Signed-out visitor sees the profile but no follow button

**File:** `tests/profile-follow/signed-out-profile.spec.ts`

**Steps:**
  1. Open /profile/practice-author without signing in.
    - expect: Heading (level 1) named "practice-author" is visible.
    - expect: Text "I write about testing and quality." is visible.
    - expect: Link "My Articles" and link "Favorited Articles" are visible.
    - expect: Article heading "Your first end-to-end test" is visible (7 articles are listed).
  2. Look for the follow button: getByRole('button', { name: 'Follow practice-author' }) and getByRole('button', { name: 'Unfollow practice-author' }).
    - expect: Neither button exists. Link "Sign in" and link "Sign up" are in the Main navigation.

#### 1.2. Signed-in user unfollows and follows an author, and it stays after reload

**File:** `tests/profile-follow/follow-persists.spec.ts`

**Steps:**
  1. Open /login. Fill getByRole('textbox', { name: 'Email' }) with practice-reader@example.com and getByRole('textbox', { name: 'Password' }) with Practice123. Click getByRole('button', { name: 'Sign in' }).
    - expect: The page goes to / (Home | Conduit).
  2. Open /profile/practice-author.
    - expect: getByRole('button', { name: 'Unfollow practice-author' }) is visible (practice-reader follows this author in fresh data).
    - expect: Heading "practice-author" is visible.
  3. Click getByRole('button', { name: 'Unfollow practice-author' }).
    - expect: The button changes to getByRole('button', { name: 'Follow practice-author' }).
  4. Reload the page.
    - expect: After reload, getByRole('button', { name: 'Follow practice-author' }) is still shown. The unfollow is saved, not only shown on screen.
  5. Click getByRole('button', { name: 'Follow practice-author' }), then reload the page.
    - expect: After the click the button is "Unfollow practice-author".
    - expect: After reload it is still "Unfollow practice-author". The follow is saved.
