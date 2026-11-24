// TipTap schema for the Studio. Each node maps 1:1 to a restricted lesson node
// (see adapter.ts); nothing here can represent content the Go renderer rejects
// except empty values, which the adapter reports before saving.
import { InputRule, Mark, Node, mergeAttributes, type AnyExtension, type NodeViewRenderer } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import { BulletList, ListItem } from '@tiptap/extension-list';
import { Gapcursor, TrailingNode, UndoRedo } from '@tiptap/extensions';
import { ALLOWED_IMAGES, YOUTUBE_ID, type Dir, type Lang } from './lesson';
import { paintFormula } from '../math';

export const asLang = (value: string | null | undefined): Lang | null => (value === 'fr' || value === 'ar' ? value : null);
export const asDir = (value: string | null | undefined): Dir | null => (value === 'ltr' || value === 'rtl' || value === 'auto' ? value : null);

/** TeX from our own markup, the reader's `.math` placeholder or KaTeX output (MathML annotation). */
export function texFrom(el: HTMLElement): string {
  const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
  return (el.getAttribute('data-latex') ?? annotation?.textContent ?? el.textContent ?? '').trim();
}

/**
 * Editor view of a formula: typeset with KaTeX, or its TeX flagged as an error.
 * Only the view changes; the node still stores and exports the TeX source, and
 * renderHTML (used for copy) is unchanged.
 */
const formulaView = (display: boolean): NodeViewRenderer => ({ node }) => {
  const dom = document.createElement(display ? 'div' : 'span');
  dom.dataset.type = display ? 'display-math' : 'inline-math';
  dom.className = display ? 'studio-math-block' : 'studio-math';
  dom.dir = 'ltr';
  dom.contentEditable = 'false';
  let tex = String(node.attrs.latex);
  dom.dataset.latex = tex;
  paintFormula(dom, tex, display);
  return {
    dom,
    update: (next) => {
      if (next.type !== node.type) return false;
      const nextTex = String(next.attrs.latex);
      if (nextTex !== tex) {
        tex = nextTex;
        dom.dataset.latex = tex;
        paintFormula(dom, tex, display);
      }
      return true;
    },
    // KaTeX owns the markup inside; ProseMirror must not read it back as content.
    ignoreMutation: () => true,
  };
};

const langAttributes = () => ({
  lang: { default: null, parseHTML: (el: HTMLElement) => asLang(el.getAttribute('lang')), renderHTML: (a: { lang: Lang | null }) => (a.lang ? { lang: a.lang } : {}) },
  dir: { default: null, parseHTML: (el: HTMLElement) => asDir(el.getAttribute('dir')), renderHTML: (a: { dir: Dir | null }) => (a.dir ? { dir: a.dir } : {}) },
});

/** Inline language/direction span, exported as `lang`/`dir` on text nodes. */
export const LangMark = Mark.create({
  name: 'lang',
  addAttributes: langAttributes,
  parseHTML() {
    const rule = (tag: string) => ({
      tag,
      getAttrs: (el: HTMLElement) => {
        // Formula spans also carry dir="ltr"; they belong to the math nodes.
        if (el.matches('[data-type], .math, .katex, .katex *')) return false;
        const lang = asLang(el.getAttribute('lang'));
        const dir = asDir(el.getAttribute('dir'));
        return lang || dir ? { lang, dir } : false;
      },
    });
    return [rule('span[lang]'), rule('span[dir]'), rule('bdi[lang]'), rule('bdi[dir]')];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'studio-lang' }, HTMLAttributes), 0];
  },
});

export const Paragraph = Node.create({
  name: 'paragraph',
  priority: 1000,
  group: 'block',
  content: 'inline*',
  addAttributes: langAttributes,
  parseHTML: () => [{ tag: 'p' }],
  renderHTML: ({ HTMLAttributes }) => ['p', HTMLAttributes, 0],
});

