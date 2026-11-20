import { test, expect, APIRequestContext } from '@playwright/test';

type User = { username: string; token: string };

// Signs up a new user with the API, so every test has its own user and token.
// API.md: POST /api/users answers 201 with a User. Passwords need 8 characters or more.
async function signUp(request: APIRequestContext, prefix: string): Promise<User> {
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

// The author makes an article with the API. The slug comes from the answer, not hardcoded.
// API.md: POST /api/articles answers 201 with an Article.
async function createArticle(request: APIRequestContext, author: User): Promise<string> {
  const response = await request.post('/api/articles', {
    headers: { Authorization: `Token ${author.token}` },
    data: {
      article: {
        title: 'Bengaluru delivery comments',
        description: 'Comments on Bengaluru delivery',
        body: 'Delivery fee ₹49 for PIN 560001.',
        tagList: ['testing'],
      },
    },
  });
  expect(response.status()).toBe(201);
  const article = (await response.json()).article;
  expect(article.author.username).toBe(author.username);
  return article.slug as string;
}

// The commenter posts a comment with the API.
// API.md: POST /api/articles/:slug/comments answers 201 with {"comment":{...}}.
async function postComment(request: APIRequestContext, slug: string, commenter: User, body: string) {
  return request.post(`/api/articles/${encodeURIComponent(slug)}/comments`, {
    headers: { Authorization: `Token ${commenter.token}` },
    data: { comment: { body } },
  });
}

test.describe('Comments API', () => {
  // What the current test made. Each test fills this in as soon as it makes a user.
  let made: { author?: User; commenter?: User } = {};

  test.beforeEach(() => {
    made = {};
  });

  // Runs after every test, also when a check failed.
  // It deletes the comments, then the article. It skips what the test did not get to make.
  // Users stay behind: API.md has no call to delete a user.
  test.afterEach(async ({ request }) => {
    const { author, commenter } = made;
    if (!author) return;

    const listResponse = await request.get(`/api/articles?author=${encodeURIComponent(author.username)}`);
    expect(listResponse.status()).toBe(200);
    const articles = (await listResponse.json()).articles as { slug: string }[];

    for (const { slug } of articles) {
      const path = `/api/articles/${encodeURIComponent(slug)}`;

      // 1. Delete the comments. API.md: DELETE /api/articles/:slug/comments/:id, comment author only, 204.
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

  test('a new user posts a comment, and the answer has the same body and that user as author', async ({ request }) => {
    const author = await signUp(request, 'writer');
    made.author = author;
    const commenter = await signUp(request, 'reader');
    made.commenter = commenter;
    const slug = await createArticle(request, author);
    const commentBody = 'Delivered to PIN 560001. Call +91 98765 43210.';

    const response = await postComment(request, slug, commenter, commentBody);
    expect(response.status()).toBe(201);
    const comment = (await response.json()).comment;
    expect(comment.body).toBe(commentBody);
    expect(comment.author.username).toBe(commenter.username);
    // API.md: a new user has bio and image set to null.
    expect(comment.author.bio).toBeNull();
    expect(comment.author.image).toBeNull();
  });

  test('a new user posts a comment, and the comments list for that article shows it', async ({ request }) => {
    const author = await signUp(request, 'writer');
    made.author = author;
    const commenter = await signUp(request, 'reader');
    made.commenter = commenter;
    const slug = await createArticle(request, author);
    const commentBody = 'Paid ₹499 at PIN 560001. Call +91 91234 56789.';

    const postResponse = await postComment(request, slug, commenter, commentBody);
    expect(postResponse.status()).toBe(201);
    const posted = (await postResponse.json()).comment;

    // API.md: GET /api/articles/:slug/comments answers 200 with {"comments":[...]}.
    const getResponse = await request.get(`/api/articles/${encodeURIComponent(slug)}/comments`);
    expect(getResponse.status()).toBe(200);
    const comments = (await getResponse.json()).comments;
    // The article is new, so this comment is the only one.
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe(posted.id);
    expect(comments[0].body).toBe(commentBody);
    expect(comments[0].author.username).toBe(commenter.username);
    expect(comments[0].createdAt).toBe(posted.createdAt);
  });
});
