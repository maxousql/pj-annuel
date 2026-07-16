import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";
const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";

test("public and authentication pages remain usable on mobile", async ({
  page,
}) => {
  const cspViolations: string[] = [];
  page.on("pageerror", (error) => {
    if (/Content Security Policy|unsafe-eval/i.test(error.message)) {
      cspViolations.push(error.message);
    }
  });
  page.on("console", (message) => {
    if (/Content Security Policy|unsafe-eval/i.test(message.text())) {
      cspViolations.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ouvrir l'atelier/ }),
  ).toBeVisible();

  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Mot de passe")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Se connecter" }),
  ).toBeVisible();

  await page.route(`${apiUrl}/api/auth/login`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        data: null,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Identifiants invalides.",
        },
      }),
      contentType: "application/json",
      status: 401,
    });
  });

  const email = "browser-smoke@example.invalid";
  const password = "BrowserSmoke123";
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  const requestPromise = page.waitForRequest(
    (request) => request.url() === `${apiUrl}/api/auth/login`,
  );
  const submitButton = page.getByRole("button", { name: "Se connecter" });
  await submitButton.click();

  const request = await requestPromise;
  expect(request.method()).toBe("POST");
  expect(request.postDataJSON()).toEqual({ email, password });
  await expect(
    page.getByRole("alert").filter({ hasText: "Identifiants invalides." }),
  ).toHaveText("Identifiants invalides.");
  await expect(submitButton).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);
  expect(page.url()).not.toContain(email);
  expect(page.url()).not.toContain(password);

  await page.route(`${apiUrl}/api/auth/register`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        data: null,
        error: {
          code: "ACCOUNT_CONFLICT",
          message: "Impossible de creer ce compte.",
        },
      }),
      contentType: "application/json",
      status: 409,
    });
  });

  await page.goto("/register");
  const name = "Browser Smoke";
  const registrationEmail = "registration-smoke@example.invalid";
  const registrationPassword = "RegistrationSmoke123";
  await page.getByLabel("Nom complet").fill(name);
  await page.getByLabel("Email").fill(registrationEmail);
  await page.getByLabel("Mot de passe").fill(registrationPassword);
  const registrationRequestPromise = page.waitForRequest(
    (request) => request.url() === `${apiUrl}/api/auth/register`,
  );
  const registrationButton = page.getByRole("button", {
    name: "Creer le compte",
  });
  await registrationButton.click();

  const registrationRequest = await registrationRequestPromise;
  expect(registrationRequest.method()).toBe("POST");
  expect(registrationRequest.postDataJSON()).toEqual({
    email: registrationEmail,
    name,
    password: registrationPassword,
  });
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Impossible de creer ce compte." }),
  ).toHaveText("Impossible de creer ce compte.");
  await expect(registrationButton).toBeEnabled();
  await expect(page).toHaveURL(/\/register$/);
  expect(page.url()).not.toContain(registrationEmail);
  expect(page.url()).not.toContain(registrationPassword);
  expect(cspViolations).toEqual([]);
});

test("curation cards keep long content and actions within their bounds", async ({
  page,
}) => {
  const organization = {
    createdAt: "2026-07-16T10:00:00.000Z",
    id: "organization-1",
    name: "Horizon Local",
    ownerId: "user-1",
    role: "ADMIN",
    slug: "horizon-local",
  };
  const longToken = "contenu-sans-espace-".repeat(35);

  await page.context().addCookies([
    {
      name: "app_session",
      url: webUrl,
      value: "browser-smoke-session",
    },
  ]);
  await page.route(`${apiUrl}/api/auth/me`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        data: {
          user: {
            avatarUrl: null,
            email: "browser-smoke@example.invalid",
            id: "user-1",
            name: "Browser Smoke",
          },
        },
        error: null,
      }),
      contentType: "application/json",
    });
  });
  await page.route(`${apiUrl}/api/organizations`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        data: { organizations: [organization] },
        error: null,
      }),
      contentType: "application/json",
    });
  });
  await page.route(`${apiUrl}/api/onboarding`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        data: {
          activeOrganization: organization,
          advanced: null,
          completed: true,
          editorialContext: null,
          nextStep: "READY",
          organizations: [organization],
          user: { onboardingCompletedAt: "2026-07-16T10:00:00.000Z" },
        },
        error: null,
      }),
      contentType: "application/json",
    });
  });
  await page.route(
    `${apiUrl}/api/organizations/horizon-local/curation`,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          data: {
            canEdit: true,
            feeds: [],
            resources: [
              {
                createdAt: "2026-07-16T10:00:00.000Z",
                description: longToken,
                id: "resource-1",
                keyPoints: [longToken, longToken],
                organizationId: organization.id,
                publishedAt: null,
                sourceFeedId: null,
                sourceName: null,
                status: "NEW",
                summary: longToken,
                tags: [],
                title: `Ressource ${longToken}`,
                topic: longToken,
                type: "URL",
                updatedAt: "2026-07-16T10:00:00.000Z",
                url: `https://example.com/${longToken}`,
              },
            ],
            tags: [],
          },
          error: null,
        }),
        contentType: "application/json",
      });
    },
  );

  await page.goto("/app/horizon-local/curation");

  const resourceCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: /Ressource contenu-sans-espace/ }),
  });
  await expect(resourceCard).toBeVisible();
  const summarizeButton = resourceCard.getByRole("button", {
    name: "Resumer",
  });
  const generateButton = resourceCard.getByRole("button", {
    name: "Generer",
  });
  await expect(summarizeButton).toBeVisible();
  await expect(generateButton).toBeVisible();

  const bounds = await resourceCard.evaluate((card) => {
    const cardBounds = card.getBoundingClientRect();
    const inspectedElements = Array.from(
      card.querySelectorAll("a, button, [data-slot='badge']"),
    );

    return {
      card: { left: cardBounds.left, right: cardBounds.right },
      children: inspectedElements.map((element) => {
        const childBounds = element.getBoundingClientRect();
        return {
          left: childBounds.left,
          right: childBounds.right,
          text: element.textContent?.trim() ?? "",
        };
      }),
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(bounds.documentScrollWidth).toBeLessThanOrEqual(bounds.viewportWidth);
  for (const child of bounds.children) {
    expect(
      child.left,
      `${child.text} starts before the card`,
    ).toBeGreaterThanOrEqual(bounds.card.left - 1);
    expect(
      child.right,
      `${child.text} ends after the card`,
    ).toBeLessThanOrEqual(bounds.card.right + 1);
  }
});
