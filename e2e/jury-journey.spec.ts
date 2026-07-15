import { expect, test } from "@playwright/test";

test("jury journey: account to planned content", async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `jury-${unique}@example.com`;
  const organizationSlug = `jury-${unique}`;

  await page.goto("/register");
  await page.getByLabel("Nom complet").fill("Jury Demo");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("JuryContent2026!");
  await page.getByRole("button", { name: "Creer le compte" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding/);

  await page.getByLabel("Nom de l'organisation").fill("Organisation Jury");
  await page.getByLabel("Slug public").fill(organizationSlug);
  await page.getByRole("button", { name: "Creer et continuer" }).click();

  await page.getByLabel("Secteur").fill("SaaS B2B");
  await page.getByLabel("Audience cible").fill("Responsables marketing");
  await page.getByLabel("Ton").fill("Expert, clair et concret");
  await page
    .getByLabel("Thematiques principales")
    .fill("IA, contenu, planification");
  await page
    .getByLabel("Positionnement")
    .fill("Atelier editorial pour equipes B2B");
  await page.getByRole("button", { name: "Enregistrer le contexte" }).click();
  await expect(
    page.getByRole("heading", { name: /est pret pour le MVP/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Terminer et ouvrir le dashboard" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/app/${organizationSlug}/dashboard`),
  );

  await page.goto(`/app/${organizationSlug}/ideas/generate`);
  await page
    .getByLabel("Brief court")
    .fill("Proposer des idees sur un calendrier editorial assiste par IA.");
  await page.getByRole("button", { name: "Generer des idees" }).click();
  await expect(page.getByText("Idees a selectionner")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder" }).first().click();
  await expect(
    page.getByRole("link", { name: "Transformer" }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Transformer" }).first().click();
  await expect(page).toHaveURL(/\/contents\/generate\?ideaId=/);
  await page.getByRole("button", { name: "Generer", exact: true }).click();
  const generatedTitle = page.getByLabel("Titre");
  await expect(generatedTitle).not.toHaveValue("");
  const title = await generatedTitle.inputValue();
  await page.getByRole("button", { name: "Sauvegarder" }).click();
  await expect(page).toHaveURL(/\/contents\/[a-f0-9-]+$/);

  await page.goto(`/app/${organizationSlug}/history`);
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();

  await page.goto(`/app/${organizationSlug}/calendar`);
  const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 16);
  await page.getByLabel("Date").fill(scheduledAt);
  await page.getByRole("button", { name: "Planifier", exact: true }).click();
  await expect(page.getByText("Planification creee.")).toBeVisible();
});