/** The renderer has a single heading level (h2); every pasted h1–h6 maps to it. */
export const Heading = Node.create({
  name: 'heading',
  group: 'block',
  content: 'inline*',
  defining: true,
  addAttributes: langAttributes,
  parseHTML: () => [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}` })),
  renderHTML: ({ HTMLAttributes }) => ['h2', HTMLAttributes, 0],
  addKeyboardShortcuts() {
    return { 'Mod-Alt-2': () => this.editor.commands.toggleNode('heading', 'paragraph') };
  },
});

export const LessonList = BulletList.extend({
  // Ordered lists are normalised to the single list type the schema supports.
  parseHTML: () => [{ tag: 'ul' }, { tag: 'ol' }],
});

export const LessonItem = ListItem.extend({ content: 'block+' });

export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  marks: 'bold',
  addAttributes: () => ({ latex: { default: '', rendered: false } }),
  parseHTML: () => [
    { tag: 'span[data-type="inline-math"]', priority: 100, getAttrs: (el: HTMLElement) => ({ latex: texFrom(el) }) },
    { tag: 'span.math[data-display="false"]', priority: 100, getAttrs: (el: HTMLElement) => ({ latex: texFrom(el) }) },
    { tag: 'span.katex', priority: 100, getAttrs: (el: HTMLElement) => ({ latex: texFrom(el) }) },
  ],
  renderHTML: ({ node }) => ['span', { 'data-type': 'inline-math', 'data-latex': node.attrs.latex, class: 'studio-math', dir: 'ltr', title: 'Formule (TeX)' }, node.attrs.latex || '∅'],
  renderText: ({ node }) => `$${node.attrs.latex}$`,
  addNodeView: () => formulaView(false),
  addInputRules() {
    // Typing $…$ (not $$) turns the TeX into an inline formula.
    return [
      new InputRule({
        find: /(^|[^$\\])\$([^$\n]+)\$$/,
        handler: ({ state, range, match }) => {
          const from = range.from + match[1].length;
          // Carry over the marks active where the formula was typed (stored marks, e.g. bold
          // toggled on, or the marks of the surrounding text); the schema keeps only bold.
          const marks = this.type.allowedMarks(state.storedMarks ?? state.doc.resolve(from).marks());
          state.tr.replaceWith(from, range.to, this.type.create({ latex: match[2].trim() }, null, marks));
        },
      }),
    ];
  },
});

export const DisplayMath = Node.create({
  name: 'displayMath',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes: () => ({ latex: { default: '', rendered: false } }),
  parseHTML: () => [
    { tag: 'div[data-type="display-math"]', getAttrs: (el: HTMLElement) => ({ latex: texFrom(el) }) },
    { tag: 'div.math[data-display="true"]', getAttrs: (el: HTMLElement) => ({ latex: texFrom(el) }) },
    { tag: '.katex-display', getAttrs: (el: HTMLElement) => ({ latex: texFrom(el) }) },
  ],
  renderHTML: ({ node }) => ['div', { 'data-type': 'display-math', 'data-latex': node.attrs.latex, class: 'studio-math-block', dir: 'ltr' }, node.attrs.latex || '∅ formule vide'],
  addNodeView: () => formulaView(true),
  addInputRules() {
    // "$$ " at the start of an empty paragraph inserts a display formula.
    return [
      new InputRule({
        find: /^\$\$\s$/,
        handler: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.name !== 'paragraph' || $from.parent.content.size !== range.to - range.from) return null;
          state.tr.replaceRangeWith($from.before(), $from.after(), this.type.create({ latex: '' }));
        },
      }),
    ];
  },
});

const titled = (label: string) => ({
  addAttributes: () => ({ title: { default: '', rendered: false } }),
  label: (title: string) => ['p', { class: 'studio-node-label', contenteditable: 'false' }, `${label} · ${title || 'sans titre'}`] as const,
});

/** Reader markup puts the title in a heading before the children; strip it for content parsing. */
const withoutFirst = (selector: string) => (el: HTMLElement) => {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(selector).forEach((child) => child.remove());
  return copy;
};

const callout = titled('Encadré');
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes: callout.addAttributes,
  parseHTML: () => [
    { tag: 'section[data-type="callout"]', contentElement: 'div[data-content]', getAttrs: (el: HTMLElement) => ({ title: el.getAttribute('data-title') ?? '' }) },
    { tag: 'section.callout', contentElement: withoutFirst(':scope > h3'), getAttrs: (el: HTMLElement) => ({ title: el.querySelector(':scope > h3')?.textContent?.trim() ?? '' }) },
  ],
  renderHTML: ({ node }) => ['section', { 'data-type': 'callout', 'data-title': node.attrs.title, class: 'studio-callout' }, callout.label(node.attrs.title), ['div', { 'data-content': '' }, 0]],
});

const exercise = titled('Exercice');
export const Exercise = Node.create({
  name: 'exercise',
  group: 'block',
  content: '(block | solution)+',
  defining: true,
  addAttributes: exercise.addAttributes,
  parseHTML: () => [
    { tag: 'section[data-type="exercise"]', contentElement: 'div[data-content]', getAttrs: (el: HTMLElement) => ({ title: el.getAttribute('data-title') ?? '' }) },
    { tag: 'section.exercise', contentElement: withoutFirst(':scope > h2, :scope > .eyebrow'), getAttrs: (el: HTMLElement) => ({ title: el.querySelector(':scope > h2')?.textContent?.trim() ?? '' }) },
  ],
  renderHTML: ({ node }) => ['section', { 'data-type': 'exercise', 'data-title': node.attrs.title, class: 'studio-exercise' }, exercise.label(node.attrs.title), ['div', { 'data-content': '' }, 0]],
});

export const Solution = Node.create({
  name: 'solution',
  content: 'block+',
  defining: true,
  parseHTML: () => [
    { tag: 'div[data-type="solution"]', contentElement: 'div[data-content]' },
    { tag: 'details', contentElement: withoutFirst(':scope > summary') },
  ],
  renderHTML: () => ['div', { 'data-type': 'solution', class: 'studio-solution' }, ['p', { class: 'studio-node-label', contenteditable: 'false' }, 'Solution (repliée pour l’élève)'], ['div', { 'data-content': '' }, 0]],
});

export const LessonImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes: () => ({ src: { default: ALLOWED_IMAGES[0], rendered: false }, alt: { default: '', rendered: false } }),
  parseHTML: () => {
    const fromImg = (img: Element | null) => {
      const src = img?.getAttribute('src') ?? '';
      // Only allowlisted local assets; anything else is dropped (and counted by the paste filter).
      return (ALLOWED_IMAGES as readonly string[]).includes(src) ? { src, alt: img?.getAttribute('alt') ?? '' } : false;
    };
    return [
      { tag: 'figure', getAttrs: (el: HTMLElement) => fromImg(el.querySelector('img')) },
      { tag: 'img[src]', getAttrs: (el: HTMLElement) => fromImg(el) },
    ];
  },
  renderHTML: ({ node }) => ['figure', { 'data-type': 'image', class: 'studio-image' }, ['img', { src: node.attrs.src, alt: node.attrs.alt, width: '320', height: '180' }], ['figcaption', {}, node.attrs.alt || 'Texte alternatif manquant']],
});

export const YouTube = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes: () => ({ title: { default: '', rendered: false }, videoId: { default: '', rendered: false } }),
  parseHTML: () => [
    { tag: 'section[data-type="youtube"]', getAttrs: (el: HTMLElement) => ({ title: el.getAttribute('data-title') ?? '', videoId: safeVideoId(el.getAttribute('data-video-id')) }) },
    {
      tag: 'section.video',
      getAttrs: (el: HTMLElement) => ({ title: el.querySelector('h3')?.textContent?.trim() ?? '', videoId: safeVideoId(el.querySelector('[data-video-id]')?.getAttribute('data-video-id')) }),
    },
  ],
  renderHTML: ({ node }) => [
    'section',
    { 'data-type': 'youtube', 'data-title': node.attrs.title, 'data-video-id': node.attrs.videoId, class: 'studio-video' },
    ['p', { class: 'studio-node-label' }, `Vidéo YouTube · ${node.attrs.title || 'sans titre'}`],
    ['p', {}, node.attrs.videoId ? `Identifiant : ${node.attrs.videoId} (chargée seulement au clic de l’élève)` : 'Vidéo à sélectionner avec un enseignant'],
  ],
});

const safeVideoId = (value: string | null | undefined) => (value && YOUTUBE_ID.test(value) ? value : '');

export const lessonExtensions: AnyExtension[] = [
  Document,
  Text,
  Paragraph,
  Heading,
  Bold,
  LangMark,
  LessonList,
  LessonItem,
  InlineMath,
  DisplayMath,
  Callout,
  Exercise,
  Solution,
  LessonImage,
  YouTube,
  UndoRedo,
  Gapcursor,
  TrailingNode,
];
