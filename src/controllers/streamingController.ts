import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Query,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';
import * as streamingService from '../services/streamingService';
import type {
  CreateStreamingInput,
  PaginatedStreamingResponse,
  StreamingContentResponse,
  UpdateStreamingInput,
} from '../types/streaming';
import type { ErrorResponse } from '../types/auth';

@Route('api/streaming')
@Tags('Streaming')
@Security('jwt')
@Response<ErrorResponse>(401, 'Unauthorized')
export class StreamingController extends Controller {
  /**
   * List streaming content, ordered by creation date descending.
   * Pass the returned `nextCursor` as the `cursor` param to fetch the next page.
   * Optionally filter by `genre`.
   */
  @Get()
  async list(
    @Query() limit = 20,
    @Query() cursor?: string,
    @Query() genre?: string,
  ): Promise<PaginatedStreamingResponse> {
    return streamingService.list(cursor, limit, genre);
  }

  /**
   * Get a single streaming content item by ID.
   */
  @Get('{id}')
  @Response<ErrorResponse>(404, 'Not found')
  async getById(@Path() id: string): Promise<StreamingContentResponse> {
    return streamingService.findById(id);
  }

  /**
   * Create a new streaming content item.
   */
  @Post()
  @SuccessResponse(201, 'Created')
  @Response<ErrorResponse>(422, 'Validation failed')
  async create(@Body() body: CreateStreamingInput): Promise<StreamingContentResponse> {
    this.setStatus(201);
    return streamingService.create(body);
  }

  /**
   * Update an existing streaming content item.
   */
  @Put('{id}')
  @Response<ErrorResponse>(404, 'Not found')
  @Response<ErrorResponse>(422, 'Validation failed')
  async update(
    @Path() id: string,
    @Body() body: UpdateStreamingInput,
  ): Promise<StreamingContentResponse> {
    return streamingService.update(id, body);
  }

  /**
   * Delete a streaming content item.
   */
  @Delete('{id}')
  @SuccessResponse(204, 'No content')
  @Response<ErrorResponse>(404, 'Not found')
  async remove(@Path() id: string): Promise<void> {
    this.setStatus(204);
    return streamingService.remove(id);
  }
}
