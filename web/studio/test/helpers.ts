import { Editor } from '@tiptap/core';
import { lessonExtensions } from '../src/schema/extensions';
import { editorToLesson, lessonToEditorChecked } from '../src/schema/adapter';
import { parseLesson, type LessonDocument } from '../src/schema/lesson';

const live = new Set<Editor>();

/** Every editor is destroyed after its test by destroyEditors (test/setup.ts). */
export function createEditor(): Editor {
  const editor = new Editor({ element: document.createElement('div'), extensions: lessonExtensions });
  live.add(editor);
  editor.on('destroy', () => live.delete(editor));
  return editor;
}

// ProseMirror's DOM observer flushes on a 20 ms timer, which a destroyed view
// can still schedule. Waiting past it keeps every timer inside the test, before
// jsdom tears down `document`.
const OBSERVER_FLUSH_MS = 20;

export async function destroyEditors() {
  for (const editor of [...live]) editor.destroy();
  await new Promise((resolve) => setTimeout(resolve, OBSERVER_FLUSH_MS * 3));
}

export function loadInto(editor: Editor, doc: LessonDocument) {
  editor.commands.setContent(lessonToEditorChecked(editor.schema, doc.blocks), { emitUpdate: false });
}

export function exportFrom(editor: Editor, meta: Pick<LessonDocument, 'title' | 'language' | 'objective'>) {
  return editorToLesson(editor.getJSON(), meta);
}

/** Types text the way the browser does, so input rules ($…$, **…**) run. */
export function type(editor: Editor, text: string) {
  for (const char of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp('handleTextInput', (f) => f(editor.view, from, to, char, () => editor.state.tr.insertText(char, from, to)));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(char, from, to));
  }
}

export const roundTrip = (source: string) => {
  const doc = parseLesson(source);
  const editor = createEditor();
  loadInto(editor, doc);
  const result = exportFrom(editor, doc);
  editor.destroy();
  return { doc, result };
};
