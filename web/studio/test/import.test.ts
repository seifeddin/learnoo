import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../src/fixtures';
import { prepareSource } from '../src/schema/importer';
import { LessonError, MAX_DOCUMENT_BYTES, byteLength, parseLesson } from '../src/schema/lesson';
import { createEditor, loadInto } from './helpers';

/** Valid compact JSON under 128 KiB whose formatted export exceeds 128 KiB. */
export function oversizedOnceFormatted(): string {
  const blocks = Array.from({ length: 240 }, (_, i) => ({ type: 'paragraph', children: [{ type: 'text', text: `${i} ${'x'.repeat(440)}` }] }));
  return JSON.stringify({ schemaVersion: 1, title: 'Taille limite — test technique', language: 'fr', status: 'unreviewed', objective: '', blocks });
}

describe('import is all-or-nothing', () => {
  it('rejects a document that exceeds 128 KiB once formatted, leaving the editor untouched', () => {
    const source = oversizedOnceFormatted();
    expect(byteLength(source)).toBeLessThan(MAX_DOCUMENT_BYTES);
    expect(() => parseLesson(source)).not.toThrow();

    const editor = createEditor();
    loadInto(editor, parseLesson(FIXTURES[1].source));
    const before = editor.getJSON();
    expect(() => prepareSource(editor.schema, source)).toThrow(LessonError);
    expect(editor.getJSON()).toEqual(before);
    editor.destroy();
  });

  it('prepares valid fixtures with their canonical JSON', () => {
    const editor = createEditor();
    for (const f of FIXTURES) expect(prepareSource(editor.schema, f.source).json).toBe(JSON.stringify(JSON.parse(f.source), null, 2));
    editor.destroy();
  });
});
