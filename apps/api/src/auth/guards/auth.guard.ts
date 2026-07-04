import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { AUTH_COOKIE_NAME } from "../auth.constants";
import { AuthService } from "../auth.service";
import type { AuthenticatedRequest, AuthenticatedUser } from "../auth.types";
import { readCookie } from "../utils/cookies";

type MutableRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MutableRequest>();
    const token =
      getBearerToken(request) ?? readCookie(request, AUTH_COOKIE_NAME);

    if (!token) {
      throw new UnauthorizedException("Authentification requise.");
    }

    const tokenUser = this.authService.verifySessionToken(token);
    request.user = await this.authService.getCurrentUser(tokenUser.id);

    return true;
  }
}

export function getAuthenticatedUser(
  request: AuthenticatedRequest,
): AuthenticatedUser {
  return request.user;
}

function getBearerToken(request: Request): string | undefined {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || undefined;
}
