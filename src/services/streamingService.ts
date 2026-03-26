import prisma from '../lib/prisma';
import type {
  CreateStreamingInput,
  PaginatedStreamingResponse,
  StreamingContentResponse,
  UpdateStreamingInput,
} from '../types/streaming';

export const list = async (page: number, limit: number): Promise<PaginatedStreamingResponse> => {
  const [data, total] = await Promise.all([
    prisma.streamingContent.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.streamingContent.count(),
  ]);

  return { data, total, page, limit };
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
