import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";

test("invitation journey preserves the token through registration", async ({
  page,
}) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const adminEmail = `admin-${unique}@example.com`;
  const invitedEmail = `invitee-${unique}@example.com`;
  const organizationSlug = `invite-${unique}`;

  const registration = await page.request.post(`${apiUrl}/api/auth/register`, {
    data: {
      email: adminEmail,
      name: "Invitation Admin",
      password: "InvitationAdmin2026!",
    },
  });
  expect(registration.ok()).toBe(true);
  const organization = await page.request.post(`${apiUrl}/api/organizations`, {
    data: { name: "Invitation Team", slug: organizationSlug },
  });
  expect(organization.ok()).toBe(true);
  const invitation = await page.request.post(
    `${apiUrl}/api/organizations/${organizationSlug}/invitations`,
    { data: { email: invitedEmail, role: "EDITOR" } },
  );
  expect(invitation.ok()).toBe(true);
  const payload = (await invitation.json()) as {
    data: { previewUrl?: string };
  };
  expect(payload.data.previewUrl).toBeTruthy();

  await page.request.post(`${apiUrl}/api/auth/logout`);
  await page.goto(payload.data.previewUrl!);
  await expect(
    page.getByRole("heading", { name: "Rejoindre Invitation Team" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Créer un compte" }).click();
  await expect(page).toHaveURL(/\/register\?/);

  const registrationUrl = new URL(page.url());
  expect(registrationUrl.searchParams.get("email")).toBe(invitedEmail);
  expect(registrationUrl.searchParams.get("next")).toBe(
    new URL(payload.data.previewUrl!).pathname,
  );

  await page.getByLabel("Nom complet").fill("Invited Editor");
  await expect(page.getByLabel("Email")).toHaveValue(invitedEmail);
  await page.getByLabel("Mot de passe").fill("InvitationEditor2026!");
  await page.getByRole("button", { name: "Creer le compte" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/);

  const organizationsResponse = await page.request.get(
    `${apiUrl}/api/organizations`,
  );
  expect(organizationsResponse.ok()).toBe(true);
  const organizationsPayload = (await organizationsResponse.json()) as {
    data: { organizations: Array<{ role: string; slug: string }> };
  };
  expect(organizationsPayload.data.organizations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ role: "EDITOR", slug: organizationSlug }),
    ]),
  );
});
