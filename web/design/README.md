# Shared design exports

The direction and component guidance live in [DESIGN.md](../../DESIGN.md). Shared semantic colours use Radix Blue, Slate, Amber, Red and Grass; see [palette provenance and roles](PALETTE.md). There is no Refero runtime or build dependency.

## Edit and generate

```sh
npm run design:build
npm run design:check
npm run design:contrast
```

Edit only `tokens.json` for shared values. The dependency-free generator writes `tokens.css`, `tailwind.css` and the identical Go-embedded `internal/rendering/static/tokens.css`. All three outputs are committed for inspection; `npm run assets` regenerates them before copying KaTeX assets. Rebuild/restart Go after changes because the binary embeds CSS.

## Plain CSS / Go

Load `/static/tokens.css` before `/static/site.css`, as the reader and local JSON lab already do. Use semantic variables such as `var(--learnoo-color-brand)` and `var(--learnoo-space-6)`. Do not load `tailwind.css` directly in a browser; its directives require Tailwind compilation.

## Tailwind v4 / future Studio

In a future Studio entry CSS file, import Tailwind first and this theme second (adjust the relative path to the entry location):

```css
@import "tailwindcss";
@import "../../design/tailwind.css";
```

The example path assumes `web/studio/src/app.css`. The theme imports the plain variables and uses `@theme inline` to map them to utilities. Examples: `bg-brand text-on-brand rounded-control px-6 min-h-touch`, `text-ink bg-surface`, `font-sans text-body leading-body`, and `max-w-reader`. Tailwind's default utilities remain available; use Learnoo semantic tokens for shared product styling. Do not duplicate this palette in a separate JavaScript config.

Tailwind is not installed in the reader or shipped to its browser. Studio bundler integration remains part of Studio implementation. See [Tailwind's official theme documentation](https://tailwindcss.com/docs/theme) for the v4 mapping syntax.

## Verify changes

Run the generation drift check, then the existing Go/browser checks in [DEVELOPMENT.md](../../docs/DEVELOPMENT.md). Inspect the French lesson, RTL fixture and JSON lab on mobile and desktop; keyboard focus and failures remain functional. Physical-phone, screen-reader and deployment checks are separate and must not be claimed from viewport emulation.
