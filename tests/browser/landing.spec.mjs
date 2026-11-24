import { test, expect } from '@playwright/test';

test('future catalogue filters, empty states and preview dialogs work', async ({ page, baseURL }) => {
  const external = [];
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL).origin) external.push(request.url()); });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  await expect(page.locator('[data-course]:visible')).toHaveCount(8);
  await page.getByRole('button', { name: 'Sciences informatiques', exact: true }).click();
  await expect(page.locator('[data-course]:visible')).toHaveCount(4);
  await page.getByRole('button', { name: 'Physique', exact: true }).click();
  await expect(page.locator('.empty')).toBeVisible();
  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click();
  await page.getByRole('searchbox').fill('genetique');
  await expect(page.locator('[data-course]:visible')).toHaveCount(1);
  await expect(page.locator('[data-course]:visible')).toContainText('La génétique humaine');
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: /Les nombres complexes/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ouvrir l’exemple technique non relu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'S’inscrire', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('aucune donnée personnelle');
  await expect(page.locator('#demo-link')).not.toBeVisible();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: `test-results/landing-${width}.png`, fullPage: true });
      await page.screenshot({ path: `test-results/landing-viewport-${width}.png` });
    }
  }
  expect(external).toEqual([]);
});

test('catalogue remains readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator('[data-course]')).toHaveCount(8);
  await page.getByRole('link', { name: 'Ouvrir l’exemple technique de mathématiques' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nombres complexes');
  await context.close();
});

test('landing uses the shared palette and a lightweight local wordmark', async ({ page, request }) => {
  await page.goto('/');
  const logo = await request.get('/static/learnoo-wordmark.webp');
  expect(logo.ok()).toBe(true);
  expect((await logo.body()).length).toBeLessThan(20000);
  await expect(page.locator('.wordmark').first()).toBeVisible();
  const button=page.getByRole('link', { name: 'Choisir ma section' });
  const normal=await button.evaluate(el=>getComputedStyle(el).color);
  await button.hover();
  expect(await button.evaluate(el=>getComputedStyle(el).color)).not.toBe(normal);
  expect(await page.locator('link[rel=stylesheet]').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).not.toContain('/static/reference.css');
});
