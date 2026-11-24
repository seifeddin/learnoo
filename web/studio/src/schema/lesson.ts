// Restricted lesson JSON (schemaVersion 1). Mirrors internal/rendering/render.go;
// docs/fixtures/README.md is the contract. The Go renderer stays authoritative:
// this module only lets the Studio refuse invalid documents before sending them.

export type Lang = 'fr' | 'ar';
export type Dir = 'ltr' | 'rtl' | 'auto';

export interface LessonNode {
  type: string;
  text?: string;
  title?: string;
  lang?: Lang;
  dir?: Dir;
  src?: string;
  alt?: string;
  videoId?: string;
  children?: LessonNode[];
}

export interface LessonDocument {
  schemaVersion: 1;
  title: string;
  language: Lang;
  status: 'unreviewed';
  objective: string;
  blocks: LessonNode[];
}

export const MAX_DOCUMENT_BYTES = 128 << 10;
export const MAX_NODES = 500;
export const MAX_DEPTH = 12;
export const ALLOWED_IMAGES = ['/static/complex-plane.svg'] as const;
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const DOCUMENT_KEYS = ['schemaVersion', 'title', 'language', 'status', 'objective', 'blocks'];
// Go struct field order; also the order used when serialising nodes.
export const NODE_KEYS = ['type', 'text', 'title', 'lang', 'dir', 'src', 'alt', 'videoId', 'children'] as const;
const STRING_NODE_KEYS = new Set(['type', 'text', 'title', 'lang', 'dir', 'src', 'alt', 'videoId']);

const INLINE = new Set(['text', 'math', 'strong']);
const INLINE_PARENTS = new Set(['paragraph', 'heading', 'strong']);
const LEAVES = new Set(['text', 'math', 'displayMath']);
const CONTAINERS = new Set(['paragraph', 'heading', 'strong', 'list', 'item', 'callout', 'exercise', 'solution']);

export class LessonError extends Error {}

const utf8 = new TextEncoder();
export const byteLength = (value: string) => utf8.encode(value).length;

/**
 * Strict JSON decoding, matching internal/strictjson on the Go side: keys must
 * be exact (JSON.parse is case-sensitive), unique in every object (JSON.parse
 * would keep the last one), and nothing may follow the single value.
 */
export function parseLesson(source: string): LessonDocument {
  if (byteLength(source) > MAX_DOCUMENT_BYTES) throw new LessonError('Le document dépasse 128 Kio.');
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    throw new LessonError('JSON invalide.');
  }
  const duplicate = findDuplicateKey(source);
  if (duplicate !== null) throw new LessonError(`Clé en double : ${duplicate}.`);
  if (!isRecord(raw)) throw new LessonError('Le document doit être un objet JSON.');
  for (const key of Object.keys(raw)) {
    if (!DOCUMENT_KEYS.includes(key)) throw new LessonError(`Champ inconnu dans le document : ${key}.`);
  }
  for (const key of ['title', 'language', 'status', 'objective']) {
    if (key in raw && typeof raw[key] !== 'string') throw new LessonError(`Le champ ${key} doit être du texte.`);
  }
  if ('schemaVersion' in raw && typeof raw.schemaVersion !== 'number') throw new LessonError('schemaVersion doit être un nombre.');
  if ('blocks' in raw && !Array.isArray(raw.blocks)) throw new LessonError('blocks doit être une liste.');
  const doc = {
    schemaVersion: raw.schemaVersion ?? 0,
    title: raw.title ?? '',
    language: raw.language ?? '',
    status: raw.status ?? '',
    objective: raw.objective ?? '',
    blocks: ((raw.blocks as unknown[]) ?? []).map((node, i) => parseNode(node, `blocks[${i}]`)),
  } as LessonDocument;
  const errors = validateLesson(doc);
  if (errors.length > 0) throw new LessonError(errors[0]);
  return doc;
}

function parseNode(raw: unknown, path: string): LessonNode {
  if (!isRecord(raw)) throw new LessonError(`${path} doit être un objet.`);
  const node: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'children') {
      if (!Array.isArray(value)) throw new LessonError(`${path}.children doit être une liste.`);
      node.children = value.map((child, i) => parseNode(child, `${path}.children[${i}]`));
    } else if (STRING_NODE_KEYS.has(key)) {
      if (typeof value !== 'string') throw new LessonError(`${path}.${key} doit être du texte.`);
      node[key] = value;
    } else {
      throw new LessonError(`Champ inconnu ${key} dans ${path}.`);
    }
  }
  return node as unknown as LessonNode;
}

