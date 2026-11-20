// spec: specs/profile-follow.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Profile page and following an author', () => {
  test('Signed-out visitor sees the profile but no follow button', async ({ page }) => {
    // 1. Open /profile/practice-author without signing in.
    await page.goto('http://127.0.0.1:3000/profile/practice-author');

    await expect(page.getByRole('heading', { level: 1, name: 'practice-author' })).toBeVisible();
    await expect(page.getByText('I write about testing and quality.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Articles' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Favorited Articles' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your first end-to-end test' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(7);

    // 2. Look for the follow button and the unfollow button.
    await expect(page.getByRole('button', { name: 'Follow practice-author' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Unfollow practice-author' })).toHaveCount(0);

    const mainNav = page.getByRole('navigation', { name: 'Main' });
    await expect(mainNav.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(mainNav.getByRole('link', { name: 'Sign up' })).toBeVisible();
  });
});
