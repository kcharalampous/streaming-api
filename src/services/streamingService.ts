import prisma from '../lib/prisma';
import type {
  CreateStreamingInput,
  PaginatedStreamingResponse,
  StreamingContentResponse,
  UpdateStreamingInput,
} from '../types/streaming';

export const list = async (
  cursor: string | undefined,
  limit: number,
  genre?: string
): Promise<PaginatedStreamingResponse> => {
  const items = await prisma.streamingContent.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    where: genre ? { genre } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;
  const nextCursor = hasNextPage ? data[data.length - 1].id : null;

  return { data, nextCursor, limit };
};

export const findById = async (id: string): Promise<StreamingContentResponse> => {
  const item = await prisma.streamingContent.findUnique({ where: { id } });
  if (!item) {
    throw Object.assign(new Error('Not found'), { statusCode: 404 });
  }
  return item;
};

export const create = async (data: CreateStreamingInput): Promise<StreamingContentResponse> => {
  return prisma.streamingContent.create({ data });
};

export const update = async (
  id: string,
  data: UpdateStreamingInput
): Promise<StreamingContentResponse> => {
  const exists = await prisma.streamingContent.findUnique({ where: { id } });
  if (!exists) {
    throw Object.assign(new Error('Not found'), { statusCode: 404 });
  }

  return prisma.streamingContent.update({
    where: { id },
    data,
  });
};

export const remove = async (id: string): Promise<void> => {
  const exists = await prisma.streamingContent.findUnique({ where: { id } });
  if (!exists) {
    throw Object.assign(new Error('Not found'), { statusCode: 404 });
  }
  await prisma.streamingContent.delete({ where: { id } });
};
