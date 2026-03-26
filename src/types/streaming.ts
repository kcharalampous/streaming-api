export interface StreamingContentResponse {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  genre: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStreamingInput {
  /** @minLength 1 */
  title: string;
  description?: string;
  thumbnailUrl?: string;
  /** @minLength 1 */
  genre: string;
  /** @minLength 1 */
  videoUrl: string;
}

export interface UpdateStreamingInput {
  /** @minLength 1 */
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  /** @minLength 1 */
  genre?: string;
  /** @minLength 1 */
  videoUrl?: string;
}

export interface PaginatedStreamingResponse {
  data: StreamingContentResponse[];
  total: number;
  page: number;
  limit: number;
}