/** Port of rendering.Validate. Returns French messages; empty means valid. */
export function validateLesson(doc: LessonDocument): string[] {
  const errors: string[] = [];
  if (doc.schemaVersion !== 1 || doc.status !== 'unreviewed') errors.push('Seuls le schéma 1 et le statut « unreviewed » sont acceptés.');
  if (doc.language !== 'fr' && doc.language !== 'ar') errors.push('Langue du document non prise en charge.');
  if (byteLength(doc.title) === 0 || byteLength(doc.title) > 240) errors.push('Le titre est obligatoire (240 octets maximum).');
  if (byteLength(doc.objective) > 1000) errors.push('L’objectif dépasse 1 000 octets.');
  if (doc.blocks.length === 0) errors.push('Le document est vide.');
  let count = 0;
  const walk = (nodes: LessonNode[], parent: string, depth: number, path: string): string | null => {
    if (depth > MAX_DEPTH) return 'Imbrication trop profonde (12 niveaux maximum).';
    for (const [i, n] of nodes.entries()) {
      const at = `${path}[${i}] (${n.type})`;
      if (++count > MAX_NODES) return `Trop de nœuds (${MAX_NODES} maximum).`;
      if (byteLength(n.text ?? '') > 8000 || byteLength(n.title ?? '') > 240 || byteLength(n.alt ?? '') > 1000) return `${at} : texte trop long.`;
      if (n.lang && n.lang !== 'ar' && n.lang !== 'fr') return `${at} : langue non prise en charge.`;
      if (n.dir && n.dir !== 'rtl' && n.dir !== 'ltr' && n.dir !== 'auto') return `${at} : direction invalide.`;
      if (INLINE.has(n.type) !== INLINE_PARENTS.has(parent)) return `${at} : ${n.type} interdit dans ${parent}.`;
      if (parent === 'list' && n.type !== 'item') return `${at} : une liste ne contient que des éléments.`;
      if (n.type === 'item' && parent !== 'list') return `${at} : élément hors d’une liste.`;
      if (n.type === 'solution' && parent !== 'exercise') return `${at} : solution hors d’un exercice.`;
      if ((n.src && n.type !== 'image') || (n.alt && n.type !== 'image') || (n.videoId && n.type !== 'youtube')) return `${at} : attributs média inattendus.`;
      const children = n.children ?? [];
      if (LEAVES.has(n.type)) {
        if (children.length > 0 || !n.text) return `${at} : ${n.type === 'text' ? 'texte vide' : 'formule vide'}.`;
        if ((n.type === 'math' || n.type === 'displayMath') && byteLength(n.text) > 2000) return `${at} : formule trop longue (2 000 octets maximum).`;
      } else if (CONTAINERS.has(n.type)) {
        if (n.text || children.length === 0) return `${at} : contenu vide.`;
      } else if (n.type === 'image') {
        if (!(ALLOWED_IMAGES as readonly string[]).includes(n.src ?? '') || !n.alt || children.length > 0 || n.text) return `${at} : l’image doit utiliser une ressource locale autorisée et un texte alternatif.`;
      } else if (n.type === 'youtube') {
        if ((n.videoId && !YOUTUBE_ID.test(n.videoId)) || children.length > 0 || n.text) return `${at} : identifiant YouTube invalide (11 caractères).`;
      } else {
        return `${at} : type non pris en charge.`;
      }
      const nested = walk(children, n.type, depth + 1, `${at}.children`);
      if (nested) return nested;
    }
    return null;
  };
  if (doc.blocks.length > 0) {
    const nested = walk(doc.blocks, 'document', 0, 'blocks');
    if (nested) errors.push(nested);
  }
  return errors;
}

/** Serialise with Go field order and the same 2-space layout as the fixtures. */
export function serializeLesson(doc: LessonDocument): string {
  const node = (n: LessonNode): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const key of NODE_KEYS) {
      const value = n[key];
      if (key === 'children') {
        if (n.children && n.children.length > 0) out.children = n.children.map(node);
      } else if (value) {
        out[key] = value;
      }
    }
    return out;
  };
  const ordered = {
    schemaVersion: doc.schemaVersion,
    title: doc.title,
    language: doc.language,
    status: doc.status,
    objective: doc.objective,
    blocks: doc.blocks.map(node),
  };
  const json = JSON.stringify(ordered, null, 2);
  if (byteLength(json) > MAX_DOCUMENT_BYTES) throw new LessonError('Le document dépasse 128 Kio.');
  return json;
}

/**
 * Returns the first key repeated within one object, or null. Call only on
 * text JSON.parse accepted. Keys compare after unescaping, as in Go.
 */
export function findDuplicateKey(source: string): string | null {
  // One entry per open container: the keys seen so far, or null for an array.
  const stack: (Set<string> | null)[] = [];
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') stack.push(new Set());
    else if (ch === '[') stack.push(null);
    else if (ch === '}' || ch === ']') stack.pop();
    else if (ch === '"') {
      const start = i;
      for (i++; source[i] !== '"'; i++) if (source[i] === '\\') i++;
      const keys = stack[stack.length - 1];
      if (!keys) continue;
      let j = i + 1;
      while (' \t\n\r'.includes(source[j])) j++;
      if (source[j] !== ':') continue; // a string value, not a key
      const key = JSON.parse(source.slice(start, i + 1)) as string;
      if (keys.has(key)) return key;
      keys.add(key);
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
