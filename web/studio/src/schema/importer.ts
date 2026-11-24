// Everything that can reject a document runs here, before the editor is touched,
// so a refused import or reopen always leaves the current document intact.
import type { JSONContent } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import { lessonToEditorChecked } from './adapter';
import { parseLesson, serializeLesson, type LessonDocument } from './lesson';

export interface PreparedLesson {
  doc: LessonDocument;
  content: JSONContent;
  json: string;
}

/** Throws LessonError if the document cannot be represented, validated or serialised within limits. */
export function prepareLesson(schema: Schema, doc: LessonDocument): PreparedLesson {
  const content = lessonToEditorChecked(schema, doc.blocks);
  const json = serializeLesson(doc);
  return { doc, content, json };
}

export const prepareSource = (schema: Schema, source: string) => prepareLesson(schema, parseLesson(source));
