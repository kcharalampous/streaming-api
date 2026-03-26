# Streaming API

## Setup

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Install Docker — https://docs.docker.com/get-docker

# 3. Install dependencies
bun install

# 4. Copy env and fill in values
cp .env.example .env

# 5. Start Postgres
docker compose up -d

# 6. Run migrations
bun run db:migrate

# 7. Generate tsoa routes and prisma client
bun run build

# 8. Start the dev server
bun run dev
```

The API will be available at `http://localhost:3000`.

### Schema

Two tables:

**`users`** — `id`, `email` (unique), `password_hash`, `created_at`, `updated_at`

**`streaming_content`** — `id`, `title`, `description`, `thumbnail_url`, `video_url`, `genre`, `created_at`, `updated_at`

---

## Auth flow

All `/api/streaming` routes require a JWT in the `Authorization` header.

**Register**
```http
POST /auth/register
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

**Login**
```http
POST /auth/login
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

Both return `{ token, user }`. Use the token on subsequent requests:

```http
Authorization: Bearer <token>
```

---

## Running tests

The unit tests run standalone. The integration tests require Postgres to be running (`docker compose up -d`) since they hit the real database.

```bash
bun test
```

---

## API Explorer (minimal UI)

In dev mode (`NODE_ENV !== production`) a Scalar API reference UI is served at:

```
http://localhost:3000/docs
```

It provides an interactive interface to browse all endpoints, inspect request/response schemas, and make authenticated requests directly from the browser — no separate client needed. The raw OpenAPI spec is also available at `http://localhost:3000/openapi.json`.

To authenticate streaming requests in the UI:

1. Use the **Register** or **Login** endpoint to get a token
2. Scroll to the top of the page and notice the section in the right hand size (Server, Authentication, Client Libraries)
3. Select **jwt** as the authentication type and paste the token
4. All subsequent requests will include the `Authorization: Bearer` header automatically

---

## Key Decisions

### ORM — Prisma over Sequelize

The stub used Sequelize-style syntax. I switched to Prisma for a few reasons:

- The schema definition is cleaner and lives in one place (`schema.prisma`), making it easier to reason about the data model at a glance.
- Prisma's generated client is fully typed out of the box, which pairs well with TypeScript without needing extra type packages or manual interface definitions.
- Migration tooling (`prisma migrate dev`) is straightforward and produces readable SQL files that are easy to review.

Sequelize is a solid choice but requires more boilerplate to get the same level of type safety, and the decorator-based model definitions can get verbose quickly.

### Structure — tsoa for routing and OpenAPI generation

Rather than keeping the structure minimal, I opted for a more production-oriented setup using tsoa. The main reason is that it eliminates the need to maintain a separate OpenAPI spec file — the spec is derived directly from the controller types and decorators at build time, so the docs and the implementation can't drift.

It also enforces a consistent controller structure from the start, which makes the codebase easier to navigate as it grows. The tradeoff is a build step (`tsoa spec-and-routes`) that needs to run before the TypeScript compiler, but this is wired into the `dev` and `build` scripts so it's transparent in practice.

NestJS was also considered as the framework of choise. It also offers OpenAPI generation, even more consistent code structure, DTO validation, and many more things out of the box, without having a required build step LIKE . However I considered it an overkill for an API of this scope, as the boilerplate required to have it up and running was not worth the effort. Moreover, I never used tsoa so it was a good learning opportunity :)

### Test runner — Bun's built-in test runner over Jest or Mocha

Already using Bun, so this was kind of a natural choice. A few reasons it works well here:

- Zero config: No `jest.config.ts`, no babel transform, no `ts-jest` just `bun test`. One less thing to maintain.
- No transpilation step: Jest needs to compile TypeScript before running tests, which adds startup time and another config layer.
- Familiar API: `bun:test` has the same `describe`/`test`/`expect`/`mock`/`spyOn` shape as Jest, so there's no real learning curve and migrating away later wouldn't be painful.

The downside is that Jest has a much bigger ecosystem. If this were a larger project Jest would have been worth reconsidering, but for this project the simplicity IMO is better.

### Integration tests — reusing the dev database

The integration tests run against the same local Postgres instance used for development (configured via `DATABASE_URL` in `.env`). Each test cleans up after itself with `prisma.streamingContent.deleteMany()` in `afterEach`, so the table is always empty at the start of the next test.

This is a shortcut for the scope of this assessment. Given more time, the right approach would be spinning up a dedicated ephemeral database per test run using [Testcontainers](https://testcontainers.com). It starts a real Postgres Docker container in `beforeAll`, runs `prisma migrate deploy` against it, and cleanups the whole thing in `afterAll`, so integration tests are fully isolated from dev data, work in CI without any pre-existing database, and don't risk clobbering anything if a test fails mid-run.

## Auth middleware bugs
**Bug 1 — Non-null assertion crash**

```ts
// Before
const token = authHeader!.split(' ')[1];
```

If a request arrives without an `Authorization` header, it causes an unhandled `TypeError: Cannot read properties of undefined` crash rather than a 401 response.

```ts
// After
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return reject(Object.assign(new Error('No token provided'), { statusCode: 401 }));
}
const token = authHeader.split(' ')[1];
```

**Bug 2 — Hardcoded JWT secret**

```ts
// Before
jwt.verify(token, 'secret123', ...)
```

This is a security vulnerability, tokens issued with the hardcoded value would pass verification in any environment.

```ts
// After
const secret = process.env.JWT_SECRET;
if (!secret) {
  return reject(new Error('JWT_SECRET is not configured'));
}
jwt.verify(token, secret, ...)
```

**Bug 3 — `next()` called after error response**

```ts
// Before
res.status(403).json({ error: 'Invalid token' });
next();
```

Calling `next()` causes Express to continue executing the handler chain, even after sending a 403 error. The protected route handler runs despite the invalid token. The response has already started, so the handler's `res.json()` call triggers a "headers already sent" error. 

```ts
// After
return reject(Object.assign(new Error('Invalid token'), { statusCode: 401 })); // exit the middleware immediately
```

### Streaming list route — performance issues

The original route fetches every row in the table on every request, regardless of how many results the client needs:

```js
router.get('/', authMiddleware, async (req, res) => {
  const allContent = await StreamingContent.findAll();
  const filtered = allContent.filter(item => item.genre === req.query.genre);
  res.json(filtered);
});
```

`findAll()` with no conditions loads the entire table into memory, transfers it all over the network, deserialises it into JS objects, and then throws most of it away in the `.filter()` call. Response time and memory usage grow linearly with the table size.

Three improvements were added to address this:

1. **Cursor-based pagination** — `take: limit + 1` in Prisma means each query fetches at most `limit + 1` rows. The table can grow arbitrarily and query time stays constant. In the original implementation I opted for offset pagination, but as this does not scale well, I switched to cursor-based. The tradeoff is now it's not possible to jump to specific pages but an infinite-scroll type of UI should suffice in the FE side, as it became the modern standard for content type of applications anyway.

2. **DB-level genre filtering** — `where: genre ? { genre } : undefined` pushes the filter into SQL so only matching rows are ever read from disk, transferred, or deserialised, instead of filtering in JS after fetching everything.

3. **Composite indexes** — moving the filter to SQL still requires a full sequential scan without an index. Two indexes were added to cover both query shapes: `(createdAt DESC)` for unfiltered requests, and `(genre, createdAt DESC)` for genre-filtered ones. This lets Postgres satisfy both the filter and the sort order from the index alone, with no separate sort step.
