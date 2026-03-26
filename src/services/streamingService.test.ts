// @ts-nocheck
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import prisma from '../lib/prisma';
import * as streamingService from './streamingService';

mock.module('../lib/prisma', () => ({
  default: {
    streamingContent: {
      findMany: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve(null)),
      delete: mock(() => Promise.resolve(null)),
    },
  },
}));

const mockContent = {
  id: 'content-1',
  title: 'Test Movie',
  description: 'A test movie',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  videoUrl: 'https://example.com/video.mp4',
  genre: 'Action',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('streamingService', () => {
  beforeEach(() => {
    prisma.streamingContent.findMany.mockReset();
    prisma.streamingContent.findUnique.mockReset();
    prisma.streamingContent.create.mockReset();
    prisma.streamingContent.update.mockReset();
    prisma.streamingContent.delete.mockReset();
  });

  describe('list', () => {
    test('returns data and null nextCursor when results fit within limit', async () => {
      prisma.streamingContent.findMany.mockResolvedValue([mockContent]);

      const result = await streamingService.list(undefined, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('content-1');
      expect(result.nextCursor).toBeNull();
      expect(result.limit).toBe(20);
    });

    test('returns nextCursor when there is another page', async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({ ...mockContent, id: `content-${i + 1}` }));
      // service fetches limit+1 items; returning 3 when limit=2 signals a next page
      prisma.streamingContent.findMany.mockResolvedValue(items);

      const result = await streamingService.list(undefined, 2);

      expect(result.data).toHaveLength(2);
      expect(result.nextCursor).toBe('content-2');
    });

    test('passes cursor and skip to prisma when cursor is provided', async () => {
      prisma.streamingContent.findMany.mockResolvedValue([]);

      await streamingService.list('content-5', 10);

      expect(prisma.streamingContent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'content-5' }, skip: 1 }),
      );
    });

    test('filters by genre when provided', async () => {
      prisma.streamingContent.findMany.mockResolvedValue([mockContent]);

      await streamingService.list(undefined, 20, 'Action');

      expect(prisma.streamingContent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { genre: 'Action' } }),
      );
    });

    test('returns empty data when no content exists', async () => {
      prisma.streamingContent.findMany.mockResolvedValue([]);

      const result = await streamingService.list(undefined, 20);

      expect(result.data).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('findById', () => {
    test('returns item when found', async () => {
      prisma.streamingContent.findUnique.mockResolvedValue(mockContent);

      const result = await streamingService.findById('content-1');

      expect(result.id).toBe('content-1');
      expect(result.title).toBe('Test Movie');
    });

    test('throws 404 when item does not exist', async () => {
      prisma.streamingContent.findUnique.mockResolvedValue(null);

      const err = await streamingService.findById('nonexistent').catch((e) => e);

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
    });
  });

  describe('create', () => {
    test('creates and returns new content', async () => {
      prisma.streamingContent.create.mockResolvedValue(mockContent);

      const result = await streamingService.create({
        title: 'Test Movie',
        videoUrl: 'https://example.com/video.mp4',
        genre: 'Action',
      });

      expect(result.id).toBe('content-1');
      expect(result.title).toBe('Test Movie');
      expect(prisma.streamingContent.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    test('updates and returns item when found', async () => {
      const updated = { ...mockContent, title: 'Updated Title' };
      prisma.streamingContent.findUnique.mockResolvedValue(mockContent);
      prisma.streamingContent.update.mockResolvedValue(updated);

      const result = await streamingService.update('content-1', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
      expect(prisma.streamingContent.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'content-1' } }),
      );
    });

    test('throws 404 when item does not exist', async () => {
      prisma.streamingContent.findUnique.mockResolvedValue(null);

      const err = await streamingService
        .update('nonexistent', { title: 'Updated' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
    });
  });

  describe('remove', () => {
    test('deletes item when found', async () => {
      prisma.streamingContent.findUnique.mockResolvedValue(mockContent);
      prisma.streamingContent.delete.mockResolvedValue(mockContent);

      await streamingService.remove('content-1');

      expect(prisma.streamingContent.delete).toHaveBeenCalledWith({
        where: { id: 'content-1' },
      });
    });

    test('throws 404 when item does not exist', async () => {
      prisma.streamingContent.findUnique.mockResolvedValue(null);

      const err = await streamingService.remove('nonexistent').catch((e) => e);

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
    });
  });
});
