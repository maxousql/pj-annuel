import { expect, type Locator, type Page, test } from "@playwright/test";

test("jury journey: account to planned content", async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `jury-${unique}@example.com`;
  const organizationSlug = `jury-${unique}`;

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/register");
  await page.getByLabel("Nom complet").fill("Jury Demo");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("JuryContent2026!");
  await page.getByRole("button", { name: "Creer le compte" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding/);

  await page.getByLabel("Nom de l'organisation").fill("Organisation Jury");
  await page.getByLabel("Slug public").fill(organizationSlug);
  await page.getByRole("button", { name: "Créer et continuer" }).click();

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
    page.getByRole("heading", { name: /est prêt à être utilisé/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Terminer et ouvrir le dashboard" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/app/${organizationSlug}/dashboard`),
  );

  const accountLink = page.getByRole("link", {
    name: "Ouvrir les paramètres du compte",
  });
  await expect(accountLink.getByText("Administrateur")).toBeVisible();
  await accountLink.click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Votre espace, à votre image." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Votre empreinte éditoriale" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sécurité du compte" }),
  ).toBeVisible();
  await expect(
    page.getByText("Organisation Jury", { exact: true }),
  ).toBeVisible();

  await page.goto(`/app/${organizationSlug}/notifications`);
  await expectTabsInsideTrack(page.getByRole("tablist"), page.getByRole("tab"));

  await page.goto(`/app/${organizationSlug}/ideas`);
  await expectTabsInsideTrack(page.getByRole("tablist"), page.getByRole("tab"));
  await page.getByRole("tab", { name: "Découvrir" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Des idées choisies pour votre organisation",
    }),
  ).toBeVisible();
  const discoveryCard = page.getByTestId("idea-discovery-card");
  const discoveryStack = page.getByTestId("idea-discovery-card-stack");
  const swipeHints = page.getByTestId("idea-discovery-swipe-hints");
  await expectVerticalGap(discoveryStack, swipeHints, 8);
  const candidateId = await discoveryCard.getAttribute("data-candidate-id");
  const cardBox = await discoveryCard.boundingBox();
  expect(cardBox).not.toBeNull();

  if (!cardBox || !candidateId) {
    throw new Error("Discovery card is missing its swipe geometry.");
  }

  await dragCandidate(page, discoveryCard, 40);
  await expect(discoveryCard).toHaveAttribute("data-candidate-id", candidateId);
  await expect
    .poll(async () => (await discoveryCard.boundingBox())?.x)
    .toBeCloseTo(cardBox.x, 0);

  await dragCandidate(page, discoveryCard, Math.min(180, cardBox.width * 0.4));
  const nextDiscoveryCard = page.locator(
    `[data-testid="idea-discovery-card"]:not([data-candidate-id="${candidateId}"])`,
  );
  await expect(nextDiscoveryCard).toBeVisible();
  const rejectedCandidateId =
    await nextDiscoveryCard.getAttribute("data-candidate-id");
  expect(rejectedCandidateId).not.toBeNull();

  await dragCandidate(page, nextDiscoveryCard, -180);
  await expect(
    page.locator(
      `[data-testid="idea-discovery-card"][data-candidate-id="${rejectedCandidateId}"]`,
    ),
  ).toHaveCount(0);
  await expect(
    page.locator(
      `[data-testid="idea-discovery-card"][data-candidate-id="${candidateId}"]`,
    ),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Créer et gérer" }).click();
  await expect(
    page.getByRole("link", { name: "Transformer" }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Transformer" }).first().click();
  await expect(page).toHaveURL(/\/contents\/generate\?ideaId=/);
  await page.getByRole("button", { name: "Générer", exact: true }).click();
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

async function expectTabsInsideTrack(tablist: Locator, tabs: Locator) {
  await expect(tablist).toBeVisible();
  const trackBox = await tablist.boundingBox();
  expect(trackBox).not.toBeNull();

  if (!trackBox) return;

  const tabCount = await tabs.count();
  for (let index = 0; index < tabCount; index += 1) {
    const tabBox = await tabs.nth(index).boundingBox();
    expect(tabBox).not.toBeNull();

    if (!tabBox) continue;

    expect(tabBox.y).toBeGreaterThanOrEqual(trackBox.y - 1);
    expect(tabBox.y + tabBox.height).toBeLessThanOrEqual(
      trackBox.y + trackBox.height + 1,
    );
  }
}

async function expectVerticalGap(
  upperElement: Locator,
  lowerElement: Locator,
  minimumGap: number,
) {
  const upperBox = await upperElement.boundingBox();
  const lowerBox = await lowerElement.boundingBox();
  expect(upperBox).not.toBeNull();
  expect(lowerBox).not.toBeNull();

  if (!upperBox || !lowerBox) return;

  expect(lowerBox.y - (upperBox.y + upperBox.height)).toBeGreaterThanOrEqual(
    minimumGap,
  );
}

async function dragCandidate(
  page: Page,
  card: Locator,
  horizontalDelta: number,
) {
  await card.scrollIntoViewIfNeeded();
  const cardBox = await card.boundingBox();

  if (!cardBox) {
    throw new Error("Discovery card is missing its swipe geometry.");
  }

  const viewport = page.viewportSize();
  const visibleStart = {
    x: cardBox.x + cardBox.width / 2,
    y: Math.min(
      Math.max(cardBox.y + Math.min(140, cardBox.height / 4), 80),
      (viewport?.height ?? 720) - 80,
    ),
  };
  await page.mouse.move(visibleStart.x, visibleStart.y);
  await page.mouse.down();
  await page.mouse.move(visibleStart.x + horizontalDelta, visibleStart.y, {
    steps: 8,
  });
  await page.mouse.up();
}
