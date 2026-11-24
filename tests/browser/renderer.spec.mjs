import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixture=JSON.parse(readFileSync('internal/rendering/fixtures/complex-numbers.json','utf8'));
test('mobile formulas, RTL and solutions remain usable',async({page,baseURL})=>{
 await page.setViewportSize({width:390,height:844});
 const external=[];page.on('request',r=>{if(new URL(r.url()).origin !== new URL(baseURL).origin)external.push(r.url());});
 await page.goto('/lesson');await expect(page.locator('.katex').first()).toBeVisible();
 expect(await page.evaluate(()=>window.learnooMetrics.errors)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByText('Voir la solution expliquée').click();await expect(page.locator('details')).toHaveAttribute('open','');
 await page.screenshot({path:'test-results/lesson-mobile.png',fullPage:true});
 await page.goto('/bidi');await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
 expect(await page.evaluate(()=>window.learnooMetrics.errors)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/bidi-mobile.png',fullPage:true});
 expect(external).toEqual([]);
});
test('malformed formulas have readable fallback',async({page})=>{
 await page.goto('/failure');await expect(page.locator('.math-error')).toBeVisible();
 await expect(page.getByText('Texte après l’erreur', {exact:false})).toBeVisible();
 expect(await page.evaluate(()=>window.learnooMetrics.errors)).toBe(1);
});
test('reader matches canonical preview and JSON can save/reopen',async({page,request})=>{
 const reader=await request.get('/lesson');const preview=await request.post('/preview',{data:fixture});expect(await preview.text()).toBe(await reader.text());
 await page.goto('/lab');const source=page.locator('#source');await expect(source).toHaveValue(/Nombres complexes/);
 await page.getByRole('button',{name:'Enregistrer sur cet appareil'}).click();await source.fill('{}');await page.getByRole('button',{name:'Recharger la sauvegarde'}).click();await expect(source).toHaveValue(/Nombres complexes/);
 await page.getByRole('button',{name:'Prévisualiser',exact:true}).click();await expect(page.locator('#lab-status')).toContainText('Aperçu généré');
 await expect(page.frameLocator('#preview-frame').locator('.katex').first()).toBeVisible();
 await source.fill('{bad json');await page.getByRole('button',{name:'Prévisualiser',exact:true}).click();await expect(page.locator('#lab-status')).toHaveClass('error');
});
test('math cannot introduce executable markup',async({page})=>{
 const doc=structuredClone(fixture);doc.blocks=[{type:'displayMath',text:'\\htmlClass{evil}{x}'},{type:'paragraph',children:[{type:'text',text:'<img src=x onerror=alert(1)>'}]}];
 await page.goto('/lab');await expect(page.locator('#source')).toHaveValue(/Nombres complexes/);await page.locator('#source').fill(JSON.stringify(doc));await page.getByRole('button',{name:'Prévisualiser',exact:true}).click();
 const frame=page.frameLocator('#preview-frame');await expect(frame.locator('.math-error')).toBeVisible();await expect(frame.locator('.evil')).toHaveCount(0);await expect(frame.locator('img')).toHaveCount(0);
});
test('TeX remains available if KaTeX cannot load',async({page})=>{
 await page.route('**/vendor/katex/katex.min.js',route=>route.abort());await page.goto('/lesson');await expect(page.locator('.math-error').first()).toBeVisible();await expect(page.locator('h1')).toContainText('Nombres complexes');
});
test('measure cold mobile payload and desktop rendering',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/lesson');await page.evaluate(()=>document.fonts.ready);await expect(page.locator('.katex').first()).toBeVisible();
 const metrics=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},math:window.learnooMetrics,resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,transferBytes:r.transferSize,encodedBytes:r.encodedBodySize,durationMs:r.duration})),navigation:performance.getEntriesByType('navigation').map(r=>({domContentLoadedMs:r.domContentLoadedEventEnd,transferBytes:r.transferSize}))}));
 await test.info().attach('mobile-metrics',{body:JSON.stringify(metrics,null,2),contentType:'application/json'});
 const {writeFileSync}=await import('node:fs');writeFileSync('test-results/mobile-metrics.json',JSON.stringify(metrics,null,2));
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/lesson-desktop.png',fullPage:true});
});

test('reader preserves inline punctuation, warning contrast roles and Arabic heading rhythm', async ({ browser, baseURL }) => {
 const context = await browser.newContext({ javaScriptEnabled: false });
 const page = await context.newPage();
 await page.goto(`${baseURL}/lesson`);
 const text = await page.locator('article p').first().textContent();
 expect(text).toContain('z=a+bi, où');
 expect(text).not.toContain('z=a+bi ,');
 const warning = await page.locator('.notice').evaluate(el => {
  const style=getComputedStyle(el);const root=getComputedStyle(document.documentElement);
  return { color:style.color, background:style.backgroundColor, token:root.getPropertyValue('--learnoo-color-warning-background').trim(), surface:root.getPropertyValue('--learnoo-color-surface').trim() };
 });
 expect(warning.token).not.toBe(warning.surface);
 expect(warning.color).not.toBe(warning.background);
 const link = page.getByRole('link', {name:'Leçon',exact:true});
 const normal = await link.evaluate(el => getComputedStyle(el).color);
 await link.hover();
 expect(await link.evaluate(el => getComputedStyle(el).color)).not.toBe(normal);
 await link.focus();
 expect(await link.evaluate(el => getComputedStyle(el).outlineWidth)).toBe('3px');
 await page.goto(`${baseURL}/bidi`);
 const heading = page.locator('h1:lang(ar)').first();
 const rhythm = await heading.evaluate(el => { const s=getComputedStyle(el); return parseFloat(s.lineHeight)/parseFloat(s.fontSize); });
 expect(rhythm).toBeCloseTo(1.25, 2);
 await context.close();
});
