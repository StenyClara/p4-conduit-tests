import { test, expect, APIRequestContext } from '@playwright/test';

// Key lists, copied from API.md.
// API.md "Users and sign-in": User: {"user":{"email","token","username","bio","image"}}
const USER_KEYS = ['email', 'token', 'username', 'bio', 'image'];
// API.md "Articles": Article: {"article":{"slug","title","description","body","tagList","createdAt","updatedAt","favorited","favoritesCount","author"}}
const ARTICLE_KEYS = [
  'slug',
  'title',
  'description',
  'body',
  'tagList',
  'createdAt',
  'updatedAt',
  'favorited',
  'favoritesCount',
  'author',
];
// API.md "Profiles": Profile: {"profile":{"username","bio","image","following"}}. An article's author is a Profile without the wrapper.
const PROFILE_KEYS = ['username', 'bio', 'image', 'following'];

function sorted(keys: string[]) {
  return [...keys].sort();
}

// Signs up a new user, so every test has its own user and token.
// API.md: POST /api/users answers 201 with a User. Passwords need 8 characters or more.
async function signUp(request: APIRequestContext) {
  const id = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const username = `contract${id}`;
  const email = `contract${id}@example.com`;
  const response = await request.post('/api/users', {
    data: { user: { username, email, password: 'Password123' } },
  });
  expect(response.status()).toBe(201);
  const user = (await response.json()).user;
  return { username, email, token: user.token as string, user };
}

function auth(token: string) {
  return { Authorization: `Token ${token}` };
}

const newArticle = {
  title: 'Chennai contract plan',
  description: 'Contract checks for the Chennai store',
  body: 'Price ₹1,299, call +91 91234 56789, PIN 600001.',
  tagList: ['testing', 'api'],
};

// Creates an article. API.md: POST /api/articles answers 201 with an Article.
async function createArticle(request: APIRequestContext, token: string) {
  const response = await request.post('/api/articles', {
    headers: auth(token),
    data: { article: newArticle },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).article;
}

test.describe('Conduit API: schema checks', () => {
  test('GET /api/articles/:slug answers with the Article shape from API.md', async ({ request }) => {
    const author = await signUp(request);
    const created = await createArticle(request, author.token);

    const response = await request.get(`/api/articles/${created.slug}`);

    expect(response.status()).toBe(200);
    const json = await response.json();

    // Exact key lists from API.md: wrapper, article, author.
    expect(Object.keys(json)).toEqual(['article']);
    expect(sorted(Object.keys(json.article))).toEqual(sorted(ARTICLE_KEYS));
    expect(sorted(Object.keys(json.article.author))).toEqual(sorted(PROFILE_KEYS));

    // Shape and values.
    expect(json).toMatchObject({
      article: {
        slug: created.slug,
        title: newArticle.title,
        description: newArticle.description,
        body: newArticle.body,
        tagList: newArticle.tagList,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: false,
        favoritesCount: 0,
        author: {
          username: author.username,
          // API.md: a new user has bio and image set to null.
          bio: null,
          image: null,
          following: expect.any(Boolean),
        },
      },
    });

    // API.md: dates are ISO 8601 text, for example 2026-01-05T12:00:00.000Z.
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(json.article.createdAt).toMatch(iso);
    expect(json.article.updatedAt).toMatch(iso);
  });

  test('GET /api/user answers with the User shape from API.md', async ({ request }) => {
    const me = await signUp(request);

    const response = await request.get('/api/user', { headers: auth(me.token) });

    expect(response.status()).toBe(200);
    const json = await response.json();

    // Exact key lists from API.md: wrapper and user.
    expect(Object.keys(json)).toEqual(['user']);
    expect(sorted(Object.keys(json.user))).toEqual(sorted(USER_KEYS));

    expect(json).toMatchObject({
      user: {
        email: me.email,
        token: expect.any(String),
        username: me.username,
        // API.md: a new user has bio and image set to null.
        bio: null,
        image: null,
      },
    });
  });
});

test.describe('Conduit API: auth checks', () => {
  test('PUT /api/user without a token is refused, and the user stays the same', async ({ request }) => {
    const me = await signUp(request);

    const response = await request.put('/api/user', {
      data: { user: { bio: 'QA tester from Pune, PIN 411001' } },
    });

    // API.md Errors: 401 for no token.
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is missing'] } });

    // Nothing changed: GET /api/user with the right token.
    const getResponse = await request.get('/api/user', { headers: auth(me.token) });
    expect(getResponse.status()).toBe(200);
    const saved = (await getResponse.json()).user;
    expect(saved.email).toBe(me.email);
    expect(saved.username).toBe(me.username);
    expect(saved.bio).toBeNull();
    expect(saved.image).toBeNull();
  });

  test('PUT /api/user with a wrong token is refused, and the user stays the same', async ({ request }) => {
    const me = await signUp(request);

    const response = await request.put('/api/user', {
      headers: auth('this-is-not-a-real-token'),
      data: { user: { bio: 'QA tester from Pune, PIN 411001' } },
    });

    // API.md Errors: 401 for a wrong token; this app says "is invalid".
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ errors: { token: ['is invalid'] } });

    // Nothing changed: GET /api/user with the right token.
    const getResponse = await request.get('/api/user', { headers: auth(me.token) });
    expect(getResponse.status()).toBe(200);
    const saved = (await getResponse.json()).user;
    expect(saved.email).toBe(me.email);
    expect(saved.username).toBe(me.username);
    expect(saved.bio).toBeNull();
    expect(saved.image).toBeNull();
  });

  test("PUT /api/articles/:slug by another user is refused, and the article stays the same", async ({ request }) => {
    const author = await signUp(request);
    const otherUser = await signUp(request);
    const created = await createArticle(request, author.token);

    const response = await request.put(`/api/articles/${created.slug}`, {
      headers: auth(otherUser.token),
      data: { article: { title: 'Changed by someone else', body: 'New price ₹1' } },
    });

    // API.md Errors: 403 for someone else's article.
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ errors: { article: ['forbidden'] } });

    // Nothing changed: the same slug still answers with the first data.
    const getResponse = await request.get(`/api/articles/${created.slug}`);
    expect(getResponse.status()).toBe(200);
    const saved = (await getResponse.json()).article;
    expect(saved.slug).toBe(created.slug);
    expect(saved.title).toBe(newArticle.title);
    expect(saved.description).toBe(newArticle.description);
    expect(saved.body).toBe(newArticle.body);
    expect(saved.tagList).toEqual(newArticle.tagList);
    expect(saved.updatedAt).toBe(created.updatedAt);
    expect(saved.author.username).toBe(author.username);
  });
});
