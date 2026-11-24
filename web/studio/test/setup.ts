import { afterEach } from 'vitest';
import { destroyEditors } from './helpers';

afterEach(destroyEditors);

// jsdom has no ClipboardEvent; ProseMirror's pasteHTML/pasteText only need the constructor.
if (typeof globalThis.ClipboardEvent === 'undefined') {
  class ClipboardEventShim extends Event {
    readonly clipboardData: DataTransfer | null = null;
  }
  (globalThis as unknown as { ClipboardEvent: typeof ClipboardEventShim }).ClipboardEvent = ClipboardEventShim;
}
