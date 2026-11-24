// Two-way mapping between TipTap JSON and the restricted lesson JSON.
// Canonical form on export: adjacent text with identical attributes merges,
// nested `strong` flattens into maximal bold runs, and empty paragraphs,
// headings and lists are dropped. Everything else maps one-to-one.
import type { JSONContent } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import { LessonError, validateLesson, type Dir, type Lang, type LessonDocument, type LessonNode } from './lesson';

export type Metadata = Pick<LessonDocument, 'title' | 'language' | 'objective'>;

type Mark = NonNullable<JSONContent['marks']>[number];
const BOLD: Mark = { type: 'bold' };

// Attributes the renderer actually emits per type. The Go validator accepts
// lang/dir/title anywhere, but the reader ignores them elsewhere, so the
// adapter rejects them rather than dropping them silently.
const LANG_TYPES = new Set(['paragraph', 'heading', 'text']);
const TITLE_TYPES = new Set(['callout', 'exercise', 'youtube']);

/* ---------- restricted JSON -> TipTap ---------- */

export function lessonToEditor(blocks: LessonNode[]): JSONContent {
  return { type: 'doc', content: blocks.map((b, i) => blockToEditor(b, `blocks[${i}]`)) };
}

/** Builds and checks the ProseMirror document, so nothing is repaired or dropped on import. */
export function lessonToEditorChecked(schema: Schema, blocks: LessonNode[]): JSONContent {
  const json = lessonToEditor(blocks);
  try {
    schema.nodeFromJSON(json).check();
  } catch (error) {
    throw new LessonError(`Structure non représentable dans l’éditeur : ${(error as Error).message}`);
  }
  return json;
}

function checkAttributes(n: LessonNode, path: string) {
  if ((n.lang || n.dir) && !LANG_TYPES.has(n.type)) throw new LessonError(`${path} : lang/dir non affichés sur ${n.type} ; placez-les sur le paragraphe ou le texte.`);
  if (n.title && !TITLE_TYPES.has(n.type)) throw new LessonError(`${path} : titre non affiché sur ${n.type}.`);
}

const langAttrs = (n: LessonNode) => ({ lang: n.lang ?? null, dir: n.dir ?? null });

function blockToEditor(n: LessonNode, path: string): JSONContent {
  checkAttributes(n, path);
  const kids = () => (n.children ?? []).map((c, i) => blockToEditor(c, `${path}.children[${i}]`));
  switch (n.type) {
    case 'paragraph':
    case 'heading':
      return { type: n.type, attrs: langAttrs(n), content: inlineToEditor(n.children ?? [], [], path) };
    case 'list':
      return { type: 'bulletList', content: kids() };
    case 'item':
      return { type: 'listItem', content: kids() };
    case 'callout':
    case 'exercise':
      return { type: n.type, attrs: { title: n.title ?? '' }, content: kids() };
    case 'solution':
      return { type: 'solution', content: kids() };
    case 'displayMath':
      return { type: 'displayMath', attrs: { latex: n.text ?? '' } };
    case 'image':
      return { type: 'image', attrs: { src: n.src ?? '', alt: n.alt ?? '' } };
    case 'youtube':
      return { type: 'youtube', attrs: { title: n.title ?? '', videoId: n.videoId ?? '' } };
    default:
      throw new LessonError(`${path} : type ${n.type} non pris en charge ici.`);
  }
}

function inlineToEditor(nodes: LessonNode[], marks: Mark[], path: string): JSONContent[] {
  return nodes.flatMap((n, i): JSONContent[] => {
    const at = `${path}.children[${i}]`;
    checkAttributes(n, at);
    if (n.type === 'strong') {
      const bold = marks.some((m) => m.type === 'bold') ? marks : [...marks, BOLD];
      return inlineToEditor(n.children ?? [], bold, at);
    }
    if (n.type === 'math') return [{ type: 'inlineMath', attrs: { latex: n.text ?? '' }, ...(marks.length ? { marks } : {}) }];
    if (n.type === 'text') {
      const all = n.lang || n.dir ? [...marks, { type: 'lang', attrs: langAttrs(n) }] : marks;
      return [{ type: 'text', text: n.text ?? '', ...(all.length ? { marks: all } : {}) }];
    }
    throw new LessonError(`${at} : ${n.type} interdit dans un paragraphe.`);
  });
}

/* ---------- TipTap -> restricted JSON ---------- */

export interface ExportResult {
  document: LessonDocument;
  /** Problems the author must fix before saving (empty formulas, empty containers, Go validation). */
  errors: string[];
}

