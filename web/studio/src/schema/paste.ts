// Pasted HTML is parsed into an inert document, stripped of anything the lesson
// schema cannot hold, and summarised so the author sees what was removed.
// Supported text is never removed: unsupported formatting is unwrapped, not deleted.
import { ALLOWED_IMAGES } from './lesson';

export interface PasteReport {
  /** Elements removed with their content (scripts, embeds, external images…). */
  removed: string[];
  /** Formatting removed while its text was kept (italics, links, tables…). */
  unwrapped: string[];
}

const REMOVE = new Set(['script', 'style', 'template', 'iframe', 'object', 'embed', 'video', 'audio', 'canvas', 'svg', 'form', 'input', 'button', 'select', 'textarea', 'link', 'meta', 'noscript']);
// Elements the schema parses (see extensions.ts) or that only group content.
const KNOWN = new Set(['html', 'head', 'body', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'b', 'span', 'bdi', 'div', 'section', 'details', 'summary', 'figure', 'figcaption', 'img', 'br', 'math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'mfrac', 'msqrt', 'mtext', 'mspace', 'mover', 'munder', 'mstyle', 'mpadded', 'mtable', 'mtr', 'mtd', 'msubsup', 'mroot']);

export function sanitizePastedHTML(html: string): { html: string; report: PasteReport } {
  const report: PasteReport = { removed: [], unwrapped: [] };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    if (!el.isConnected) continue;
    const tag = el.localName;
    if (REMOVE.has(tag)) {
      // KaTeX draws some glyphs with SVG; the formula itself comes from its TeX annotation.
      if (!(tag === 'svg' && el.closest('.katex'))) report.removed.push(tag);
      el.remove();
    } else if (tag === 'img' && !(ALLOWED_IMAGES as readonly string[]).includes(el.getAttribute('src') ?? '')) {
      report.removed.push('image externe');
      el.remove();
    } else if (!KNOWN.has(tag) && !el.closest('.katex')) {
      report.unwrapped.push(tag);
    }
    // Event handlers and styles never reach the editor, which ignores them anyway.
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || attr.name === 'style') el.removeAttribute(attr.name);
    }
  }
  return { html: doc.body.innerHTML, report };
}

export function describePaste(report: PasteReport): string | null {
  const unique = (list: string[]) => Array.from(new Set(list)).join(', ');
  const parts: string[] = [];
  if (report.removed.length) parts.push(`${report.removed.length} élément(s) non pris en charge retiré(s) (${unique(report.removed)})`);
  if (report.unwrapped.length) parts.push(`mise en forme ignorée, texte conservé (${unique(report.unwrapped)})`);
  return parts.length ? `Collage nettoyé : ${parts.join(' ; ')}.` : null;
}
