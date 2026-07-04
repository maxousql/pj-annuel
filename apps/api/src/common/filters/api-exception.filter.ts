import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

import { fail } from "@content-ai/shared";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response
      .status(status)
      .json(
        fail(
          resolveErrorCode(status, exception),
          resolveErrorMessage(exception, status),
        ),
      );
  }
}

function resolveErrorMessage(exception: unknown, status: number): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === "string") {
      return response;
    }

    if (isExceptionResponse(response)) {
      if (Array.isArray(response.message)) {
        return response.message[0] ?? "Requete invalide.";
      }

      return response.message;
    }

    return exception.message;
  }

  if (status >= 500) {
    return "Erreur serveur.";
  }

  return "Requete invalide.";
}

function resolveErrorCode(status: number, exception?: unknown): string {
  const customCode = readExceptionCode(exception);

  if (customCode) {
    return customCode;
  }

  if (status === HttpStatus.UNAUTHORIZED) {
    return "UNAUTHORIZED";
  }

  if (status === HttpStatus.FORBIDDEN) {
    return "FORBIDDEN";
  }

  if (status === HttpStatus.CONFLICT) {
    return "CONFLICT";
  }

  if (status === HttpStatus.BAD_REQUEST) {
    return "VALIDATION_ERROR";
  }

  return status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR";
}

function readExceptionCode(exception: unknown): string | null {
  if (!(exception instanceof HttpException)) {
    return null;
  }

  const response = exception.getResponse();

  if (
    typeof response === "object" &&
    response !== null &&
    "code" in response &&
    typeof response.code === "string"
  ) {
    return response.code;
  }

  return null;
}

function isExceptionResponse(
  value: unknown,
): value is { message: string | string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    (typeof value.message === "string" || Array.isArray(value.message))
  );
}
