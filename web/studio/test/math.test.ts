import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { FormulaField } from '../src/App';
import { KATEX_OPTIONS, renderTex } from '../src/math';
import { parseLesson, serializeLesson, type LessonDocument, type LessonNode } from '../src/schema/lesson';
import { createEditor, exportFrom, loadInto } from './helpers';

// Tests run from web/studio, like the golden-file test.
const read = (path: string) => readFileSync(resolve('../..', path), 'utf8');

const lesson = (blocks: LessonNode[]): LessonDocument =>
  parseLesson(JSON.stringify({ schemaVersion: 1, title: 'Test technique', language: 'fr', status: 'unreviewed', objective: '', blocks }));

const para = (...children: LessonNode[]): LessonNode => ({ type: 'paragraph', children });
const text = (value: string): LessonNode => ({ type: 'text', text: value });
const math = (tex: string): LessonNode => ({ type: 'math', text: tex });
const display = (tex: string): LessonNode => ({ type: 'displayMath', text: tex });

/** Loads blocks into a fresh editor; empty formulas cannot be imported, so they are inserted. */
function editorWith(blocks: LessonNode[]) {
  const editor = createEditor();
  loadInto(editor, lesson(blocks));
  return editor;
}

describe('same KaTeX as the reader', () => {
  it('uses the KaTeX version pinned for the reader', () => {
    const rootPinned = JSON.parse(read('package.json')).dependencies.katex;
    const studioPinned = JSON.parse(read('web/studio/package.json')).dependencies.katex;
    expect(studioPinned).toBe(rootPinned);
    expect(katex.version).toBe(rootPinned);
  });

  it('uses the options of internal/rendering/static/math.js', () => {
    const source = read('internal/rendering/static/math.js');
    const call = /katex\.render\(source, node, \{ displayMode: [^,]+, (.*?) \}\);/.exec(source);
    expect(call, 'katex.render call in math.js').not.toBeNull();
    const reader = Object.fromEntries([...call![1].matchAll(/(\w+): ('[^']*'|\{\}|[^,]+)/g)].map(([, key, value]) => [key, value]));
    const literal = (value: unknown) => (typeof value === 'string' ? `'${value}'` : typeof value === 'object' ? '{}' : String(value));
    const studio = Object.fromEntries(Object.entries(KATEX_OPTIONS).map(([key, value]) => [key, literal(value)]));
    expect(studio).toEqual(reader);
  });
});

describe('renderTex', () => {
  it('typesets valid TeX with MathML for assistive technology', () => {
    const result = renderTex('\\frac{1}{z}', false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain('class="katex"');
      expect(result.html).toContain('<math');
    }
  });

  it('reports invalid TeX in French with its position', () => {
    const result = renderTex('\\frac{1}{', false);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/^TeX invalide/) });
    expect(renderTex('\\undefinedcommand', true)).toEqual({ ok: false, error: expect.stringMatching(/^TeX invalide \(position \d+\) : /) });
  });

  it('applies strict mode like the reader', () => {
    // Non-Latin text in math mode is an error under strict: 'error'.
    expect(renderTex('x = عدد', false).ok).toBe(false);
  });

  it.each([
    ['\\href{javascript:alert(1)}{x}'],
    ['\\url{https://example.com}'],
    ['\\htmlClass{evil}{x}'],
    ['\\htmlId{evil}{x}'],
    ['\\htmlStyle{color:red}{x}'],
    ['\\htmlData{x=1}{x}'],
    ['\\includegraphics{https://example.com/x.png}'],
  ])('does not render untrusted command %s', (tex) => {
    const result = renderTex(tex, false);
    const html = result.ok ? result.html : result.error;
    expect(html).not.toMatch(/<a[\s>]|href=|<img|src=|id="evil"|class="[^"]*evil|data-x=|style="color:red/);
  });

  it('escapes markup written inside text', () => {
    const result = renderTex('\\text{<img src=x onerror=alert(1)><script>x</script>}', false);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.html).not.toMatch(/<img|<script/);
  });

  it('does not let \\gdef leak from one formula to the next', () => {
    expect(renderTex('\\gdef\\foo{1}\\foo', false).ok).toBe(true);
    expect(renderTex('\\foo', false).ok).toBe(false);
  });
});

