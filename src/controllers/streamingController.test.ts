// @ts-nocheck
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import * as streamingService from '../services/streamingService';
import { StreamingController } from './streamingController';

const mockContent = {
  id: 'content-1',
  title: 'Test Movie',
  description: 'A test movie',
  thumbnailUrl: null,
  videoUrl: 'https://example.com/video.mp4',
  genre: 'Action',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('StreamingController', () => {
  let controller: StreamingController;
  let listSpy: ReturnType<typeof spyOn>;
  let findByIdSpy: ReturnType<typeof spyOn>;
  let createSpy: ReturnType<typeof spyOn>;
  let updateSpy: ReturnType<typeof spyOn>;
  let removeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    controller = new StreamingController();
    listSpy = spyOn(streamingService, 'list');
    findByIdSpy = spyOn(streamingService, 'findById');
    createSpy = spyOn(streamingService, 'create');
    updateSpy = spyOn(streamingService, 'update');
    removeSpy = spyOn(streamingService, 'remove');
  });

  afterEach(() => {
    listSpy.mockRestore();
    findByIdSpy.mockRestore();
    createSpy.mockRestore();
    updateSpy.mockRestore();
    removeSpy.mockRestore();
  });

  describe('list', () => {
    test('delegates to service with correct page and limit', async () => {
      const paginated = { data: [mockContent], total: 1, page: 2, limit: 10 };
      listSpy.mockResolvedValue(paginated);

      const result = await controller.list(2, 10);

      expect(listSpy).toHaveBeenCalledWith(2, 10);
      expect(result).toEqual(paginated);
    });

    test('uses default page=1 and limit=20', async () => {
      listSpy.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await controller.list();

      expect(listSpy).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('getById', () => {
    test('returns item from service', async () => {
      findByIdSpy.mockResolvedValue(mockContent);

      const result = await controller.getById('content-1');

      expect(findByIdSpy).toHaveBeenCalledWith('content-1');
      expect(result).toEqual(mockContent);
    });

    test('propagates 404 error from service', async () => {
      const error = Object.assign(new Error('Not found'), { statusCode: 404 });
      findByIdSpy.mockRejectedValue(error);

      const err = await controller.getById('nonexistent').catch((e) => e);

      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
    });
  });

  describe('create', () => {
    test('sets status 201 and returns created item', async () => {
      createSpy.mockResolvedValue(mockContent);
      const setStatusSpy = mock(() => {});
      controller.setStatus = setStatusSpy;

      const result = await controller.create({
        title: 'Test Movie',
        videoUrl: 'https://example.com/video.mp4',
        genre: 'Action',
      });

      expect(setStatusSpy).toHaveBeenCalledWith(201);
      expect(result).toEqual(mockContent);
    });
  });

  describe('update', () => {
    test('delegates to service with id and body', async () => {
      const updated = { ...mockContent, title: 'Updated' };
      updateSpy.mockResolvedValue(updated);

      const result = await controller.update('content-1', { title: 'Updated' });

      expect(updateSpy).toHaveBeenCalledWith('content-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    test('propagates 404 error from service', async () => {
      const error = Object.assign(new Error('Not found'), { statusCode: 404 });
      updateSpy.mockRejectedValue(error);

      const err = await controller.update('nonexistent', { title: 'x' }).catch((e) => e);

      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
    });
  });

  describe('remove', () => {
    test('sets status 204 and calls service', async () => {
      removeSpy.mockResolvedValue(undefined);
      const setStatusSpy = mock(() => {});
      controller.setStatus = setStatusSpy;

      await controller.remove('content-1');

      expect(setStatusSpy).toHaveBeenCalledWith(204);
      expect(removeSpy).toHaveBeenCalledWith('content-1');
    });

    test('propagates 404 error from service', async () => {
      const error = Object.assign(new Error('Not found'), { statusCode: 404 });
      removeSpy.mockRejectedValue(error);

      const err = await controller.remove('nonexistent').catch((e) => e);

      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
    });
  });
});
