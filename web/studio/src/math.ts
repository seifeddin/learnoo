// Formula typesetting for the Studio. It uses the same KaTeX version (pinned in
// the root and Studio package.json) and the same options as the reader's
// internal/rendering/static/math.js, so authors see what students will get.
// test/math.test.ts fails if the two drift apart.
import katex, { type KatexOptions } from 'katex';

/** Options shared with internal/rendering/static/math.js, apart from displayMode. */
export const KATEX_OPTIONS = {
  output: 'htmlAndMathml',
  trust: false,
  strict: 'error',
  throwOnError: true,
  maxExpand: 200,
  maxSize: 20,
  macros: {},
} as const satisfies KatexOptions;

export type TexResult = { ok: true; html: string } | { ok: false; error: string };

/**
 * Typesets TeX to HTML. KaTeX escapes the source and, with trust disabled,
 * never emits links, classes or other attributes taken from it, so the result
 * can be inserted as markup. Failures carry a French message for authors.
 */
export function renderTex(tex: string, displayMode: boolean): TexResult {
  try {
    // A fresh macros object per call: KaTeX may store \gdef definitions in it.
    return { ok: true, html: katex.renderToString(tex, { ...KATEX_OPTIONS, macros: {}, displayMode }) };
  } catch (error) {
    if (error instanceof katex.ParseError) {
      const where = typeof error.position === 'number' ? ` (position ${error.position})` : '';
      return { ok: false, error: `TeX invalide${where} : ${error.rawMessage}` };
    }
    return { ok: false, error: 'TeX invalide.' };
  }
}

const EMPTY = { inline: '∅', display: '∅ formule vide' };

/**
 * Fills a formula element: typeset when the TeX is valid; otherwise the TeX
 * itself, marked as an error with the same accessible label as the reader.
 */
export function paintFormula(el: HTMLElement, tex: string, displayMode: boolean) {
  el.classList.remove('math-error', 'math-empty');
  el.removeAttribute('aria-label');
  el.removeAttribute('title');
  if (tex === '') {
    el.classList.add('math-empty');
    el.textContent = displayMode ? EMPTY.display : EMPTY.inline;
    return;
  }
  const result = renderTex(tex, displayMode);
  if (result.ok) {
    el.innerHTML = result.html;
    el.title = 'Formule (TeX)';
  } else {
    el.textContent = tex;
    el.classList.add('math-error');
    el.setAttribute('aria-label', `Formule non rendue : ${tex}`);
    el.title = result.error;
  }
}
