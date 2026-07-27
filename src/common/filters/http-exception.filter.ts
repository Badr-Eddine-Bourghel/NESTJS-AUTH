import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

// When compiled to JS, TS completly strips this line away because it's marked type
import type {
  Request, // Represents the incoming HTTP request (headers,query parameters,body ..)
  Response, // Represents the outgoing HTTP response (send status code, cookies, output JSON)
} from 'express'; // Nestjs is built on top of Express. Under the hood it uses Express Objects to represents HTTP request

// The Catch is empty, which means to chatch every single error or exception thrown anywhere in my app .
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  // This method runs automatically whenever an error occurs
  catch(exception: unknown, host: ArgumentsHost) {
    // host allows us to extract the underlying Express request and response objects

    // Switch host (the generic event that caused the error) to HTTP mode and have access to the request and response
    const ctx = host.switchToHttp();

    // Pulling out the underlying HTTP response object
    const response = ctx.getResponse<Response>(); // <Response> to return Response object, without it Nestjs will return a generic any or unknown type

    // Pulling out the underlying HTTP response object
    const request = ctx.getRequest<Request>(); // <Request> to return Request object, without it Nestjs will return a generic any or unknown type

    const status =
      exception instanceof HttpException // Check if known HTTP error
        ? exception.getStatus() // if yes we use the status code
        : HttpStatus.INTERNAL_SERVER_ERROR; // if not we use '500 internel Server Error'

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal Server Error';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as Record<string, unknown>).message ??
          exceptionResponse);
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
