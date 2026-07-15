import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/database/prisma.service";

describe("Auth API", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-with-more-than-32-characters";
    process.env.FRONTEND_URL = "http://localhost:3000,http://localhost:3001";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    const { AppModule } = await import("../src/app.module");
    prisma = new FakePrismaService();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app, {
      frontendUrl: "http://localhost:3000",
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prisma.reset();
  });

  it("registers, reads, updates and logs out a credentials user", async () => {
    const registerResponse = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: " USER@example.com ",
        name: "User Example",
        password: "Password123",
      })
      .expect(201);

    expect(registerResponse.body).toMatchObject({
      data: {
        user: {
          avatarUrl: null,
          email: "user@example.com",
          name: "User Example",
        },
      },
      error: null,
    });

    const cookie = extractSessionCookie(registerResponse);
    expect(cookie).toContain("app_session=");
    expect(cookie).toContain("HttpOnly");

    const meResponse = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);

    expect(meResponse.body.data.user.email).toBe("user@example.com");

    const profileResponse = await request(app.getHttpServer())
      .patch("/api/auth/me")
      .set("Cookie", cookie)
      .send({
        avatarUrl: "https://example.com/avatar.png",
        name: "Updated User",
      })
      .expect(200);

    expect(profileResponse.body.data.user).toMatchObject({
      avatarUrl: "https://example.com/avatar.png",
      email: "user@example.com",
      name: "Updated User",
    });

    const logoutResponse = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .expect(201);

    expect(logoutResponse.body).toEqual({
      data: { ok: true },
      error: null,
    });
  });

  it("logs in an existing credentials user with generic failures", async () => {
    await request(app.getHttpServer()).post("/api/auth/register").send({
      email: "user@example.com",
      name: "User Example",
      password: "Password123",
    });

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "user@example.com",
        password: "bad-password",
      })
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "user@example.com",
        password: "Password123",
      })
      .expect(201);

    expect(loginResponse.body.data.user.email).toBe("user@example.com");
    expect(extractSessionCookie(loginResponse)).toContain("app_session=");
  });

  it("changes a credentials password after verifying the current one", async () => {
    const registerResponse = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: "password@example.com",
        name: "Password User",
        password: "Password123",
      })
      .expect(201);
    const cookie = extractSessionCookie(registerResponse);

    await request(app.getHttpServer())
      .patch("/api/auth/me/password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword456",
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch("/api/auth/me/password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "Password123",
        newPassword: "weak",
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch("/api/auth/me/password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "Password123",
        newPassword: "NewPassword456",
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "password@example.com",
        password: "Password123",
      })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "password@example.com",
        password: "NewPassword456",
      })
      .expect(201);
  });

  it("rejects weak passwords and unauthenticated profile access", async () => {
    const weakPasswordResponse = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: "weak@example.com",
        name: "Weak Password",
        password: "short",
      })
      .expect(400);

    expect(weakPasswordResponse.body).toMatchObject({
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Le mot de passe doit contenir au moins 10 caracteres, une lettre et un chiffre, sans dépasser la limite de sécurité.",
      },
    });

    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  it("starts Google OAuth on the backend without exposing a client secret", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/auth/google")
      .set("Referer", "http://localhost:3001/login")
      .query({ next: "/app/settings" })
      .expect(302);

    expect(response.headers.location).toContain(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(response.headers.location).toContain("client_id=google-client-id");
    expect(response.headers.location).toContain("response_type=code");
    expect(response.headers.location).toContain("scope=openid+email+profile");
    expect(response.headers.location).not.toContain("client_secret");

    const cookies = response.headers["set-cookie"];
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining("google_oauth_state="),
        expect.stringContaining("google_oauth_next=%2Fapp%2Fsettings"),
        expect.stringContaining(
          "google_oauth_frontend_origin=http%3A%2F%2Flocalhost%3A3001",
        ),
      ]),
    );
  });

  it("redirects Google OAuth callback to the frontend origin that started the login", async () => {
    const startResponse = await request(app.getHttpServer())
      .get("/api/auth/google")
      .set("Referer", "http://localhost:3001/login")
      .query({ next: "/app/settings" })
      .expect(302);
    const cookies = startResponse.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies)
      ? cookies
      : cookies
        ? [cookies]
        : [];
    expect(cookieHeader.length).toBeGreaterThan(0);

    const callbackResponse = await request(app.getHttpServer())
      .get("/api/auth/google/callback")
      .set("Cookie", cookieHeader)
      .query({
        code: "invalid-code",
        state: "invalid-state",
      })
      .expect(302);

    expect(callbackResponse.headers.location).toBe(
      "http://localhost:3001/login?error=oauth",
    );
    expect(callbackResponse.headers.location).not.toContain(",");
  });
});

type StoredUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  deletedAt: Date | null;
};

type StoredAuthAccount = {
  id: string;
  metadata: Record<string, unknown>;
  passwordHash: string | null;
  provider: "CREDENTIALS" | "GOOGLE";
  providerAccountId: string;
  userId: string;
};

type Select = Record<string, boolean> | undefined;

class FakePrismaService {
  private users: StoredUser[] = [];
  private authAccounts: StoredAuthAccount[] = [];
  private sequence = 0;

