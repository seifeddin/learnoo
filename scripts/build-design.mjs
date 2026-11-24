import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const tokens = JSON.parse(await readFile(new URL('web/design/tokens.json', root), 'utf8'));
const namespaces = { color: 'color', font: 'font', text: 'text', leading: 'leading', weight: 'font-weight', space: 'spacing', radius: 'radius', width: 'container', size: 'spacing' };
const variables = [], theme = [];
for (const [group, entries] of Object.entries(tokens)) {
  if (!namespaces[group]) throw new Error(`Unknown token group: ${group}`);
  for (const [name, value] of Object.entries(entries)) {
    if (!/^[a-z0-9-]+$/.test(name) || typeof value !== 'string' || /[;{}\n]/.test(value)) throw new Error(`Invalid token: ${group}.${name}`);
    const key = `--learnoo-${group}-${name}`;
    variables.push(`  ${key}: ${value};`);
    theme.push(`  --${namespaces[group]}-${name}: var(${key});`);
  }
}
const banner = '/* Generated from web/design/tokens.json. Run npm run design:build; do not edit. */\n';
const css = `${banner}:root {\n${variables.join('\n')}\n}\n`;
const tailwind = `${banner}@import "./tokens.css";\n\n@theme inline {\n${theme.join('\n')}\n}\n`;
const outputs = new Map([
  ['web/design/tokens.css', css],
  ['web/design/tailwind.css', tailwind],
  ['internal/rendering/static/tokens.css', css],
]);
for (const [path, content] of outputs) {
  const url = new URL(path, root);
  if (process.argv.includes('--check')) {
    const existing = await readFile(url, 'utf8').catch(() => '');
    if (existing !== content) throw new Error(`${path} is stale. Run npm run design:build.`);
  } else {
    await mkdir(fileURLToPath(new URL('.', url)), { recursive: true });
    await writeFile(url, content);
  }
}
console.log(process.argv.includes('--check') ? 'Design exports match source tokens.' : 'Generated CSS variables, Tailwind theme and embedded reader tokens.');
