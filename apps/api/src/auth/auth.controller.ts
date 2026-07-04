import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { successResponse } from "../common/responses/api-response";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AuthGuard } from "./guards/auth.guard";
import {
  clearAuthCookie,
  clearGoogleOAuthCookies,
  readCookie,
  setAuthCookie,
  setGoogleOAuthCookies,
} from "./utils/cookies";
import { sanitizeNextPath } from "./utils/redirects";
import {
  GOOGLE_OAUTH_FRONTEND_ORIGIN_COOKIE_NAME,
  GOOGLE_OAUTH_NEXT_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
} from "./auth.constants";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { result, token } = await this.authService.register(dto);
    setAuthCookie(response, token);

    return successResponse(result);
  }

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { result, token } = await this.authService.login(dto);
    setAuthCookie(response, token);

    return successResponse(result);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookie(response);

    return successResponse({ ok: true });
  }

  @Get("me")
  @UseGuards(AuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return successResponse({
      user: request.user,
    });
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.authService.updateProfile(request.user.id, dto);

    return successResponse({ user });
  }

  @Get("google")
  startGoogleLogin(
    @Req() request: Request,
    @Query("next") nextPath: string | undefined,
    @Res() response: Response,
  ) {
    const state = this.authService.generateOAuthState();
    setGoogleOAuthCookies(
      response,
      state,
      sanitizeNextPath(nextPath),
      this.authService.resolveFrontendOrigin(request),
    );

    return response.redirect(
      this.authService.buildGoogleAuthorizationUrl(state),
    );
  }

  @Get("google/callback")
  async handleGoogleCallback(
    @Req() request: Request,
    @Res() response: Response,
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string,
  ) {
    const expectedState = readCookie(request, GOOGLE_OAUTH_STATE_COOKIE_NAME);
    const nextPath = sanitizeNextPath(
      readCookie(request, GOOGLE_OAUTH_NEXT_COOKIE_NAME),
    );
    const frontendOrigin = readCookie(
      request,
      GOOGLE_OAUTH_FRONTEND_ORIGIN_COOKIE_NAME,
    );
    clearGoogleOAuthCookies(response);

    if (error || !code || !state || state !== expectedState) {
      return response.redirect(
        this.authService.getFrontendUrl("/login?error=oauth", frontendOrigin),
      );
    }

    try {
      const { token } = await this.authService.loginWithGoogle(code);
      setAuthCookie(response, token);

      return response.redirect(
        this.authService.getFrontendUrl(nextPath, frontendOrigin),
      );
    } catch (exception) {
      if (exception instanceof UnauthorizedException) {
        return response.redirect(
          this.authService.getFrontendUrl("/login?error=oauth", frontendOrigin),
        );
      }

      throw exception;
    }
  }
}
