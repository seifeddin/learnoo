import casesSource from './contract/cases.json?raw';
import { describe, expect, it } from 'vitest';
import { lessonToEditorChecked } from '../src/schema/adapter';
import { LessonError, MAX_DOCUMENT_BYTES, findDuplicateKey, parseLesson } from '../src/schema/lesson';
import { DRAFT_KEY, reopenDraft } from '../src/schema/storage';
import { createEditor, exportFrom } from './helpers';

const cases: { name: string; valid: boolean; source: string }[] = JSON.parse(casesSource);
const base = { schemaVersion: 1, title: 'Test technique', language: 'fr', status: 'unreviewed', objective: '' };
const meta = { title: 'Test technique', language: 'fr' as const, objective: '' };

describe('validation parity with Go (test/contract/cases.json)', () => {
  // The same cases run through rendering.Decode in internal/rendering/studio_contract_test.go.
  for (const c of cases) {
    it(`${c.valid ? 'accepts' : 'rejects'}: ${c.name}`, () => {
      if (c.valid) expect(() => parseLesson(c.source)).not.toThrow();
      else expect(() => parseLesson(c.source)).toThrow(LessonError);
    });
  }

  it('rejects documents over 128 KiB', () => {
    const big = JSON.stringify({ ...base, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'a'.repeat(MAX_DOCUMENT_BYTES) }] }] });
    expect(() => parseLesson(big)).toThrow(/128 Kio/);
  });
});

describe('findDuplicateKey', () => {
  it.each([
    ['{"a":1,"b":{"a":2},"c":[{"a":3},{"a":4}]}', null],
    ['{"a":"\\"a\\":","b":"{\\\\","c":"}"}', null],
    ['{"k":["a","a"],"v":"a"}', null],
    ['{"a":1,"a":2}', 'a'],
    ['{"x":[{"y":{"a":1, "a" :2}}]}', 'a'],
    ['{"src":1,"\\u0073rc":2}', 'src'],
    ['{"\\"":1,"\\u0022":2}', '"'],
  ])('%s', (source, expected) => {
    JSON.parse(source);
    expect(findDuplicateKey(source)).toBe(expected);
  });
});

describe('adapter refuses what the reader would silently ignore', () => {
  it.each([
    ['lang on a callout', { type: 'callout', lang: 'ar', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'x' }] }] }],
    ['dir on inline math', { type: 'paragraph', children: [{ type: 'math', text: 'x', dir: 'rtl' }] }],
    ['title on a paragraph', { type: 'paragraph', title: 'x', children: [{ type: 'text', text: 'x' }] }],
  ])('%s', (_, block) => {
    const doc = parseLesson(JSON.stringify({ ...base, blocks: [block] }));
    const editor = createEditor();
    expect(() => lessonToEditorChecked(editor.schema, doc.blocks)).toThrow(LessonError);
  });
});

describe('export reports problems instead of saving invalid JSON', () => {
  const exportBlocks = (content: object[], m = meta) => {
    const editor = createEditor();
    editor.commands.setContent({ type: 'doc', content });
    return exportFrom(editor, m);
  };

  it('empty inline and display formulas', () => {
    const { errors } = exportBlocks([{ type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'inlineMath', attrs: { latex: '  ' } }] }, { type: 'displayMath', attrs: { latex: '' } }]);
    expect(errors).toEqual(['document : formule en ligne vide.', 'document : formule centrée vide.']);
  });

  it('a titled callout left empty', () => {
    const { errors } = exportBlocks([{ type: 'callout', attrs: { title: 'Note' }, content: [{ type: 'paragraph' }] }]);
    expect(errors).toEqual(['Encadré « Note » : ajoutez du contenu ou supprimez le bloc.']);
  });

  it('missing title, missing alt text and malformed video ID go through the Go-equivalent validator', () => {
    expect(exportBlocks([{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }], { ...meta, title: ' ' }).errors[0]).toMatch(/titre/);
    expect(exportBlocks([{ type: 'image', attrs: { src: '/static/complex-plane.svg', alt: '' } }]).errors[0]).toMatch(/texte alternatif/);
    expect(exportBlocks([{ type: 'youtube', attrs: { title: '', videoId: 'https://x' } }]).errors[0]).toMatch(/YouTube/);
  });

  it('drops only empty paragraphs and lists, which carry no content', () => {
    const { errors, document } = exportBlocks([{ type: 'paragraph' }, { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }, { type: 'paragraph', content: [{ type: 'text', text: 'reste' }] }, { type: 'paragraph' }]);
    expect(errors).toEqual([]);
    expect(document.blocks).toEqual([{ type: 'paragraph', children: [{ type: 'text', text: 'reste' }] }]);
  });

  it('an empty editor cannot be saved', () => {
    expect(exportBlocks([{ type: 'paragraph' }]).errors).toEqual(['Le document est vide.']);
  });
});

describe('reopen', () => {
  it('rejects a tampered local save instead of loading it', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...base, blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'x', onclick: 'alert(1)' }] }] }));
    expect(() => reopenDraft()).toThrow(/Champ inconnu/);
    localStorage.removeItem(DRAFT_KEY);
    expect(reopenDraft()).toBeNull();
  });
});
