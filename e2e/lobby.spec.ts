import { expect, test, type Browser } from '@playwright/test';

async function newPlayer(browser: Browser) {
  const context = await browser.newContext({ locale: 'fr-CA' });
  await context.addInitScript(() => {
    if (!localStorage.getItem('hotkb:lang')) localStorage.setItem('hotkb:lang', 'fr');
  });
  const page = await context.newPage();
  await page.goto('/');
  return page;
}

test('un compte crée une salle, un invité la rejoint par code (TEST-03, SALLE-01/02, JOIN-01)', async ({ browser }) => {
  const username = `e2e_${Date.now()}`.slice(0, 20);

  // Hôte : inscription par nom d'utilisateur + mot de passe (OAuth inutilisable en e2e)
  const host = await newPlayer(browser);
  await host.getByRole('button', { name: 'Créer un compte' }).click();
  await host.getByPlaceholder("Nom d'utilisateur").fill(username);
  await host.getByPlaceholder('Mot de passe').fill('motdepasse1');
  await host.getByRole('button', { name: 'Créer mon compte' }).click();
  await host.getByRole('button', { name: 'Créer une salle', exact: true }).click();
  await expect(host.getByText('CODE DE LA SALLE')).toBeVisible();
  const code = (await host.locator('p.font-mono.font-bold').innerText()).trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); // 6 caractères, sans 0/O/1/I

  // Invité : ne peut pas créer de salle (AUTH-03) mais rejoint par code
  const guest = await newPlayer(browser);
  await guest.getByPlaceholder('Ton nom affiché').fill('Invite');
  await guest.getByRole('button', { name: 'Jouer en invité' }).click();
  await expect(guest.getByText('Connecte-toi avec un compte pour créer une salle.')).toBeVisible();
  await expect(guest.getByRole('button', { name: 'Créer une salle', exact: true })).toHaveCount(0);
  await guest.getByPlaceholder('Code de la salle').fill(code);
  await guest.getByRole('button', { name: 'Rejoindre' }).click();

  // Mise à jour en temps réel chez l'hôte, puis démarrage possible (COURSE-02)
  await expect(host.getByText('Invite')).toBeVisible();
  await expect(host.getByRole('button', { name: 'Démarrer la course' })).toBeEnabled();
});

test('la langue et le thème se changent et sont conservés (I18N-02, DES-05)', async ({ browser }) => {
  const page = await newPlayer(browser);
  await expect(page.getByRole('button', { name: 'Jouer en invité' })).toBeVisible();

  await page.getByLabel('Changer de langue / Switch language').click();
  await expect(page.getByRole('button', { name: 'Play as guest' })).toBeVisible();

  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByLabel('Changer de thème / Toggle theme').click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);

  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after);
  await expect(page.getByRole('button', { name: 'Play as guest' })).toBeVisible();
});