  readonly user = {
    create: async (args: {
      data: Pick<StoredUser, "email" | "name"> &
        Partial<Pick<StoredUser, "avatarUrl">>;
      select?: Select;
    }) => {
      const user: StoredUser = {
        avatarUrl: args.data.avatarUrl ?? null,
        deletedAt: null,
        email: args.data.email,
        id: this.nextId(),
        name: args.data.name,
      };
      this.users.push(user);

      return selectUser(user, args.select);
    },
    findUnique: async (args: {
      select?: Select;
      where: { email?: string; id?: string };
    }) => {
      const user =
        typeof args.where.email === "string"
          ? this.users.find((candidate) => candidate.email === args.where.email)
          : this.users.find((candidate) => candidate.id === args.where.id);

      return user ? selectUser(user, args.select) : null;
    },
    update: async (args: {
      data: Partial<Pick<StoredUser, "avatarUrl" | "name">>;
      select?: Select;
      where: { id: string };
    }) => {
      const user = this.users.find(
        (candidate) => candidate.id === args.where.id,
      );

      if (!user) {
        throw new Error("User not found");
      }

      user.avatarUrl = args.data.avatarUrl ?? user.avatarUrl;
      user.name = args.data.name ?? user.name;

      return selectUser(user, args.select);
    },
  };

  readonly authAccount = {
    create: async (args: {
      data: Pick<
        StoredAuthAccount,
        "passwordHash" | "provider" | "providerAccountId" | "userId"
      > &
        Partial<Pick<StoredAuthAccount, "metadata">>;
    }) => {
      const account: StoredAuthAccount = {
        id: this.nextId(),
        metadata: args.data.metadata ?? {},
        passwordHash: args.data.passwordHash,
        provider: args.data.provider,
        providerAccountId: args.data.providerAccountId,
        userId: args.data.userId,
      };
      this.authAccounts.push(account);

      return account;
    },
    findUnique: async (args: {
      include?: { user?: { select?: Select } };
      where: {
        provider_providerAccountId: Pick<
          StoredAuthAccount,
          "provider" | "providerAccountId"
        >;
      };
    }) => {
      const account = this.authAccounts.find((candidate) => {
        return (
          candidate.provider ===
            args.where.provider_providerAccountId.provider &&
          candidate.providerAccountId ===
            args.where.provider_providerAccountId.providerAccountId
        );
      });

      if (!account) {
        return null;
      }

      const user = this.users.find(
        (candidate) => candidate.id === account.userId,
      );

      return {
        ...account,
        ...(args.include?.user
          ? { user: selectUser(user, args.include.user.select) }
          : {}),
      };
    },
    findFirst: async (args: {
      select?: Select;
      where: { provider?: StoredAuthAccount["provider"]; userId?: string };
    }) => {
      const account = this.authAccounts.find((candidate) => {
        return (
          (!args.where.provider ||
            candidate.provider === args.where.provider) &&
          (!args.where.userId || candidate.userId === args.where.userId)
        );
      });

      return account ? selectAuthAccount(account, args.select) : null;
    },
    update: async (args: {
      data: Partial<Pick<StoredAuthAccount, "passwordHash">>;
      select?: Select;
      where: { id: string };
    }) => {
      const account = this.authAccounts.find(
        (candidate) => candidate.id === args.where.id,
      );

      if (!account) {
        throw new Error("Auth account not found");
      }

      account.passwordHash = args.data.passwordHash ?? account.passwordHash;
      return selectAuthAccount(account, args.select);
    },
    updateMany: async (args: {
      data: Partial<Pick<StoredAuthAccount, "passwordHash">>;
      where: { id: string; passwordHash?: string | null };
    }) => {
      const account = this.authAccounts.find((candidate) => {
        return (
          candidate.id === args.where.id &&
          (args.where.passwordHash === undefined ||
            candidate.passwordHash === args.where.passwordHash)
        );
      });

      if (!account) {
        return { count: 0 };
      }

      account.passwordHash = args.data.passwordHash ?? account.passwordHash;
      return { count: 1 };
    },
    upsert: async (args: {
      create: Omit<StoredAuthAccount, "id" | "passwordHash"> & {
        passwordHash?: string | null;
      };
      update: Partial<Pick<StoredAuthAccount, "metadata">>;
      where: {
        provider_providerAccountId: Pick<
          StoredAuthAccount,
          "provider" | "providerAccountId"
        >;
      };
    }) => {
      const existing = this.authAccounts.find((candidate) => {
        return (
          candidate.provider ===
            args.where.provider_providerAccountId.provider &&
          candidate.providerAccountId ===
            args.where.provider_providerAccountId.providerAccountId
        );
      });

      if (existing) {
        existing.metadata = args.update.metadata ?? existing.metadata;
        return existing;
      }

      const account: StoredAuthAccount = {
        id: this.nextId(),
        metadata: args.create.metadata,
        passwordHash: args.create.passwordHash ?? null,
        provider: args.create.provider,
        providerAccountId: args.create.providerAccountId,
        userId: args.create.userId,
      };
      this.authAccounts.push(account);

      return account;
    },
  };

  reset(): void {
    this.users = [];
    this.authAccounts = [];
    this.sequence = 0;
  }

  async $transaction<T>(
    callback: (transaction: this) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }

  private nextId(): string {
    this.sequence += 1;
    return `018f7b8f-3eb4-4e57-a321-00000000000${this.sequence}`;
  }
}

function selectUser<TUser extends StoredUser | undefined>(
  user: TUser,
  select?: Select,
): TUser | Partial<StoredUser> | undefined {
  if (!user || !select) {
    return user;
  }

  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, user[key as keyof StoredUser]]),
  );
}

function selectAuthAccount(
  account: StoredAuthAccount,
  select?: Select,
): StoredAuthAccount | Partial<StoredAuthAccount> {
  if (!select) return account;

  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, account[key as keyof StoredAuthAccount]]),
  );
}

function extractSessionCookie(response: request.Response): string {
  const setCookie = response.headers["set-cookie"];

  if (!Array.isArray(setCookie) || !setCookie[0]) {
    throw new Error("Expected Set-Cookie header");
  }

  return setCookie[0];
}
