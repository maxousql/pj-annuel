export const AUTH_COOKIE_NAME = "app_session";
export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "google_oauth_state";
export const GOOGLE_OAUTH_NEXT_COOKIE_NAME = "google_oauth_next";
export const GOOGLE_OAUTH_FRONTEND_ORIGIN_COOKIE_NAME =
  "google_oauth_frontend_origin";

export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 60 * 10;

export const AUTH_TOKEN_ISSUER = "content-ai-api";
export const AUTH_TOKEN_AUDIENCE = "content-ai-web";

export const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";
