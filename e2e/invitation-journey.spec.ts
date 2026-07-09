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
  await page.getByRole("link", { name: "Creer le compte invite" }).click();
  await expect(page).toHaveURL(/\/register\?next=%2Finvite%2F/);

  await page.getByLabel("Nom complet").fill("Invited Editor");
  await page.getByLabel("Email").fill(invitedEmail);
  await page.getByLabel("Mot de passe").fill("InvitationEditor2026!");
  await page.getByRole("button", { name: "Creer le compte" }).click();
  await expect(page).toHaveURL(/\/invite\/[A-Za-z0-9_-]+$/);
  await page.getByRole("button", { name: "Accepter l'invitation" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/app/${organizationSlug}/dashboard$`),
  );
});
