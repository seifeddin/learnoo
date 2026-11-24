import { describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { FIXTURES } from '../src/fixtures';
import { parseLesson } from '../src/schema/lesson';
import { describePaste, sanitizePastedHTML } from '../src/schema/paste';
import { createEditor, exportFrom, loadInto } from './helpers';

const meta = { title: 'Collage — test technique', language: 'fr' as const, objective: '' };

/** Paste through the real ProseMirror clipboard path, capturing the Studio's notice. */
function paste(html: string) {
  let notice: string | null = null;
  const editor = createEditor();
  editor.setOptions({
    editorProps: {
      transformPastedHTML: (input: string) => {
        const result = sanitizePastedHTML(input);
        notice = describePaste(result.report);
        return result.html;
      },
    },
  });
  editor.view.pasteHTML(html);
  return { editor, notice: notice as string | null, ...exportFrom(editor, meta) };
}

const katexInline = (tex: string) =>
  `<span class="math" dir="ltr" data-display="false" data-rendered="true"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mi>z</mi></mrow><annotation encoding="application/x-tex">${tex}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base">z</span><svg><path d="M0 0"/></svg></span></span></span>`;

describe('paste', () => {
  it('keeps text, marks, math and directionality copied from the reader', () => {
    // Markup as produced by internal/rendering/page.html after KaTeX ran.
    const html = `<h2>Section</h2><p lang="ar" dir="rtl"><bdi lang="" dir="">نكتب </bdi>${katexInline('z=3+2i')}<bdi lang="fr" dir="ltr">partie réelle</bdi></p>
      <div class="formula"><div class="math" dir="ltr" data-display="true"><span class="katex-display"><span class="katex"><annotation encoding="application/x-tex">|z|=\\sqrt{13}</annotation></span></span></div></div>
      <section class="callout"><h3>Attention</h3><p><strong>gras</strong> fin</p></section>
      <section class="exercise"><span class="eyebrow">À VOUS DE JOUER</span><h2>Exercice</h2><p>Question</p><details><summary>Voir la solution expliquée</summary><p>Réponse</p></details></section>
      <figure><img src="/static/complex-plane.svg" alt="Plan"><figcaption>Plan</figcaption></figure>
      <section class="video"><h3>Vidéo</h3><p>Vidéo à sélectionner avec un enseignant.</p></section>`;
    const { notice, document, errors } = paste(html);
    expect(errors).toEqual([]);
    expect(notice).toBeNull();
    expect(document.blocks).toEqual([
      { type: 'heading', children: [{ type: 'text', text: 'Section' }] },
      { type: 'paragraph', lang: 'ar', dir: 'rtl', children: [{ type: 'text', text: 'نكتب ' }, { type: 'math', text: 'z=3+2i' }, { type: 'text', text: 'partie réelle', lang: 'fr', dir: 'ltr' }] },
      { type: 'displayMath', text: '|z|=\\sqrt{13}' },
      { type: 'callout', title: 'Attention', children: [{ type: 'paragraph', children: [{ type: 'strong', children: [{ type: 'text', text: 'gras' }] }, { type: 'text', text: ' fin' }] }] },
      { type: 'exercise', title: 'Exercice', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Question' }] }, { type: 'solution', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Réponse' }] }] }] },
      { type: 'image', src: '/static/complex-plane.svg', alt: 'Plan' },
      { type: 'youtube', title: 'Vidéo' },
    ]);
  });

  it('removes unsafe or unsupported elements, keeps their supported text and says so', () => {
    const html = `<p>Texte <em>important</em> <a href="javascript:alert(1)">lien</a><script>alert(1)</script><img src="https://example.com/x.png" onerror="alert(1)"></p>
      <iframe src="https://example.com"></iframe><ol><li>un</li></ol><table><tr><td>cellule</td></tr></table><h5 style="color:red">Petit titre</h5>`;
    const { notice, document, errors } = paste(html);
    expect(errors).toEqual([]);
    expect(notice).toContain('script');
    expect(notice).toContain('iframe');
    expect(notice).toContain('image externe');
    expect(notice).toContain('em');
    expect(notice).toContain('table');
    const json = JSON.stringify(document);
    for (const kept of ['Texte important lien', 'un', 'cellule', 'Petit titre']) expect(json).toContain(kept);
    for (const gone of ['alert', 'example.com', 'javascript', 'color']) expect(json).not.toContain(gone);
    expect(document.blocks.find((b) => b.type === 'list')).toEqual({ type: 'list', children: [{ type: 'item', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'un' }] }] }] });
    expect(document.blocks.at(-1)).toEqual({ type: 'heading', children: [{ type: 'text', text: 'Petit titre' }] });
  });

  it('copy and paste inside the editor preserves every fixture', () => {
    for (const fixture of FIXTURES) {
      const doc = parseLesson(fixture.source);
      const source: Editor = createEditor();
      loadInto(source, doc);
      const { dom } = source.view.serializeForClipboard(source.state.doc.slice(0, source.state.doc.content.size));
      const { document, errors, notice } = paste(dom.innerHTML);
      expect(notice, fixture.id).toBeNull();
      expect(errors, fixture.id).toEqual([]);
      expect(document.blocks, fixture.id).toEqual(doc.blocks);
    }
  });

  it('plain text paste becomes paragraphs without interpreting markup', () => {
    const editor = createEditor();
    editor.view.pasteText('<b>pas du gras</b>\n\nseconde ligne');
    const { document } = exportFrom(editor, meta);
    expect(document.blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: '<b>pas du gras</b>' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'seconde ligne' }] },
    ]);
  });
});