export function editorToLesson(doc: JSONContent, meta: Metadata): ExportResult {
  const errors: string[] = [];
  const blocks = blocksFromEditor(doc.content ?? [], errors, 'document');
  const document: LessonDocument = { schemaVersion: 1, title: meta.title.trim(), language: meta.language, status: 'unreviewed', objective: meta.objective.trim(), blocks };
  if (errors.length === 0) errors.push(...validateLesson(document));
  return { document, errors };
}

const LABELS: Record<string, string> = { callout: 'Encadré', exercise: 'Exercice', solution: 'Solution', listItem: 'Élément de liste' };

function blocksFromEditor(nodes: JSONContent[], errors: string[], where: string): LessonNode[] {
  const out: LessonNode[] = [];
  for (const node of nodes) {
    const converted = blockFromEditor(node, errors, where);
    if (converted) out.push(converted);
  }
  return out;
}

function blockFromEditor(node: JSONContent, errors: string[], where: string): LessonNode | null {
  const attrs = node.attrs ?? {};
  const container = (type: string, extra: Partial<LessonNode> = {}): LessonNode | null => {
    const label = LABELS[node.type ?? ''] ?? node.type;
    const children = blocksFromEditor(node.content ?? [], errors, label ?? where);
    if (children.length === 0) {
      // Empty lists and list items carry no content and are dropped; titled containers would lose their title.
      if (node.type === 'listItem' || node.type === 'bulletList') return null;
      errors.push(`${label}${extra.title ? ` « ${extra.title} »` : ''} : ajoutez du contenu ou supprimez le bloc.`);
      return null;
    }
    return { type, ...extra, children };
  };
  switch (node.type) {
    case 'paragraph':
    case 'heading': {
      const children = inlineFromEditor(node.content ?? [], errors, where);
      if (children.length === 0) return null;
      return { type: node.type, ...langFromAttrs(attrs), children };
    }
    case 'bulletList':
      return container('list');
    case 'listItem':
      return container('item');
    case 'callout':
    case 'exercise':
      return container(node.type, attrs.title ? { title: String(attrs.title) } : {});
    case 'solution':
      return container('solution');
    case 'displayMath': {
      const latex = String(attrs.latex ?? '').trim();
      if (!latex) {
        errors.push(`${where} : formule centrée vide.`);
        return null;
      }
      return { type: 'displayMath', text: latex };
    }
    case 'image':
      return { type: 'image', src: String(attrs.src ?? ''), alt: String(attrs.alt ?? '').trim() };
    case 'youtube': {
      const out: LessonNode = { type: 'youtube' };
      if (attrs.title) out.title = String(attrs.title);
      if (attrs.videoId) out.videoId = String(attrs.videoId);
      return out;
    }
    default:
      errors.push(`${where} : bloc ${node.type} non pris en charge.`);
      return null;
  }
}

function langFromAttrs(attrs: Record<string, unknown>): { lang?: Lang; dir?: Dir } {
  const out: { lang?: Lang; dir?: Dir } = {};
  if (attrs.lang) out.lang = attrs.lang as Lang;
  if (attrs.dir) out.dir = attrs.dir as Dir;
  return out;
}

interface InlineItem {
  bold: boolean;
  node: LessonNode;
}

function inlineFromEditor(nodes: JSONContent[], errors: string[], where: string): LessonNode[] {
  const items: InlineItem[] = [];
  for (const n of nodes) {
    const marks = n.marks ?? [];
    const bold = marks.some((m) => m.type === 'bold');
    if (n.type === 'text') {
      const lang = marks.find((m) => m.type === 'lang');
      const node: LessonNode = { type: 'text', text: n.text ?? '', ...langFromAttrs(lang?.attrs ?? {}) };
      const prev = items.at(-1);
      // ProseMirror already merges identical marks; this only guards hand-built input.
      if (prev && prev.bold === bold && prev.node.type === 'text' && prev.node.lang === node.lang && prev.node.dir === node.dir) prev.node.text += node.text ?? '';
      else items.push({ bold, node });
    } else if (n.type === 'inlineMath') {
      const latex = String(n.attrs?.latex ?? '').trim();
      if (!latex) errors.push(`${where} : formule en ligne vide.`);
      else items.push({ bold, node: { type: 'math', text: latex } });
    } else {
      errors.push(`${where} : contenu en ligne ${n.type} non pris en charge.`);
    }
  }
  const out: LessonNode[] = [];
  for (const item of items) {
    if (!item.bold) {
      out.push(item.node);
      continue;
    }
    // A trailing strong can only come from the previous (bold) item, so extend the run.
    const last = out.at(-1);
    if (last?.type === 'strong') last.children!.push(item.node);
    else out.push({ type: 'strong', children: [item.node] });
  }
  return out;
}
