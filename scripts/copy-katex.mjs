import { cp, mkdir } from 'node:fs/promises';
const target = 'internal/rendering/static/vendor/katex';
await mkdir(target, { recursive: true });
for (const name of ['katex.min.js', 'katex.min.css', 'fonts']) {
  await cp(`node_modules/katex/dist/${name}`, `${target}/${name}`, { recursive: true });
}
await cp('node_modules/katex/LICENSE', `${target}/LICENSE`);
console.log('Copied pinned KaTeX assets and license for local serving.');
