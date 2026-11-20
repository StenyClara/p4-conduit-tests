import { test, expect, APIRequestContext } from '@playwright/test';

// Signs up a new user, so every test has its own author and its own token.
// API.md: POST /api/users answers 201 with a User. Passwords need 8 characters or more.
async function signUp(request: APIRequestContext) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const response = await request.post('/api/users', {
    data: {
      user: {
        username: `author${id}`,
        email: `author${id}@example.com`,
        password: 'Password123',
      },
    },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return { username: json.user.username as string, token: json.user.token as string };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

const newArticle = {
  title: 'Mumbai test plan',
  description: 'Plan for the Mumbai store',
  body: 'Price ₹499, call +91 98765 43210, PIN 400001.',
  tagList: ['testing', 'api'],
};

// Creates an article and returns its slug. API.md: POST /api/articles answers 201.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: newArticle },
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  return json.article.slug as string;
}

// Checks that GET /api/articles/:slug answers 200 with the article as first created.
async function expectArticleUnchanged(request: APIRequestContext, slug: string, username: string) {
  const getResponse = await request.get(`/api/articles/${slug}`);
  expect(getResponse.status()).toBe(200);
  const saved = (await getResponse.json()).article;
  expect(saved.slug).toBe(slug);
  expect(saved.title).toBe(newArticle.title);
  expect(saved.description).toBe(newArticle.description);
  expect(saved.body).toBe(newArticle.body);
  expect(saved.tagList).toEqual(newArticle.tagList);
  expect(saved.author.username).toBe(username);
}

test.describe('Conduit API: articles', () => {
  // ---------- Positive tests ----------

  test('creates an article and GET returns the saved data', async ({ request }) => {
    const author = await signUp(request);

    const response = await request.post('/api/articles', {
      headers: auth(author.token),
      data: { article: newArticle },
    });

    expect(response.status()).toBe(201);
    const created = (await response.json()).article;
    expect(created.title).toBe(newArticle.title);
    expect(created.description).toBe(newArticle.description);
    expect(created.body).toBe(newArticle.body);
    expect(created.tagList).toEqual(newArticle.tagList);
    expect(created.author.username).toBe(author.username);

    await expectArticleUnchanged(request, created.slug, author.username);
  });

  test('reads an article without a token', async ({ request }) => {
    const author = await signUp(request);
    const slug = await createArticle(request, author.token);

    // API.md: the token is optional for GET /api/articles/:slug.
    const response = await request.get(`/api/articles/${slug}`);

    expect(response.status()).toBe(200);
    const article = (await response.json()).article;
    expect(article.slug).toBe(slug);
    expect(article.title).toBe(newArticle.title);
    expect(article.body).toBe(newArticle.body);
    expect(article.author.username).toBe(author.username);
    expect(article.favorited).toBe(false);
    expect(article.favoritesCount).toBe(0);
  });

  test('changes only the body, and the other fields stay as they were', async ({ request }) => {
    // App is wrong here. The test sends only body. API.md says "a field you do not send stays as it was". The app returned [].
    test.fail();
    const author = await signUp(request);
    const slug = await createArticle(request, author.token);
    const newBody = 'New price ₹999, PIN 560001.';

    const response = await request.put(`/api/articles/${slug}`, {
      headers: auth(author.token),
      data: { article: { body: newBody } },
    });

    expect(response.status()).toBe(200);
    const updated = (await response.json()).article;
    expect(updated.body).toBe(newBody);

    // API.md: a field you do not send stays as it was.
    const getResponse = await request.get(`/api/articles/${updated.slug}`);
    expect(getResponse.status()).toBe(200);
    const saved = (await getResponse.json()).article;
    expect(saved.body).toBe(newBody);
    expect(saved.title).toBe(newArticle.title);
    expect(saved.description).toBe(newArticle.description);
    expect(saved.tagList).toEqual(newArticle.tagList);
    expect(saved.author.username).toBe(author.username);
  });

  test('deletes an article, and GET then answers 404', async ({ request }) => {
    const author = await signUp(request);
    const slug = await createArticle(request, author.token);

    const response = await request.delete(`/api/articles/${slug}`, {
      headers: auth(author.token),
    });

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');

    const getResponse = await request.get(`/api/articles/${slug}`);
    expect(getResponse.status()).toBe(404);
    expect(await getResponse.json()).toEqual({ errors: { article: ['not found'] } });
  });

  // ---------- Negative tests ----------

  test('does not create an article without a title', async ({ request }) => {
    const author = await signUp(request);

    const response = await request.post('/api/articles', {
      headers: auth(author.token),
      data: {
        article: {
          description: newArticle.description,
          body: newArticle.body,
          tagList: newArticle.tagList,
        },
      },
    });

    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ errors: { title: ["can't be blank"] } });

    // No slug comes back, so check the author's article list: nothing was saved.
    const getResponse = await request.get(`/api/articles?author=${author.username}`);
    expect(getResponse.status()).toBe(200);
    const list = await getResponse.json();
    expect(list.articles).toEqual([]);
    expect(list.articlesCount).toBe(0);
  });

  test('does not change an article without a token', async ({ request }) => {
    const author = await signUp(request);
    const slug = await createArticle(request, author.token);

    const response = await request.put(`/api/articles/${slug}`, {
      data: { article: { body: 'Changed without a token' } },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });

    await expectArticleUnchanged(request, slug, author.username);
  });

  test("does not let another user change the author's article", async ({ request }) => {
    const author = await signUp(request);
    const otherUser = await signUp(request);
    const slug = await createArticle(request, author.token);

    const response = await request.put(`/api/articles/${slug}`, {
      headers: auth(otherUser.token),
      data: { article: { body: 'Changed by someone else' } },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    await expectArticleUnchanged(request, slug, author.username);
  });

  test("does not let another user delete the author's article", async ({ request }) => {
    const author = await signUp(request);
    const otherUser = await signUp(request);
    const slug = await createArticle(request, author.token);

    const response = await request.delete(`/api/articles/${slug}`, {
      headers: auth(otherUser.token),
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    await expectArticleUnchanged(request, slug, author.username);
  });
});
