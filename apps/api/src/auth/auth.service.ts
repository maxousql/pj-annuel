import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AccountActivityStatsPayload,
  AccountProfilePayload,
  AuthProvider,
  IdeaDiscoverySignal,
} from "@content-ai/shared";
import bcrypt from "bcryptjs";
import type { Request } from "express";
import { sign, verify, type JwtPayload } from "jsonwebtoken";

import { PrismaService } from "../database/prisma.service";
import { Prisma } from "../generated/prisma/client";
import {
  AUTH_TOKEN_AUDIENCE,
  AUTH_TOKEN_ISSUER,
  AUTH_TOKEN_TTL_SECONDS,
  GOOGLE_AUTHORIZATION_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_USERINFO_ENDPOINT,
} from "./auth.constants";
import type {
  AuthResult,
  AuthenticatedUser,
  GoogleUserInfo,
} from "./auth.types";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import { normalizeEmail } from "./utils/password-policy";
import { joinUrl } from "./utils/redirects";

const BCRYPT_COST = 12;
const TEST_AUTH_SECRET = "test-auth-secret-for-content-ai-that-is-long-enough";

type UserRecord = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ result: AuthResult; token: string }> {
    const email = normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException("Impossible de creer ce compte.");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = await this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          name: dto.name.trim(),
        },
        select: userSelect,
      });

      await transaction.authAccount.create({
        data: {
          provider: "CREDENTIALS",
          providerAccountId: email,
          passwordHash,
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<{ result: AuthResult; token: string }> {
    const email = normalizeEmail(dto.email);
    const account = await this.prisma.authAccount.findUnique({
      include: {
        user: {
          select: userSelect,
        },
      },
      where: {
        provider_providerAccountId: {
          provider: "CREDENTIALS",
          providerAccountId: email,
        },
      },
    });

    if (!account?.passwordHash || account.user.deletedAt) {
      throwInvalidCredentials();
    }

    const isValidPassword = await bcrypt.compare(
      dto.password,
      account.passwordHash,
    );

    if (!isValidPassword) {
      throwInvalidCredentials();
    }

    return this.buildAuthResult(account.user);
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      select: userSelect,
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Session invalide.");
    }

    return toAuthenticatedUser(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.update({
      data: {
        avatarUrl: dto.avatarUrl ?? null,
        name: dto.name.trim(),
      },
      select: userSelect,
      where: { id: userId },
    });

    return toAuthenticatedUser(user);
  }

  async getProfile(userId: string): Promise<AccountProfilePayload> {
    const user = await this.prisma.user.findUnique({
      select: {
        authAccounts: {
          select: {
            passwordHash: true,
            provider: true,
          },
        },
        avatarUrl: true,
        createdAt: true,
        deletedAt: true,
        email: true,
        id: true,
        memberships: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            role: true,
          },
          where: {
            organization: { deletedAt: null },
            status: "ACTIVE",
          },
        },
        name: true,
      },
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Session invalide.");
    }

    const organizationIds = user.memberships.map(
      ({ organization }) => organization.id,
    );
    const emptyStats: AccountActivityStatsPayload = {
      aiGenerations: 0,
      contentIdeasGenerated: 0,
      contentIdeasSaved: 0,
      contentItemsCreated: 0,
      discoveryFeedbacks: {
        disliked: 0,
        liked: 0,
        skipped: 0,
      },
    };
    let stats = emptyStats;

    if (organizationIds.length > 0) {
      const [
        ideaGenerationRows,
        aiGenerations,
        savedIdeas,
        contentItems,
        feedbackGroups,
      ] = await Promise.all([
        this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
          select coalesce(sum(
            case
              when jsonb_typeof(prompt_metadata -> 'resultCount') = 'number'
                and (prompt_metadata ->> 'resultCount') ~ '^[0-9]+$'
              then (prompt_metadata ->> 'resultCount')::integer
              else 0
            end
          ), 0)::bigint as total
          from public.ai_generation_logs
          where user_id = ${userId}
            and organization_id in (${Prisma.join(organizationIds)})
            and status = 'SUCCEEDED'
            and type = 'CONTENT_IDEA'
        `),
        this.prisma.aiGenerationLog.count({
          where: {
            organizationId: { in: organizationIds },
            status: "SUCCEEDED",
            userId,
          },
        }),
        this.prisma.contentIdea.count({
          where: {
            createdById: userId,
            organizationId: { in: organizationIds },
          },
        }),
        this.prisma.contentItem.count({
          where: {
            createdById: userId,
            deletedAt: null,
            organizationId: { in: organizationIds },
          },
        }),
        this.prisma.ideaDiscoveryFeedback.groupBy({
          _count: {
            _all: true,
          },
          by: ["signal"],
          where: {
            organizationId: { in: organizationIds },
            userId,
          },
        }),
      ]);

      stats = {
        aiGenerations,
        contentIdeasGenerated: Number(ideaGenerationRows[0]?.total ?? 0),
        contentIdeasSaved: savedIdeas,
        contentItemsCreated: contentItems,
        discoveryFeedbacks: toDiscoveryFeedbackStats(feedbackGroups),
      };
    }

    const providers = Array.from(
      new Set(user.authAccounts.map(({ provider }) => provider)),
    ) as AuthProvider[];

    return {
      credentialsEnabled: user.authAccounts.some(
        (account) =>
          account.provider === "CREDENTIALS" && Boolean(account.passwordHash),
      ),
      memberships: user.memberships.map((membership) => ({
        joinedAt: membership.createdAt.toISOString(),
        organization: membership.organization,
        role: membership.role,
      })),
      providers,
      stats,
      user: {
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        email: user.email,
        id: user.id,
        name: user.name,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const account = await this.prisma.authAccount.findFirst({
      select: {
        id: true,
        passwordHash: true,
      },
      where: {
        provider: "CREDENTIALS",
        userId,
      },
    });

    if (!account?.passwordHash) {
      throw new BadRequestException(
        "Aucun mot de passe local n'est associé à ce compte.",
      );
    }

    const currentPasswordIsValid = await bcrypt.compare(
      dto.currentPassword,
      account.passwordHash,
    );

    if (!currentPasswordIsValid) {
      throw new BadRequestException("Le mot de passe actuel est incorrect.");
    }

    const passwordIsUnchanged = await bcrypt.compare(
      dto.newPassword,
      account.passwordHash,
    );

    if (passwordIsUnchanged) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'actuel.",
      );
    }

    const result = await this.prisma.authAccount.updateMany({
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_COST),
      },
      where: {
        id: account.id,
        passwordHash: account.passwordHash,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        "Le mot de passe a été modifié depuis un autre onglet. Réessayez.",
      );
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new UnauthorizedException("Utilisateur introuvable.");
      }

      await transaction.organization.deleteMany({
        where: { ownerId: userId },
      });

      await transaction.authAccount.deleteMany({
        where: { userId },
      });

      await transaction.membership.deleteMany({
        where: { userId },
      });

      await transaction.user.delete({
        where: { id: userId },
      });
    });
  }

  verifySessionToken(token: string): Pick<AuthenticatedUser, "id"> {
    try {
      const payload = verify(token, this.getAuthSecret(), {
        audience: AUTH_TOKEN_AUDIENCE,
        issuer: AUTH_TOKEN_ISSUER,
      }) as JwtPayload;

      if (typeof payload.sub !== "string") {
        throw new UnauthorizedException("Session invalide.");
      }

      return { id: payload.sub };
    } catch {
      throw new UnauthorizedException("Session invalide.");
    }
  }

  buildGoogleAuthorizationUrl(state: string): string {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID")?.trim();

    if (!clientId) {
      throw new InternalServerErrorException(
        "Google OAuth n'est pas configure.",
      );
    }

    const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", this.getGoogleRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);

    return url.toString();
  }

  generateOAuthState(): string {
    return randomBytes(32).toString("hex");
  }

  async loginWithGoogle(
    code: string,
  ): Promise<{ result: AuthResult; token: string }> {
    const userInfo = await this.fetchGoogleUserInfo(code);
    const email = normalizeEmail(userInfo.email);
    const name = userInfo.name?.trim() || email.split("@")[0] || "Utilisateur";
    const avatarUrl = userInfo.picture?.trim() || null;

    const user = await this.prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findUnique({
        select: userSelect,
        where: { email },
      });

      const upsertedUser =
        existingUser ??
        (await transaction.user.create({
          data: {
            avatarUrl,
            email,
            name,
          },
          select: userSelect,
        }));

      await transaction.authAccount.upsert({
        create: {
          metadata: {
            emailVerified: userInfo.email_verified === true,
          },
          provider: "GOOGLE",
          providerAccountId: userInfo.sub,
          userId: upsertedUser.id,
        },
        update: {
          metadata: {
            emailVerified: userInfo.email_verified === true,
          },
        },
        where: {
          provider_providerAccountId: {
            provider: "GOOGLE",
            providerAccountId: userInfo.sub,
          },
        },
      });

      if (!existingUser && avatarUrl) {
        return upsertedUser;
      }

      if (existingUser && !existingUser.avatarUrl && avatarUrl) {
        return transaction.user.update({
          data: { avatarUrl },
          select: userSelect,
          where: { id: existingUser.id },
        });
      }

      return upsertedUser;
    });

    return this.buildAuthResult(user);
  }

  getFrontendUrl(path = "/app", preferredOrigin?: string): string {
    return joinUrl(this.resolveFrontendOriginValue(preferredOrigin), path);
  }

  resolveFrontendOrigin(request: Request): string {
    return this.resolveFrontendOriginValue(
      readRequestOrigin(request) ?? undefined,
    );
  }

  private buildAuthResult(user: UserRecord): {
    result: AuthResult;
    token: string;
  } {
    const authenticatedUser = toAuthenticatedUser(user);
    const token = sign(
      {
        email: authenticatedUser.email,
        name: authenticatedUser.name,
      },
      this.getAuthSecret(),
      {
        audience: AUTH_TOKEN_AUDIENCE,
        expiresIn: AUTH_TOKEN_TTL_SECONDS,
        issuer: AUTH_TOKEN_ISSUER,
        subject: authenticatedUser.id,
      },
    );

    return {
      result: {
        user: authenticatedUser,
      },
      token,
    };
  }

  private async fetchGoogleUserInfo(code: string): Promise<GoogleUserInfo> {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID")?.trim();
    const clientSecret = this.configService
      .get<string>("GOOGLE_CLIENT_SECRET")
      ?.trim();

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        "Google OAuth n'est pas configure.",
      );
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.getGoogleRedirectUri(),
      }),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException("Authentification Google invalide.");
    }

    const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenPayload.access_token) {
      throw new UnauthorizedException("Authentification Google invalide.");
    }

    const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException("Authentification Google invalide.");
    }

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

    if (!userInfo.sub || !userInfo.email || userInfo.email_verified === false) {
      throw new UnauthorizedException("Authentification Google invalide.");
    }

    return userInfo;
  }

  private getGoogleRedirectUri(): string {
    const explicitRedirectUri = this.configService
      .get<string>("GOOGLE_REDIRECT_URI")
      ?.trim();

    if (explicitRedirectUri) {
      return explicitRedirectUri;
    }

    const apiBaseUrl =
      this.configService.get<string>("API_PUBLIC_URL")?.trim() ??
      this.configService.get<string>("NEXT_PUBLIC_API_URL")?.trim() ??
      "http://localhost:4000";

    return joinUrl(apiBaseUrl, "/api/auth/google/callback");
  }

  private resolveFrontendOriginValue(preferredOrigin?: string): string {
    const allowedOrigins = parseCsvEnv(
      this.configService.get<string>("FRONTEND_URL"),
    );
    const normalizedPreferredOrigin = preferredOrigin?.trim();

    if (
      normalizedPreferredOrigin &&
      allowedOrigins.includes(normalizedPreferredOrigin)
    ) {
      return normalizedPreferredOrigin;
    }

    return allowedOrigins[0] ?? "http://localhost:3000";
  }

  private getAuthSecret(): string {
    const authSecret = this.configService.get<string>("AUTH_SECRET")?.trim();

    if (authSecret) {
      return authSecret;
    }

    if (process.env.NODE_ENV === "test") {
      return TEST_AUTH_SECRET;
    }

    throw new InternalServerErrorException("AUTH_SECRET est requis.");
  }
}

const userSelect = {
  avatarUrl: true,
  deletedAt: true,
  email: true,
  id: true,
  name: true,
} as const;

function toAuthenticatedUser(
  user: UserRecord & { deletedAt?: Date | null },
): AuthenticatedUser {
  return {
    avatarUrl: user.avatarUrl,
    email: user.email,
    id: user.id,
    name: user.name,
  };
}

function throwInvalidCredentials(): never {
  throw new UnauthorizedException("Identifiants invalides.");
}

function parseCsvEnv(value?: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0);
}

function toDiscoveryFeedbackStats(
  groups: Array<{
    _count: { _all: number };
    signal: IdeaDiscoverySignal;
  }>,
): AccountActivityStatsPayload["discoveryFeedbacks"] {
  const stats = {
    disliked: 0,
    liked: 0,
    skipped: 0,
  };

  for (const group of groups) {
    if (group.signal === "LIKE") stats.liked = group._count._all;
    if (group.signal === "DISLIKE") stats.disliked = group._count._all;
    if (group.signal === "SKIP") stats.skipped = group._count._all;
  }

  return stats;
}

function readRequestOrigin(request: Request): string | null {
  const origin = readHeader(request, "origin");

  if (origin) {
    return origin;
  }

  const referer = readHeader(request, "referer");

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function readHeader(request: Request, name: string): string | null {
  const value = request.headers[name];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
