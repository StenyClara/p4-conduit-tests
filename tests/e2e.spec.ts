import { test, expect, APIRequestContext, Page } from '@playwright/test';

// Signs up a new user with the API, so every test has its own user and token.
// API.md: POST /api/users answers 201 with a User. Passwords need 8 characters or more.
async function signUp(request: APIRequestContext, prefix: string) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const response = await request.post('/api/users', {
    data: {
      user: {
        username: `${prefix}${id}`,
        email: `${prefix}${id}@example.com`,
        password: 'Password123',
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username: json.user.username as string, token: json.user.token as string };
}

// app.js keeps the sign-in token in localStorage under "jwtToken".
// The script runs before the page's own code, so the page starts signed in.
async function signInPage(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('jwtToken', t);
  }, token);
}

type User = { username: string; token: string };

test.describe('Conduit end to end: page and API together', () => {
  // What the current test made. Each test fills this in as soon as it makes a user.
  let made: { author?: User; commenter?: User } = {};

  test.beforeEach(() => {
    made = {};
  });

  // Runs after every test, also when a check failed.
  // It deletes the comment, then the article. It skips what the test did not get to make.
  // Users stay behind: API.md has no call to delete a user.
  test.afterEach(async ({ request }) => {
    const { author, commenter } = made;
    if (!author) return; // the test made nothing

    // Find the author's articles with the API, so an article published in the page is found
    // even when the test failed before it read the slug.
    const listResponse = await request.get(`/api/articles?author=${encodeURIComponent(author.username)}`);
    expect(listResponse.status()).toBe(200);
    const articles = (await listResponse.json()).articles as { slug: string }[];

    for (const { slug } of articles) {
      const path = `/api/articles/${encodeURIComponent(slug)}`;

      // 1. Delete the comment. API.md: DELETE /api/articles/:slug/comments/:id, comment author only, 204.
      if (commenter) {
        const commentsResponse = await request.get(`${path}/comments`);
        expect(commentsResponse.status()).toBe(200);
        const comments = (await commentsResponse.json()).comments as { id: number; author: { username: string } }[];
        for (const comment of comments.filter((c) => c.author.username === commenter.username)) {
          const deleteComment = await request.delete(`${path}/comments/${comment.id}`, {
            headers: { Authorization: `Token ${commenter.token}` },
          });
          expect(deleteComment.status()).toBe(204);
        }
        const afterResponse = await request.get(`${path}/comments`);
        expect(afterResponse.status()).toBe(200);
        const left = (await afterResponse.json()).comments as { author: { username: string } }[];
        expect(left.filter((c) => c.author.username === commenter.username)).toEqual([]);
      }

      // 2. Delete the article. API.md: DELETE /api/articles/:slug, author only, 204.
      const deleteArticle = await request.delete(path, {
        headers: { Authorization: `Token ${author.token}` },
      });
      expect(deleteArticle.status()).toBe(204);
      const getResponse = await request.get(path);
      expect(getResponse.status()).toBe(404);
      expect(await getResponse.json()).toEqual({ errors: { article: ['not found'] } });
    }
  });

  test('a signed-in user publishes a new article in the editor', async ({ page, request }) => {
    const author = await signUp(request, 'writer');
    made.author = author;
    const article = {
      title: 'Pune store test plan',
      description: 'Plan for the Pune store',
      body: 'Price ₹499, call +91 98765 43210, PIN 411001.',
      tags: 'testing, e2e',
    };

    await signInPage(page, author.token);
    await page.goto('/editor');

    // The editor loads after the page reads the current user, so wait for its first field.
    const titleBox = page.getByRole('textbox', { name: 'Title' });
    await expect(titleBox).toBeVisible();
    await titleBox.fill(article.title);
    await page.getByRole('textbox', { name: "What's this article about?" }).fill(article.description);
    await page.getByRole('textbox', { name: 'Write your article' }).fill(article.body);
    await page.getByRole('textbox', { name: 'Tags' }).fill(article.tags);
    await page.getByRole('button', { name: 'Publish Article' }).click();

    // After publishing, the page opens /article/<slug> and shows the title.
    await expect(page).toHaveURL(/\/article\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1, name: article.title })).toBeVisible();

    // Take the slug from the page address, not a hardcoded value.
    const slug = decodeURIComponent(new URL(page.url()).pathname.split('/')[2]);

    // Read the saved article with the API. API.md: GET /api/articles/:slug answers 200.
    const getResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}`);
    expect(getResponse.status()).toBe(200);
    const saved = (await getResponse.json()).article;
    expect(saved.slug).toBe(slug);
    expect(saved.title).toBe(article.title);
    expect(saved.description).toBe(article.description);
    expect(saved.body).toBe(article.body);
    expect(saved.tagList).toEqual(['testing', 'e2e']);
    expect(saved.author.username).toBe(author.username);
  });

  test('a signed-in user posts a comment on an article', async ({ page, request }) => {
    // One user writes the article with the API. A second, new user comments in the page.
    const author = await signUp(request, 'writer');
    made.author = author;
    const commenter = await signUp(request, 'reader');
    made.commenter = commenter;
    const createResponse = await request.post('/api/articles', {
      headers: { Authorization: `Token ${author.token}` },
      data: {
        article: {
          title: 'Chennai delivery check',
          description: 'Delivery plan for Chennai',
          body: 'Delivery fee ₹49 for PIN 600001.',
          tagList: ['testing'],
        },
      },
    });
    expect(createResponse.status()).toBe(201);
    const slug = (await createResponse.json()).article.slug as string;
    const commentBody = 'Delivered to PIN 600001. Call +91 98765 43210.';

    await signInPage(page, commenter.token);
    await page.goto(`/article/${encodeURIComponent(slug)}`);

    // The comment box shows only after the article loads and the user is signed in.
    const commentBox = page.getByRole('textbox', { name: 'Write a comment' });
    await expect(commentBox).toBeVisible();
    await commentBox.fill(commentBody);
    await page.getByRole('button', { name: 'Post Comment' }).click();

    // The page reloads the article and lists the new comment.
    await expect(page.getByText(commentBody, { exact: true })).toBeVisible();

    // Read the saved comment with the API. API.md: GET /api/articles/:slug/comments answers 200.
    const getResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(getResponse.status()).toBe(200);
    const comments = (await getResponse.json()).comments;
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe(commentBody);
    expect(comments[0].author.username).toBe(commenter.username);
  });
});
