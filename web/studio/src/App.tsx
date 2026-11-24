import { useCallback, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { lessonExtensions } from './schema/extensions';
import { editorToLesson, type Metadata } from './schema/adapter';
import { prepareLesson, prepareSource, type PreparedLesson } from './schema/importer';
import { ALLOWED_IMAGES, LessonError, YOUTUBE_ID, serializeLesson, type LessonDocument } from './schema/lesson';
import { describePaste, sanitizePastedHTML } from './schema/paste';
import { reopenDraft, saveDraft } from './schema/storage';
import { FIXTURES } from './fixtures';
import { renderTex } from './math';

type Status = { text: string; error?: boolean };

const EMPTY: Metadata = { title: '', language: 'fr', objective: '' };

export function App() {
  const [meta, setMeta] = useState<Metadata>(EMPTY);
  const [status, setStatus] = useState<Status>({ text: 'Document vide. Rien n’est publié : tout reste sur cet appareil.' });
  const [errors, setErrors] = useState<string[]>([]);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [exported, setExported] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const pasteRef = useRef(setPasteNotice);
  pasteRef.current = setPasteNotice;
  const fileRef = useRef<HTMLInputElement>(null);
  const ids = { title: useId(), language: useId(), objective: useId(), example: useId() };

  const editor = useEditor({
    extensions: lessonExtensions,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: { class: 'studio-editor', 'aria-label': 'Contenu de la leçon', 'aria-multiline': 'true', role: 'textbox' },
      transformPastedHTML: (html) => {
        const result = sanitizePastedHTML(html);
        pasteRef.current(describePaste(result.report));
        return result.html;
      },
    },
  });

  /** Export the current editor content; returns null (and reports why) when it cannot be saved. Never changes the editor. */
  const exportLesson = useCallback((): { doc: LessonDocument; json: string } | null => {
    if (!editor) return null;
    const result = editorToLesson(editor.getJSON(), meta);
    setErrors(result.errors);
    if (result.errors.length > 0) {
      setStatus({ text: 'Le document ne respecte pas le format restreint ; rien n’a été enregistré.', error: true });
      return null;
    }
    try {
      const json = serializeLesson(result.document);
      setExported(json);
      return { doc: result.document, json };
    } catch (error) {
      setStatus({ text: `Export impossible, document conservé dans l’éditeur : ${(error as Error).message}`, error: true });
      return null;
    }
  }, [editor, meta]);

  /** Replace the editor content with an already validated and serialised document. */
  const load = useCallback(
    (prepared: PreparedLesson, message: string) => {
      if (!editor) return;
      const { doc, content, json } = prepared;
      editor.commands.setContent(content, { emitUpdate: false });
      setMeta({ title: doc.title, language: doc.language, objective: doc.objective });
      setErrors([]);
      setPasteNotice(null);
      setExported(json);
      setStatus({ text: message });
    },
    [editor],
  );

  const importSource = useCallback(
    (source: string, message: string) => {
      if (!editor) return;
      let prepared: PreparedLesson;
      try {
        prepared = prepareSource(editor.schema, source);
      } catch (error) {
        // Nothing has been changed yet, so the current document really is preserved.
        setStatus({ text: `Import refusé, document actuel conservé : ${(error as Error).message}`, error: true });
        return;
      }
      load(prepared, message);
    },
    [editor, load],
  );

  const onSave = () => {
    const result = exportLesson();
    if (!result) return;
    try {
      saveDraft(result.doc);
      setStatus({ text: 'Enregistré sur cet appareil uniquement. Non publié, non relu.' });
    } catch (error) {
      setStatus({ text: `Enregistrement impossible : ${error instanceof LessonError ? error.message : 'stockage du navigateur indisponible.'}`, error: true });
    }
  };

  const onReopen = () => {
    if (!editor) return;
    let prepared: PreparedLesson | null;
    try {
      const doc = reopenDraft();
      prepared = doc && prepareLesson(editor.schema, doc);
    } catch (error) {
      setStatus({ text: `Sauvegarde illisible, document actuel conservé : ${(error as Error).message}`, error: true });
      return;
    }
    if (!prepared) setStatus({ text: 'Aucune sauvegarde sur cet appareil.' });
    else load(prepared, 'Sauvegarde rouverte.');
  };

  const onDownload = () => {
    const result = exportLesson();
    if (!result) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([result.json + '\n'], { type: 'application/json' }));
    link.download = 'lecon-non-relue.json';
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus({ text: 'JSON exporté (format restreint, schéma 1).' });
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) importSource(await file.text(), `Fichier « ${file.name} » importé.`);
  };

  const onPreview = async () => {
    const result = exportLesson();
    if (!result) return;
    setPreviewing(true);
    try {
      const response = await fetch('/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: result.json });
      const text = await response.text();
      if (!response.ok) {
        setStatus({ text: `Le renderer Go refuse le document : ${text.trim()}`, error: true });
        return;
      }
      setPreviewHtml(text);
      setStatus({ text: 'Aperçu généré par le renderer Go, identique à la page élève.' });
    } catch {
      setStatus({ text: 'Le renderer Go ne répond pas (go run ./cmd/renderer). Le dernier aperçu est conservé.', error: true });
    } finally {
      setPreviewing(false);
    }
  };

  const dir = meta.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="studio">
      <header className="studio-header">
        <p className="brand">LEARNOO <span>Studio · prototype local</span></p>
        <p className="notice" role="note">
          Prototype local · Contenu non relu par un enseignant. Rien n’est publié ni envoyé ailleurs qu’au renderer local.
        </p>
      </header>

      <main className="studio-layout">
        <section className="panel" aria-labelledby="editor-heading">
          <h1 id="editor-heading">Éditer une leçon</h1>
          <div className="fields">
            <label htmlFor={ids.title}>Titre</label>
            <input id={ids.title} value={meta.title} maxLength={240} dir="auto" onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            <label htmlFor={ids.language}>Langue du document</label>
            <select id={ids.language} value={meta.language} onChange={(e) => setMeta({ ...meta, language: e.target.value as Metadata['language'] })}>
              <option value="fr">Français</option>
              <option value="ar">Arabe (droite à gauche)</option>
            </select>
            <label htmlFor={ids.objective}>Objectif</label>
            <textarea id={ids.objective} value={meta.objective} rows={2} dir="auto" onChange={(e) => setMeta({ ...meta, objective: e.target.value })} />
          </div>

          {editor && <Toolbar editor={editor} />}
          <div className="editor-frame" lang={meta.language} dir={dir}>
            <EditorContent editor={editor} />
          </div>
          {pasteNotice && (
            <p className="paste-notice" role="status">
              {pasteNotice}
            </p>
          )}
          {editor && <Inspector editor={editor} />}

          <div className="actions">
            <button type="button" className="primary" onClick={onSave}>
              Enregistrer sur cet appareil
            </button>
            <button type="button" onClick={onReopen}>
              Rouvrir la sauvegarde
            </button>
            <button type="button" onClick={onDownload}>
              Exporter le JSON
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}>
              Importer un JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
          </div>
          <div className="fields inline">
            <label htmlFor={ids.example}>Charger un exemple technique</label>
            <select
              id={ids.example}
              value=""
              onChange={(e) => {
                const fixture = FIXTURES.find((f) => f.id === e.target.value);
                if (fixture) importSource(fixture.source, `Exemple « ${fixture.label} » chargé. Contenu non relu.`);
              }}
            >
              <option value="">Choisir…</option>
              {FIXTURES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <p id="studio-status" className={status.error ? 'status error' : 'status'} role="status" aria-live="polite">
            {status.text}
          </p>
          {errors.length > 0 && (
            <ul className="errors" aria-label="Problèmes à corriger">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <details className="json-output">
            <summary>JSON restreint exporté</summary>
            <pre dir="ltr" data-testid="exported-json">{exported || 'Pas encore exporté.'}</pre>
          </details>
        </section>

        <section className="panel" aria-labelledby="preview-heading">
          <h2 id="preview-heading">Aperçu élève</h2>
          <p className="hint">Le Studio n’a pas son propre rendu : l’aperçu vient du renderer Go, comme la page élève.</p>
          <button type="button" className="primary" onClick={onPreview} disabled={previewing}>
            Prévisualiser avec le renderer Go
          </button>
          <iframe id="preview-frame" title="Aperçu de la leçon (renderer Go)" srcDoc={previewHtml} />
        </section>
      </main>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      heading: e.isActive('heading'),
      list: e.isActive('bulletList'),
      arText: e.isActive('lang', { lang: 'ar' }),
      frText: e.isActive('lang', { lang: 'fr' }),
      canSolution: e.can().wrapIn('solution'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const insertAtom = (content: { type: string; attrs: Record<string, string> }) => {
    const from = editor.state.selection.from;
    editor.chain().focus().insertContent(content).run();
    // Select the new node so its properties can be edited right away.
    const pos = content.type === 'inlineMath' ? from : findAtomBefore(editor, editor.state.selection.from, content.type);
    if (pos !== null) editor.commands.setNodeSelection(pos);
  };

  const inlineMath = () => {
    const { from, to, empty } = editor.state.selection;
    const latex = empty ? '' : editor.state.doc.textBetween(from, to);
    editor.chain().focus().deleteSelection().run();
    insertAtom({ type: 'inlineMath', attrs: { latex } });
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Mise en forme">
      <div role="group" aria-label="Texte">
        <B label="Titre de section" pressed={state.heading} onClick={() => editor.chain().focus().toggleNode('heading', 'paragraph').run()} />
        <B label="Gras" pressed={state.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
        <B label="Liste" pressed={state.list} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      </div>
      <div role="group" aria-label="Mathématiques">
        <B label="Formule en ligne" onClick={inlineMath} />
        <B label="Formule centrée" onClick={() => insertAtom({ type: 'displayMath', attrs: { latex: '' } })} />
      </div>
      <div role="group" aria-label="Blocs">
        <B label="Encadré" onClick={() => editor.chain().focus().wrapIn('callout').run()} />
        <B label="Exercice" onClick={() => editor.chain().focus().wrapIn('exercise').run()} />
        <B label="Solution" disabled={!state.canSolution} onClick={() => editor.chain().focus().wrapIn('solution').run()} />
        <B label="Image locale" onClick={() => insertAtom({ type: 'image', attrs: { src: ALLOWED_IMAGES[0], alt: '' } })} />
        <B label="Vidéo YouTube" onClick={() => insertAtom({ type: 'youtube', attrs: { title: '', videoId: '' } })} />
      </div>
      <div role="group" aria-label="Langue du texte sélectionné">
        <B label="Texte en arabe" pressed={state.arText} onClick={() => editor.chain().focus().setMark('lang', { lang: 'ar', dir: 'rtl' }).run()} />
        <B label="Texte en français" pressed={state.frText} onClick={() => editor.chain().focus().setMark('lang', { lang: 'fr', dir: 'ltr' }).run()} />
        <B label="Langue du document" onClick={() => editor.chain().focus().unsetMark('lang').run()} />
      </div>
      <div role="group" aria-label="Historique">
        <B label="Annuler" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
        <B label="Rétablir" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
      </div>
    </div>
  );
}

function B({ label, onClick, pressed, disabled }: { label: string; onClick: () => void; pressed?: boolean; disabled?: boolean }) {
  // mousedown is cancelled so the editor keeps its selection; keyboard users activate with Enter/Space.
  return (
    <button type="button" aria-pressed={pressed} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {label}
    </button>
  );
}

function findAtomBefore(editor: Editor, pos: number, type: string): number | null {
  let found: number | null = null;
  editor.state.doc.nodesBetween(Math.max(0, pos - 2), Math.min(editor.state.doc.content.size, pos + 2), (node, at) => {
    if (node.type.name === type) found = at;
  });
  return found;
}

/** TeX textarea with a live typeset preview, or the TeX error, rendered as the reader does. */
export function FormulaField({ label, tex, display, onChange }: { label: string; tex: string; display: boolean; onChange: (value: string) => void }) {
  const id = useId();
  const result = useMemo(() => (tex === '' ? null : renderTex(tex, display)), [tex, display]);
  const invalid = result !== null && !result.ok;
  return (
    <>
      <label>
        {label}
        <textarea className="tex" dir="ltr" rows={2} maxLength={2000} value={tex} aria-invalid={invalid} aria-describedby={`${id}-preview`} onChange={(e) => onChange(e.target.value)} />
      </label>
      <div id={`${id}-preview`} className="tex-preview" aria-live="polite">
        {result === null && <p className="hint">Saisissez une formule TeX ; l’aperçu s’affiche ici.</p>}
        {result?.ok && <div className="tex-rendered" dir="ltr" dangerouslySetInnerHTML={{ __html: result.html }} />}
        {result && !result.ok && <p className="tex-error">{result.error}</p>}
      </div>
    </>
  );
}

/** Properties of the selected formula, media or container, and of the current block. */
function Inspector({ editor }: { editor: Editor }) {
  const ctx = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { selection } = e.state;
      const atom = selection instanceof NodeSelection ? { pos: selection.from, type: selection.node.type.name, attrs: selection.node.attrs } : null;
      let container: { pos: number; type: string; title: string } | null = null;
      let block: { pos: number; lang: string; dir: string } | null = null;
      const $from = selection.$from;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (!block && (node.type.name === 'paragraph' || node.type.name === 'heading')) block = { pos: $from.before(d), lang: node.attrs.lang ?? '', dir: node.attrs.dir ?? '' };
        if (!container && (node.type.name === 'callout' || node.type.name === 'exercise')) container = { pos: $from.before(d), type: node.type.name, title: node.attrs.title };
      }
      return { atom, container, block };
    },
  });
  if (!ctx) return null;
  const set = (pos: number, attr: string, value: string | null) => editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, attr, value));
  const { atom, container, block } = ctx;
  const videoId = atom?.type === 'youtube' ? String(atom.attrs.videoId) : '';

  return (
    <fieldset className="inspector">
      <legend>Propriétés de la sélection</legend>
      {atom && (atom.type === 'inlineMath' || atom.type === 'displayMath') && (
        <FormulaField
          label={atom.type === 'inlineMath' ? 'Formule en ligne (TeX)' : 'Formule centrée (TeX)'}
          tex={String(atom.attrs.latex)}
          display={atom.type === 'displayMath'}
          onChange={(value) => set(atom.pos, 'latex', value)}
        />
      )}
      {atom?.type === 'image' && (
        <>
          <label>
            Ressource locale autorisée
            <select value={String(atom.attrs.src)} onChange={(e) => set(atom.pos, 'src', e.target.value)}>
              {ALLOWED_IMAGES.map((src) => (
                <option key={src}>{src}</option>
              ))}
            </select>
          </label>
          <label>
            Texte alternatif (obligatoire)
            <input dir="auto" maxLength={1000} value={String(atom.attrs.alt)} onChange={(e) => set(atom.pos, 'alt', e.target.value)} />
          </label>
        </>
      )}
      {atom?.type === 'youtube' && (
        <>
          <label>
            Titre de la vidéo
            <input dir="auto" maxLength={240} value={String(atom.attrs.title)} onChange={(e) => set(atom.pos, 'title', e.target.value)} />
          </label>
          <label>
            Identifiant YouTube (11 caractères, pas d’URL ; vide = à sélectionner)
            <input dir="ltr" maxLength={11} value={videoId} aria-invalid={videoId !== '' && !YOUTUBE_ID.test(videoId)} onChange={(e) => set(atom.pos, 'videoId', e.target.value.trim())} />
          </label>
        </>
      )}
      {container && (
        <label>
          {container.type === 'callout' ? 'Titre de l’encadré' : 'Titre de l’exercice'}
          <input dir="auto" maxLength={240} value={container.title} onChange={(e) => set(container.pos, 'title', e.target.value)} />
        </label>
      )}
      {block && (
        <div className="row">
          <label>
            Langue du paragraphe
            <select
              value={block.lang}
              onChange={(e) => {
                const lang = e.target.value || null;
                let tr = editor.state.tr.setNodeAttribute(block.pos, 'lang', lang);
                // Choosing a language also sets its usual direction; it stays editable below.
                if (lang) tr = tr.setNodeAttribute(block.pos, 'dir', lang === 'ar' ? 'rtl' : 'ltr');
                editor.view.dispatch(tr);
              }}
            >
              <option value="">Celle du document</option>
              <option value="fr">Français</option>
              <option value="ar">Arabe</option>
            </select>
          </label>
          <label>
            Direction
            <select value={block.dir} onChange={(e) => set(block.pos, 'dir', e.target.value || null)}>
              <option value="">Héritée</option>
              <option value="ltr">Gauche à droite</option>
              <option value="rtl">Droite à gauche</option>
              <option value="auto">Automatique</option>
            </select>
          </label>
        </div>
      )}
      {!atom && !container && !block && <p className="hint">Sélectionnez une formule, un média ou un paragraphe.</p>}
    </fieldset>
  );
}
