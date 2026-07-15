import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { fail } from "@content-ai/shared";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<
      Request & {
        requestId?: string;
        user?: { id?: string };
        organizationContext?: { organization?: { id?: string } };
      }
    >();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const code = resolveErrorCode(status, exception);
    const message = resolveErrorMessage(exception, status);
    const logEntry = JSON.stringify({
      code,
      method: request.method,
      organizationId: request.organizationContext?.organization?.id,
      path: sanitizeRequestPath(request.originalUrl),
      requestId: request.requestId,
      status,
      userId: request.user?.id,
    });

    if (status >= 500) {
      this.logger.error(
        logEntry,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400 && status !== 404) {
      this.logger.warn(logEntry);
    }

    response
      .status(status)
      .json(
        fail(
          code,
          message,
          request.requestId ? { requestId: request.requestId } : undefined,
        ),
      );
  }
}

export function sanitizeRequestPath(originalUrl: string): string {
  let pathname: string;

  try {
    pathname = new URL(originalUrl, "http://local.invalid").pathname;
  } catch {
    pathname = originalUrl.split("?", 1)[0] ?? "/";
  }

  const segments = pathname.split("/");
  const invitationIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "invitations",
  );

  if (invitationIndex >= 0 && segments[invitationIndex + 1]) {
    segments[invitationIndex + 1] = "[redacted]";
  }

  const publicInviteIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "invite",
  );

  if (publicInviteIndex >= 0 && segments[publicInviteIndex + 1]) {
    segments[publicInviteIndex + 1] = "[redacted]";
  }

  return segments.join("/") || "/";
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
