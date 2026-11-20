// spec: specs/profile-follow.md
// seed: tests/seed.spec.ts

import { test, expect, APIRequestContext } from '@playwright/test';

// Signs up a new user with the API, so this test does not share a user with other tests.
// API.md: POST /api/users answers 201 with a User. Passwords need 8 characters or more.
async function signUp(request: APIRequestContext, prefix: string) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const user = { username: `${prefix}${id}`, email: `${prefix}${id}@example.com`, password: 'Password123' };
  const response = await request.post('/api/users', { data: { user } });
  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.user.username).toBe(user.username);
  expect(json.user.email).toBe(user.email);
  return { ...user, token: json.user.token as string };
}

test.describe('Profile page and following an author', () => {
  // The user this test made. Empty until the test signs one up.
  let reader: { username: string; email: string; password: string; token: string } | undefined;

  test.beforeEach(() => {
    reader = undefined;
  });

  // Runs after the test, also when a check failed: the new user stops following practice-author.
  // Users stay behind: API.md has no call to delete a user.
  test.afterEach(async ({ request }) => {
    if (!reader) return;
    const headers = { Authorization: `Token ${reader.token}` };
    // API.md: DELETE /api/profiles/:username/follow answers 200 with a Profile.
    const unfollow = await request.delete('/api/profiles/practice-author/follow', { headers });
    expect(unfollow.status()).toBe(200);
    const check = await request.get('/api/profiles/practice-author', { headers });
    expect(check.status()).toBe(200);
    expect((await check.json()).profile.following).toBe(false);
  });

  test('Signed-in user unfollows and follows an author, and it stays after reload', async ({ page, request }) => {
    // 0. Sign up a new user by API, and make it follow practice-author by API.
    reader = await signUp(request, 'reader');
    const headers = { Authorization: `Token ${reader.token}` };
    // API.md: POST /api/profiles/:username/follow answers 200 with a Profile.
    const follow = await request.post('/api/profiles/practice-author/follow', { headers });
    expect(follow.status()).toBe(200);
    const followCheck = await request.get('/api/profiles/practice-author', { headers });
    expect(followCheck.status()).toBe(200);
    const profile = (await followCheck.json()).profile;
    expect(profile.username).toBe('practice-author');
    expect(profile.following).toBe(true);

    // 1. Open /login, fill Email and Password, click Sign in
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(reader.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(reader.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveTitle('Home | Conduit');

    // 2. Open /profile/practice-author
    await page.goto('http://127.0.0.1:3000/profile/practice-author');
    await expect(page.getByRole('heading', { level: 1, name: 'practice-author' })).toBeVisible();
    const unfollowButton = page.getByRole('button', { name: 'Unfollow practice-author' });
    const followButton = page.getByRole('button', { name: 'Follow practice-author' });
    await expect(unfollowButton).toBeVisible();

    // 3. Click Unfollow practice-author
    await unfollowButton.click();
    await expect(followButton).toBeVisible();

    // 4. Reload the page
    await page.reload();
    await expect(followButton).toBeVisible();

    // 5. Click Follow practice-author, then reload the page
    await followButton.click();
    await expect(unfollowButton).toBeVisible();
    await page.reload();
    await expect(unfollowButton).toBeVisible();
  });
});
