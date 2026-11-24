import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../src/fixtures';
import { serializeLesson, parseLesson } from '../src/schema/lesson';
import { reopenDraft, saveDraft } from '../src/schema/storage';
import { createEditor, exportFrom, loadInto, roundTrip, type } from './helpers';

describe('fixture round trip', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.id}: import → editor → export is identical`, () => {
      const { result } = roundTrip(fixture.source);
      expect(result.errors).toEqual([]);
      expect(result.document).toEqual(JSON.parse(fixture.source));
      expect(serializeLesson(result.document)).toBe(JSON.stringify(JSON.parse(fixture.source), null, 2));
    });
  }

  it('save/reopen through local storage preserves the document', () => {
    const fixture = FIXTURES.find((f) => f.id === 'bidi')!;
    const doc = parseLesson(fixture.source);
    const editor = createEditor();
    loadInto(editor, doc);
    saveDraft(exportFrom(editor, doc).document);
    editor.destroy();

    const reopened = reopenDraft();
    expect(reopened).not.toBeNull();
    const second = createEditor();
    loadInto(second, reopened!);
    expect(exportFrom(second, reopened!).document).toEqual(doc);
    second.destroy();
  });
});

describe('editing produces the restricted format', () => {
  // Content authored through editor commands and typed input, covering every
  // supported construct. The export is committed as a golden file, which the
  // Go suite (internal/rendering/studio_contract_test.go) validates and renders.
  const GOLDEN = resolve('test/golden/studio-features.json');
  const meta = { title: 'Fonctionnalités de l’éditeur — test technique', language: 'fr' as const, objective: 'Document technique non relu, sans contenu pédagogique.' };

  function author() {
    const editor = createEditor();
    const c = () => editor.chain().focus();
    type(editor, 'Titre de test');
    c().toggleNode('heading', 'paragraph').run();
    c().splitBlock().run();
    type(editor, 'Texte avec ');
    c().toggleBold().run();
    type(editor, 'gras');
    c().toggleBold().run();
    type(editor, ', formule $a^2+b^2$ et ');
    c().setMark('lang', { lang: 'ar', dir: 'rtl' }).run();
    type(editor, 'ملاحظة');
    c().unsetMark('lang').run();
    type(editor, '.');
    c().splitBlock().run();
    type(editor, '$$ ');
    // "$$ " replaced the empty paragraph with a display formula; fill it as the inspector would.
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'displayMath' && !node.attrs.latex) editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'latex', '\\frac{1}{2}'));
    });
    c().insertContent({ type: 'paragraph', attrs: { lang: 'ar', dir: 'rtl' }, content: [{ type: 'text', text: 'فقرة بالعربية مع ' }, { type: 'inlineMath', attrs: { latex: 'z=3+2i' } }] }).run();
    c().insertContent({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'premier' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }] }] }).run();
    c().insertContent({ type: 'callout', attrs: { title: 'Encadré technique' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Note.' }] }] }).run();
    c().insertContent({ type: 'exercise', attrs: { title: 'Exercice technique' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Question.' }] }, { type: 'solution', content: [{ type: 'displayMath', attrs: { latex: 'x=1' } }] }] }).run();
    c().insertContent({ type: 'image', attrs: { src: '/static/complex-plane.svg', alt: 'Diagramme de test' } }).run();
    c().insertContent({ type: 'youtube', attrs: { title: 'Vidéo à choisir', videoId: '' } }).run();
    return editor;
  }

  it('matches the committed golden export', () => {
    const editor = author();
    const { document, errors } = exportFrom(editor, meta);
    expect(errors).toEqual([]);
    const json = serializeLesson(document) + '\n';
    if (process.env.UPDATE_GOLDEN) writeFileSync(GOLDEN, json);
    expect(json).toBe(readFileSync(GOLDEN, 'utf8'));
    // Typed $…$ became math, bold became strong, and the Arabic span kept its direction.
    expect(document.blocks[1]).toEqual({
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Texte avec ' },
        { type: 'strong', children: [{ type: 'text', text: 'gras' }] },
        { type: 'text', text: ', formule ' },
        { type: 'math', text: 'a^2+b^2' },
        { type: 'text', text: ' et ' },
        { type: 'text', text: 'ملاحظة', lang: 'ar', dir: 'rtl' },
        { type: 'text', text: '.' },
      ],
    });
  });

  it('re-importing an export is stable', () => {
    const editor = author();
    const first = exportFrom(editor, meta).document;
    const second = roundTrip(serializeLesson(first)).result;
    expect(second.errors).toEqual([]);
    expect(second.document).toEqual(first);
  });

  it('a formula typed while bold is on stays bold', () => {
    const editor = createEditor();
    type(editor, 'Avant ');
    editor.chain().focus().toggleBold().run();
    type(editor, 'gras $x^2$ fin');
    editor.chain().toggleBold().setMark('lang', { lang: 'ar', dir: 'rtl' }).run();
    type(editor, ' $y$');
    expect(exportFrom(editor, meta).document.blocks).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'Avant ' },
          { type: 'strong', children: [{ type: 'text', text: 'gras ' }, { type: 'math', text: 'x^2' }, { type: 'text', text: ' fin' }] },
          // The language mark is not allowed on math: the formula stays LTR and plain.
          { type: 'text', text: ' ', lang: 'ar', dir: 'rtl' },
          { type: 'math', text: 'y' },
        ],
      },
    ]);
    editor.destroy();
  });

  it('canonicalises nested strong and adjacent text without losing content', () => {
    const source = JSON.stringify({
      schemaVersion: 1, title: 'T', language: 'fr', status: 'unreviewed', objective: '',
      blocks: [{ type: 'paragraph', children: [{ type: 'strong', children: [{ type: 'strong', children: [{ type: 'text', text: 'a' }] }, { type: 'math', text: 'x' }] }, { type: 'text', text: 'b' }, { type: 'text', text: 'c' }] }],
    });
    const { result } = roundTrip(source);
    expect(result.errors).toEqual([]);
    expect(result.document.blocks[0].children).toEqual([
      { type: 'strong', children: [{ type: 'text', text: 'a' }, { type: 'math', text: 'x' }] },
      { type: 'text', text: 'bc' },
    ]);
  });
});
