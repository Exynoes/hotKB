import { expect, test } from '@playwright/test';

test.setTimeout(60_000);
test('un joueur affronte un bot et voit ses résultats (COURSE-01, BOT-01, RES-01)', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'fr-CA', viewport: { width: 1200, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('hotkb:lang', 'fr'));
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un compte' }).click();
  await page.getByPlaceholder("Nom d'utilisateur").fill(`race_${Date.now()}`.slice(0, 20));
  await page.getByPlaceholder('Mot de passe').fill('motdepasse1');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.getByRole('button', { name: 'Créer une salle', exact: true }).click();

  await page.getByLabel('Nombre de mots').fill('10');
  // Playwright ne peut taper que des caractères du clavier US : on retire accents et ponctuation
  await page.getByLabel('Accents').click();
  await expect(page.getByLabel('Accents')).not.toBeChecked();
  await page.getByLabel('Ponctuation').click();
  await expect(page.getByLabel('Ponctuation')).not.toBeChecked();
  // bonus coupés : un « +3 mots » allongerait le texte pendant que le test le tape
  await page.getByLabel('Bonus de remontée').click();
  await expect(page.getByLabel('Bonus de remontée')).not.toBeChecked();
  await page.getByLabel('Ajouter un bot').first().selectOption('impossible');
  await page.getByRole('button', { name: 'Ajouter un bot' }).click();
  await page.getByRole('button', { name: 'Démarrer la course' }).click();

  const box = page.getByTestId('typing-box');
  await expect(box).toBeVisible();
  await expect(page.getByTestId('lane')).toHaveCount(2);
  await expect(box).toHaveCSS('opacity', '1', { timeout: 10_000 }); // fin du décompte
  const text = (await box.textContent()) ?? '';
  expect(text.length).toBeGreaterThan(20);
  await box.focus();
  await page.keyboard.type(text, { delay: 60 });

  const heading = page.getByRole('heading', { name: 'Résultats' });
  await expect(heading).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
});
