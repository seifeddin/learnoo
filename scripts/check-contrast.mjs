import { readFileSync } from 'node:fs';
const c = JSON.parse(readFileSync(new URL('../web/design/tokens.json', import.meta.url))).color;
function luminance(hex) {
  const linear = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return linear.reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
const pairs = [];
for (const fg of ['ink', 'muted', 'brand', 'brand-hover']) {
  for (const bg of ['canvas', 'surface', 'surface-subtle', 'panel', 'brand-soft']) pairs.push([fg, bg, 4.5]);
}
pairs.push(['on-brand','brand',4.5],['on-brand','brand-hover',4.5],['warning-text','warning-background',4.5],['accent','surface',4.5],['danger','danger-soft',4.5],['success-text','success-background',4.5],['on-inverse','inverse',4.5],['inverse-muted','inverse',4.5]);
for (const bg of ['canvas','surface','surface-subtle','panel']) {
  pairs.push(['control-border',bg,3],['focus',bg,3]);
}
let minimum = Infinity;
for (const [fg,bg,required] of pairs) {
  const [lo,hi] = [luminance(c[fg]),luminance(c[bg])].sort((a,b) => a-b);
  const ratio = (hi+.05)/(lo+.05);
  if (ratio < required) throw new Error(`${fg} on ${bg}: ${ratio.toFixed(2)}:1; requires ${required}:1`);
  minimum = Math.min(minimum,ratio);
}
if (c.brand === c['brand-hover']) throw new Error('Normal and hover actions must be distinct');
console.log(`${pairs.length} contrast pairs pass; lowest ratio ${minimum.toFixed(2)}:1.`);
