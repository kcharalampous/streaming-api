import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import app from '../app';

const JWT_SECRET = 'integration-test-secret';

describe('Streaming API — integration', () => {
  let server: Server;
  let baseUrl: string;
  let authHeader: string;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    server = app.listen(0);
    const { port } = server.address() as { port: number };
    baseUrl = `http://localhost:${port}/api/streaming`;
    authHeader = `Bearer ${jwt.sign({ sub: 'user-1', email: 'test@example.com' }, JWT_SECRET)}`;
  });

  afterAll(async () => {
    await prisma.streamingContent.deleteMany();
    server.close();
  });

  afterEach(async () => {
    await prisma.streamingContent.deleteMany();
  });

  describe('authentication', () => {
    test('returns 401 when Authorization header is missing', async () => {
      const res = await fetch(baseUrl);
      expect(res.status).toBe(401);
    });

    test('returns 401 when token is invalid', async () => {
      const res = await fetch(baseUrl, {
        headers: { Authorization: 'Bearer invalid.token.here' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/streaming', () => {
    test('returns 200 with paginated results', async () => {
      await prisma.streamingContent.createMany({
        data: [
          { title: 'Movie A', videoUrl: 'https://example.com/a.mp4', genre: 'Action' },
          { title: 'Movie B', videoUrl: 'https://example.com/b.mp4', genre: 'Drama' },
        ],
      });

      const res = await fetch(baseUrl, { headers: { Authorization: authHeader } });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
    });

    test('respects page and limit query params', async () => {
      await prisma.streamingContent.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          title: `Movie ${i + 1}`,
          videoUrl: `https://example.com/${i + 1}.mp4`,
          genre: 'Action',
        })),
      });

      const res = await fetch(`${baseUrl}?page=2&limit=2`, {
        headers: { Authorization: authHeader },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.page).toBe(2);
      expect(body.limit).toBe(2);
      expect(body.total).toBe(5);
    });

    test('returns empty list when no content exists', async () => {
      const res = await fetch(baseUrl, { headers: { Authorization: authHeader } });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe('GET /api/streaming/:id', () => {
    test('returns 200 with item when found', async () => {
      const created = await prisma.streamingContent.create({
        data: { title: 'Test Movie', videoUrl: 'https://example.com/video.mp4', genre: 'Action' },
      });

      const res = await fetch(`${baseUrl}/${created.id}`, {
        headers: { Authorization: authHeader },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe(created.id);
      expect(body.title).toBe('Test Movie');
    });

    test('returns 404 when item does not exist', async () => {
      const res = await fetch(`${baseUrl}/nonexistent-id`, {
        headers: { Authorization: authHeader },
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Not found');
    });
  });

  describe('POST /api/streaming', () => {
    test('returns 201 and persists the item', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Movie',
          videoUrl: 'https://example.com/new.mp4',
          genre: 'Comedy',
          description: 'A funny one',
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.title).toBe('New Movie');
      expect(body.genre).toBe('Comedy');

      const inDb = await prisma.streamingContent.findUnique({ where: { id: body.id } });
      expect(inDb).not.toBeNull();
      expect(inDb!.title).toBe('New Movie');
    });

    test('returns 422 when required fields are missing', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Missing title and videoUrl' }),
      });

      expect(res.status).toBe(422);
    });
  });

  describe('PUT /api/streaming/:id', () => {
    test('returns 200 and updates the item in DB', async () => {
      const created = await prisma.streamingContent.create({
        data: {
          title: 'Original Title',
          videoUrl: 'https://example.com/video.mp4',
          genre: 'Action',
        },
      });

      const res = await fetch(`${baseUrl}/${created.id}`, {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.title).toBe('Updated Title');

      const inDb = await prisma.streamingContent.findUnique({ where: { id: created.id } });
      expect(inDb!.title).toBe('Updated Title');
    });

    test('returns 404 when item does not exist', async () => {
      const res = await fetch(`${baseUrl}/nonexistent-id`, {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Not found');
    });
  });

  describe('DELETE /api/streaming/:id', () => {
    test('returns 204 and removes the item from DB', async () => {
      const created = await prisma.streamingContent.create({
        data: { title: 'To Delete', videoUrl: 'https://example.com/video.mp4', genre: 'Action' },
      });

      const res = await fetch(`${baseUrl}/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: authHeader },
      });

      expect(res.status).toBe(204);
      expect(await res.text()).toBe('');

      const inDb = await prisma.streamingContent.findUnique({ where: { id: created.id } });
      expect(inDb).toBeNull();
    });

    test('returns 404 when item does not exist', async () => {
      const res = await fetch(`${baseUrl}/nonexistent-id`, {
        method: 'DELETE',
        headers: { Authorization: authHeader },
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Not found');
    });
  });
});
