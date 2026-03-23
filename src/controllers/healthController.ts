import { Controller, Get, Route, Tags } from 'tsoa';

interface HealthResponse {
  status: string;
  timestamp: string;
}

@Route('health')
@Tags('System')
export class HealthController extends Controller {
  @Get()
  get(): HealthResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