describe('formulas in the editor', () => {
  it('typesets inline and display formulas', () => {
    const editor = editorWith([para(text('Soit '), math('z=3+2i')), display('\\frac{1}{2}')]);
    const dom = editor.view.dom;
    const inline = dom.querySelector('[data-type="inline-math"]')!;
    const block = dom.querySelector('[data-type="display-math"]')!;
    expect(inline.querySelector('.katex')).not.toBeNull();
    expect(block.querySelector('.katex-display')).not.toBeNull();
    expect(inline.getAttribute('data-latex')).toBe('z=3+2i');
    expect(inline.classList.contains('math-error')).toBe(false);
  });

  it('shows invalid TeX as text, flagged like the reader', () => {
    const editor = editorWith([para(math('\\frac{1}{')), display('\\nope')]);
    for (const el of editor.view.dom.querySelectorAll<HTMLElement>('[data-latex]')) {
      expect(el.classList.contains('math-error')).toBe(true);
      expect(el.textContent).toBe(el.dataset.latex);
      expect(el.getAttribute('aria-label')).toBe(`Formule non rendue : ${el.dataset.latex}`);
      expect(el.title).toMatch(/^TeX invalide/);
      expect(el.querySelector('.katex')).toBeNull();
    }
  });

  it('keeps the placeholder for an empty formula', () => {
    const editor = editorWith([para(text('x'))]);
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'displayMath', attrs: { latex: '' } });
    const block = editor.view.dom.querySelector<HTMLElement>('[data-type="display-math"]')!;
    expect(block.textContent).toBe('∅ formule vide');
    expect(block.classList.contains('math-empty')).toBe(true);
    expect(block.classList.contains('math-error')).toBe(false);
  });

  it('re-renders when the TeX changes and clears the error', () => {
    const editor = editorWith([display('\\frac{1}{')]);
    let pos = -1;
    editor.state.doc.descendants((node, at) => {
      if (node.type.name === 'displayMath') pos = at;
    });
    const block = () => editor.view.dom.querySelector<HTMLElement>('[data-type="display-math"]')!;
    expect(block().classList.contains('math-error')).toBe(true);
    editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'latex', '\\frac{1}{2}'));
    expect(block().classList.contains('math-error')).toBe(false);
    expect(block().getAttribute('aria-label')).toBeNull();
    expect(block().dataset.latex).toBe('\\frac{1}{2}');
    expect(block().querySelector('.katex-display')).not.toBeNull();
  });

  it('saves the TeX byte for byte, valid or not', () => {
    const doc = lesson([para(text('A '), { type: 'strong', children: [math('\\overline{z}')] }), display('\\frac{1}{'), display('\\sum_{k=0}^{n}  k \\quad x')]);
    const editor = createEditor();
    loadInto(editor, doc);
    const { document, errors } = exportFrom(editor, doc);
    expect(errors).toEqual([]);
    expect(serializeLesson(document)).toBe(serializeLesson(doc));
  });

  it('keeps formulas left-to-right inside right-to-left paragraphs', () => {
    const editor = editorWith([{ type: 'paragraph', lang: 'ar', dir: 'rtl', children: [text('العدد '), math('z=a+ib')] }]);
    const paragraph = editor.view.dom.querySelector('p')!;
    expect(paragraph.getAttribute('dir')).toBe('rtl');
    expect(paragraph.querySelector('[data-type="inline-math"]')!.getAttribute('dir')).toBe('ltr');
  });

  it('typesets a 100-formula document', () => {
    const blocks = Array.from({ length: 50 }, (_, i) => [para(text(`${i} `), math(`z_{${i}} = ${i} + ${i}i`)), display(`\\sum_{k=0}^{${i}} \\frac{k}{${i + 1}}`)]).flat();
    const started = performance.now();
    const editor = editorWith(blocks);
    const elapsed = performance.now() - started;
    expect(editor.view.dom.querySelectorAll('.katex')).toHaveLength(100);
    expect(editor.view.dom.querySelectorAll('.math-error')).toHaveLength(0);
    // Generous bound for slow CI; typically well under a second in jsdom.
    expect(elapsed).toBeLessThan(5000);
  });
});

describe('FormulaField', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const mount = (tex: string, displayMode = false) => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createRoot(host);
    act(() => app.render(createElement(FormulaField, { label: 'Formule (TeX)', tex, display: displayMode, onChange: () => {} })));
    return {
      host,
      cleanup: () => {
        act(() => app.unmount());
        host.remove();
      },
    };
  };

  it('previews valid TeX', () => {
    const { host, cleanup } = mount('\\frac{1}{2}', true);
    expect(host.querySelector('.tex-rendered .katex-display')).not.toBeNull();
    expect(host.querySelector('textarea')!.getAttribute('aria-invalid')).toBe('false');
    cleanup();
  });

  it('shows the error under the field and marks it invalid', () => {
    const { host, cleanup } = mount('\\frac{1}{');
    const textarea = host.querySelector('textarea')!;
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    const preview = document.getElementById(textarea.getAttribute('aria-describedby')!)!;
    expect(preview.querySelector('.tex-error')!.textContent).toMatch(/^TeX invalide/);
    expect(preview.querySelector('.katex')).toBeNull();
    cleanup();
  });

  it('prompts for an empty formula', () => {
    const { host, cleanup } = mount('');
    expect(host.querySelector('.tex-preview .hint')).not.toBeNull();
    expect(host.querySelector('textarea')!.getAttribute('aria-invalid')).toBe('false');
    cleanup();
  });
});
