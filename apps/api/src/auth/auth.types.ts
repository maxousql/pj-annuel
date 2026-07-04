import type { Request } from "express";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export type AuthResult = {
  user: AuthenticatedUser;
};

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};
