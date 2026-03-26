FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json ./
RUN bun install

# Build: generate TSOA routes + Prisma client + compile TypeScript
FROM deps AS build
COPY . .
RUN bun run build

# Runtime image
FROM oven/bun:1-alpine AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

RUN bun install --production

EXPOSE 3000
CMD ["sh", "-c", "bunx prisma migrate deploy && bun dist/server.js"]
