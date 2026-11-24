# Prototype lesson fixtures

The runnable JSON files are in `internal/rendering/fixtures/` and embedded in the local Go prototype.

- `complex-numbers.json`: provisional French complex-numbers sample for the BAC Mathematics section, covering algebraic form, real/imaginary parts and modulus. It is original explanatory text written for this technical experiment, not copied from a textbook. Curriculum alignment is unverified; no teacher author/reviewer is assigned.
- `bidi.json`: deliberately mixed French/Arabic text for directionality tests, separate from the educational sample. It is not intended as a published lesson.
- `failure.json`: intentionally malformed TeX to exercise readable failure handling.

The diagram in `internal/rendering/static/complex-plane.svg` is an original code-authored fixture. The video slot is deliberately empty pending teacher selection and rights review; no random video is endorsed. Reader tests can use an 11-character synthetic YouTube ID without loading an external video.

All documents are marked `unreviewed`. This technical choice does not finalize the first published chapter. A teacher must confirm curriculum fit and another qualified person must review the content before it is used as approved learning material.

## Experimental content contract

This is a small typed JSON format, not TipTap's native schema. LRN-003 adds a validated two-way adapter in `web/studio/src/schema/` without changing it (still `schemaVersion: 1`). The Studio exports exactly this format; all three fixtures round-trip byte-identical. Export canonicalises adjacent identical text and nested `strong`, and drops empty paragraphs/lists. The adapter rejects `lang`/`dir` outside paragraphs, headings and text, and `title` outside callouts, exercises and videos, because the reader ignores them there. Validation parity cases live in `web/studio/test/contract/cases.json` and run in both Go and TypeScript.

Document fields: `schemaVersion: 1`, `title`, `language` (`fr`/`ar`), `status: unreviewed`, `objective`, `blocks`.

Block types: `paragraph`, `heading`, `list`/`item`, `callout`, `displayMath`, `image`, `youtube`, `exercise`/`solution`. Inline types: `text`, `math`, `strong`. Inline nodes belong inside paragraphs/headings/strong; solutions belong inside exercises. `lang` and `dir` are allowlisted. Leaf nodes have text; containers have children. Images reference an explicitly allowlisted local asset. YouTube accepts only an ID (or an empty pending-selection slot), never arbitrary HTML or URLs.

Limits: 128 KiB JSON, 500 nodes, depth 12, 2,000 characters per formula. Unknown fields/types, invalid nesting, nonlocal images and malformed video IDs are rejected. Field names are exact and case-sensitive: `SRC` or `ſrc` is an unknown field, not `src` (Go's default JSON matching would fold them). A key may appear only once per object, at every level (compared after unescaping, so `"\u0073rc"` duplicates `"src"`), and nothing but whitespace may follow the document. Go (`internal/strictjson`) and the Studio enforce the same rules. Educational correctness is not established by schema validation.
