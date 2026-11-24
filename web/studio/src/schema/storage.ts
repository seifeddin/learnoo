// Local, per-browser save/reopen of the exported restricted JSON. Nothing is
// sent to a server or published; accounts and persistence belong to later tasks.
import { parseLesson, serializeLesson, type LessonDocument } from './lesson';

export const DRAFT_KEY = 'learnoo-studio-draft-v1';

export function saveDraft(doc: LessonDocument, storage: Storage = localStorage): string {
  const json = serializeLesson(doc);
  storage.setItem(DRAFT_KEY, json);
  return json;
}

/** Returns null when nothing is saved; throws LessonError when the saved JSON is invalid. */
export function reopenDraft(storage: Storage = localStorage): LessonDocument | null {
  const saved = storage.getItem(DRAFT_KEY);
  return saved === null ? null : parseLesson(saved);
}
