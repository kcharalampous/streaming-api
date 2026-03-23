# Streaming API

## Setup

> TODO: add setup instructions once core implementation is complete.

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
