import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  error: string;
  code: string;
  statusCode: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) ?? exception.message;
        code = (obj.code as string) ?? this.codeFromStatus(status);
        if (Array.isArray(obj.message)) {
          message = (obj.message as string[]).join('; ');
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      // Log real error server-side, return generic message to client
      this.logger.error(exception.message, exception.stack);
      message = 'An unexpected error occurred';
      code = 'INTERNAL_ERROR';
    }

    const body: ErrorResponseBody = { error: message, code, statusCode: status };
    response.status(status).json(body);
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 429: return 'RATE_LIMITED';
      default: return 'INTERNAL_ERROR';
    }
  }
}
