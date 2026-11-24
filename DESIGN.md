# Learnoo design foundations

Status: initial implementation approved as a starting point, adjustable through review. This is a styling foundation, not completion of LRN-002's wireframes or a production UI kit.

## Direction

Learnoo uses its own semantic colour system based on [Radix Colors](https://www.radix-ui.com/colors): Blue for actions, Slate for neutral surfaces and text, Amber for unreviewed content, Red for errors and Grass for success. Preserve the original multicolour logo. The catalogue layout takes inspiration from course marketplaces; it does not copy their brand palette. [GOV.UK guidance](https://design-system.service.gov.uk/) informs readable forms, error messages and focus behavior, not the visual identity. [MOTION.md](MOTION.md) remains authoritative.

The source palette mapping and MIT attribution are recorded in [web/design/PALETTE.md](web/design/PALETTE.md). Local Refero exports are ignored reference material, never a build input or shipped asset. The reader and landing page intentionally share the same semantic tokens; changes must be checked on both.

## One source of truth

Edit [web/design/tokens.json](web/design/tokens.json), then run `npm run design:build`. Commit the source and generated outputs together. `npm run design:check` detects drift.

| File | Role |
| --- | --- |
| [tokens.json](web/design/tokens.json) | Canonical grouped values; simple project JSON, not a claimed DTCG interchange schema |
| [tokens.css](web/design/tokens.css) | Generated `--learnoo-*` CSS variables |
| [tailwind.css](web/design/tailwind.css) | Generated Tailwind v4 `@theme inline` mappings |
| [Reader tokens](internal/rendering/static/tokens.css) | Generated identical copy embedded by Go |
| [Reader styles](internal/rendering/static/site.css) | Hand-authored component/layout rules consuming tokens |

See [integration instructions](web/design/README.md). Never independently tune the generated CSS or Tailwind values. Layout-specific sizes may remain in component CSS; don't tokenize every measurement.

## Palette and typography

White content surfaces sit on a light neutral canvas. Ink is near-black; muted text must remain readable. Blue identifies links and actions. Amber is reserved for unreviewed notices and teaching cautions; text uses semantic ink and muted roles. Red indicates errors. Always pair status colours with explicit text; colour alone never means pedagogical approval.

Use the tokenized system sans stack initially: no font downloads or Udemy font assets. Body text is 17px at the default root size with 1.7 line-height; section headings 24px, lesson titles 32px. A 48rem outer reader width keeps explanations focused; the general page maximum is 75rem. Use rem-based sizes to respect browser settings. KaTeX owns mathematical typography.

Scientific lessons use French. Teachers may add Arabic or Tunisian-dialect explanations with scientific terms in French. Mark language and direction on the relevant block; use logical spacing properties. Arabic uses its own fallback stack, normal letter spacing and generous line-height. Isolate formulas LTR inside RTL paragraphs. Interface localization remains independent of lesson language.

## Components and states

- Buttons: 8px corners, minimum 44px target height, outlined blue action on the catalogue; solid blue action in reader tools, outlined secondary actions, explicit hover/focus/disabled states. Group actions by priority; do not invent commerce controls.
- Inputs: visible label, distinct border, legible content and errors, visible keyboard focus. Explain failure in text and preserve entered work.
- Content: clear heading order; neutral surfaces with limited borders. Use separators for teaching notes, neutral formula blocks, expandable worked solutions and an honest video placeholder when none is selected.
- Navigation: readable links, wrapping at narrow widths, subject/chapter context. Planned hierarchy is section → subject → chapter → lesson; the prototype navigation remains a technical demo.
- Review status: explicitly distinguish unreviewed, in review, approved and withdrawn. Styling never grants access or changes editorial state.

Target at least 4.5:1 contrast for normal text, 3:1 for large text and meaningful control/focus boundaries. Verify actual foreground/background pairs. Preserve keyboard navigation, visible focus, useful reading without video, and horizontal scrolling within long formulas instead of page overflow. No decorative motion is introduced; future motion must follow reduced-motion requirements in MOTION.md.

## Brand and delivery

The original brand reference is [the supplied banner](assets/brand/learnoo-banner.png). Preserve it. Its multicolour infinity mark is the reference, not the superseded cartoon. The large original must not be loaded on every lesson; the landing uses a 510 × 170 transparent WebP wordmark (12,236 bytes), with raster masters kept separately. Use numerical examples such as `z = 3 + 2i` in promotional mockups to avoid the unintended Tunisian reading identified by the maintainer.

CSS variables serve the Go reader directly; Tailwind is build-time tooling for the planned Studio and must not add a browser runtime. No external font/CDN requests are needed for these foundations.

## Remaining design work

Draft LRN-002 wireframes for the mobile reader, Studio editor, reviewer decision, registration and dashboard are in [docs/design/wireframes](docs/design/wireframes/README.md), pending maintainer, teacher and student review. They are references, not implemented flows. Preview and the student reader must continue sharing the canonical lesson renderer.

## Landing preview

The local homepage is a projection of the fully populated future product, requested by the maintainer, rather than a pilot recruitment page. It uses a search-led header, subject navigation, a section selector and a four-column course catalogue (two columns on phones). The full recreated LEARNOO wordmark is used in the header and footer. A compact introductory panel leads to section selection; a dark instructional band separates the catalogue from the community invitation.

The landing stylesheet consumes Learnoo’s generated tokens: light Slate surfaces, outlined Blue actions, 32px primary heading, 24px section headings, 8px standard corners, 16px panels, 24px card rhythm and 48px section separation. Course thumbnails are local, original SVG diagrams and typographic compositions. No external fonts, animation or image downloads are required. The reader retains its separate 17px/1.7 lesson typography.

Eight sample course entries and seven BAC sections are illustrative interface data, not an approved curriculum or publication claim. A visible preview strip identifies this throughout the concept. Section, subject and accent-insensitive title search combine in the browser; empty results offer a reset. Course actions explain the preview boundary in a native dialog; only the complex-numbers example links to the existing unreviewed technical renderer. Account actions explain that accounts are not available and collect no personal information. Without JavaScript, the complete catalogue and a direct technical-example link remain readable.

This interaction model is a local design experiment, not the architecture for production search, accounts or course access. Existing editorial, authentication, accessibility and motion requirements remain unchanged. Do not fabricate testimonials, instructors, ratings or certifications. Colour never substitutes for a written review status.

## Verification

Run `npm run design:contrast` for actual foreground/background pairs (WCAG AA text and control thresholds), plus `design:check` for generated-file consistency. Normal and hover actions must differ; keyboard focus has a visible offset outline. Palette step numbers alone are not a contrast guarantee. Arabic body line spacing is generous, while headings retain the heading token. The unreviewed notice uses dedicated warning tokens independent of brand styling.
