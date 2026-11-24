import { test, expect } from '@playwright/test';
import { studioURL } from '../../playwright.config.mjs';

const json = page => page.getByTestId('exported-json');
const status = page => page.locator('#studio-status');
const loadExample = (page, label) => page.getByLabel('Charger un exemple technique').selectOption({ label });
async function preview(page) {
  await page.getByRole('button', { name: 'Prévisualiser avec le renderer Go' }).click();
  await expect(status(page)).toContainText('Aperçu généré');
  return page.locator('#preview-frame').getAttribute('srcdoc');
}

test('Studio preview of each fixture equals the reader page', async ({ page, request }) => {
  const external = [];
  page.on('request', r => { const o = new URL(r.url()).origin; if (o !== studioURL) external.push(r.url()); });
  await page.goto(studioURL);
  for (const [label, route] of [['Nombres complexes (non relu)', '/lesson'], ['Test arabe/français (RTL)', '/bidi'], ['Formule invalide (test d’échec)', '/failure']]) {
    await loadExample(page, label);
    expect(await preview(page), route).toBe(await (await request.get(route)).text());
  }
  const frame = page.frameLocator('#preview-frame');
  await expect(frame.locator('.math-error')).toBeVisible();
  await expect(frame.getByText('Texte après l’erreur', { exact: false })).toBeVisible();
  await loadExample(page, 'Test arabe/français (RTL)');
  await preview(page);
  await expect(frame.locator('.katex').first()).toBeVisible();
  await expect(frame.locator('p[dir="rtl"]').first()).toBeVisible();
  expect(external).toEqual([]);
});

test('keyboard entry, save and reopen preserve text, marks, math and direction', async ({ page }) => {
  await page.goto(studioURL);
  await page.getByLabel('Titre', { exact: true }).fill('Saisie clavier — test technique');
  const editor = page.getByRole('textbox', { name: 'Contenu de la leçon' });
  await editor.click();
  await page.keyboard.type('Texte ');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type('gras');
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type(' avec $z=3+2i$ fin.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('فقرة');
  await page.getByLabel('Langue du paragraphe').selectOption('ar');
  await editor.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('$$ ');
  await page.getByLabel('Formule centrée (TeX)').fill('\\frac{1}{2}');
  await page.getByRole('button', { name: 'Enregistrer sur cet appareil' }).click();
  await expect(status(page)).toContainText('Enregistré sur cet appareil');
  await page.locator('.json-output summary').click();
  const saved = JSON.parse(await json(page).textContent());
  expect(saved.blocks).toEqual([
    { type: 'paragraph', children: [{ type: 'text', text: 'Texte ' }, { type: 'strong', children: [{ type: 'text', text: 'gras' }] }, { type: 'text', text: ' avec ' }, { type: 'math', text: 'z=3+2i' }, { type: 'text', text: ' fin.' }] },
    { type: 'paragraph', lang: 'ar', dir: 'rtl', children: [{ type: 'text', text: 'فقرة' }] },
    { type: 'displayMath', text: '\\frac{1}{2}' },
  ]);

  await page.reload();
  await page.getByRole('button', { name: 'Rouvrir la sauvegarde' }).click();
  await expect(status(page)).toContainText('Sauvegarde rouverte');
  await expect(page.getByLabel('Titre', { exact: true })).toHaveValue('Saisie clavier — test technique');
  await page.getByRole('button', { name: 'Enregistrer sur cet appareil' }).click();
  await page.locator('.json-output summary').click();
  expect(JSON.parse(await json(page).textContent())).toEqual(saved);
  await preview(page);
  await expect(page.frameLocator('#preview-frame').locator('.katex')).toHaveCount(2);
});

test('invalid import is refused and the current document is kept', async ({ page }) => {
  await page.goto(studioURL);
  await loadExample(page, 'Test arabe/français (RTL)');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importer un JSON' }).click();
  await (await chooser).setFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":1,"title":"x","language":"fr","status":"unreviewed","objective":"","blocks":[{"type":"html","text":"<script>"}]}') });
  await expect(status(page)).toContainText('Import refusé');
  await expect(page.getByRole('textbox', { name: 'Contenu de la leçon' })).toContainText('نكتب العدد المركّب');
});

test('an import that is too large once formatted is refused without touching the document', async ({ page }) => {
  // Compact JSON under 128 KiB (accepted by Go) whose formatted export would exceed the limit.
  const blocks = Array.from({ length: 240 }, (_, i) => ({ type: 'paragraph', children: [{ type: 'text', text: `${i} ${'x'.repeat(440)}` }] }));
  const source = JSON.stringify({ schemaVersion: 1, title: 'Taille limite — test technique', language: 'fr', status: 'unreviewed', objective: '', blocks });
  expect(Buffer.byteLength(source)).toBeLessThan(128 << 10);
  await page.goto(studioURL);
  await loadExample(page, 'Test arabe/français (RTL)');
  const editor = page.getByRole('textbox', { name: 'Contenu de la leçon' });
  const before = await editor.innerHTML();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importer un JSON' }).click();
  await (await chooser).setFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.from(source) });
  await expect(status(page)).toContainText('Import refusé');
  expect(await editor.innerHTML()).toBe(before);
  await expect(page.getByLabel('Titre', { exact: true })).toHaveValue(/اختبار اتجاه الكتابة/);
});

test('pasting HTML strips unsupported markup and reports it', async ({ page }) => {
  await page.goto(studioURL);
  await page.getByRole('textbox', { name: 'Contenu de la leçon' }).click();
  await page.evaluate(() => {
    window.pwned = false;
    const data = new DataTransfer();
    data.setData('text/html', '<p>Collé <em>ici</em><img src="x" onerror="window.pwned=true"><script>window.pwned=true</script></p>');
    data.setData('text/plain', 'Collé ici');
    document.querySelector('.studio-editor').dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(page.locator('.paste-notice')).toContainText('image externe');
  await expect(page.locator('.paste-notice')).toContainText('script');
  await expect(page.getByRole('textbox', { name: 'Contenu de la leçon' })).toContainText('Collé ici');
  expect(await page.evaluate(() => window.pwned)).toBe(false);
});

test('Studio is usable at phone width and in an Arabic document', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studioURL);
  await loadExample(page, 'Test arabe/français (RTL)');
  await expect(page.locator('.editor-frame')).toHaveAttribute('dir', 'rtl');
  // Formulas are typeset in the editor with KaTeX's fonts, not the Arabic text font.
  const formula = page.getByRole('textbox', { name: 'Contenu de la leçon' }).locator('[data-type="inline-math"] .katex').first();
  await expect(formula).toBeVisible();
  expect(await formula.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('KaTeX');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/studio-mobile-rtl.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/studio-desktop.png', fullPage: true });
});
