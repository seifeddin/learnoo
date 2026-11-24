# Learnoo colour roles

Palette source: Radix Colors `src/light.ts`, commit `dbdb85470547c7d34b9001f48fddb08ded335979`:
https://github.com/radix-ui/colors/blob/dbdb85470547c7d34b9001f48fddb08ded335979/src/light.ts

The MIT notice is preserved in [licenses/radix-colors.txt](licenses/radix-colors.txt). No Radix runtime or React dependency is added. Values are recorded in the shared tokens; components consume roles, not raw palette names.

| Role | Source |
| --- | --- |
| Canvas / surface | Slate 1 / white |
| Subtle surface / panel | Slate 2 |
| Main / secondary text | Slate 12 / Slate 11 |
| Decorative border / interactive boundary | Slate 6 / Slate 10 |
| Action / hover / action text | Blue 11 / Blue 12 / white on filled actions |
| Soft action / selection | Blue 2 / Blue 5 |
| Keyboard focus | Blue 11, 3px outline with 4px offset |
| Unreviewed text / background / border | Amber 12 / Amber 3 / Amber 8 |
| Teaching caution heading | Amber 11 on white |
| Success text / background | Grass 11 / Grass 3 |
| Error text / background | Red 11 / Red 3 |
| Inverted section / secondary text | Slate 12 / Slate 6 |

Blue 9 with white text is not assumed accessible for small labels. Our filled actions use Blue 11 and hover Blue 12. Slate 8 is not assumed sufficient as an interactive boundary; use Slate 10. Amber 11 on Amber 3 fails our normal-text threshold, so the warning uses Amber 12. These are measured combinations, not automatic guarantees from scale steps.

`npm run design:contrast` checks 36 pairs. Update it when adding a new pairing. For diagrams, the SVG artwork uses the corresponding Blue, Slate and Amber colours; coloured paths are accompanied by geometry or labels.

## Wordmark delivery

The original recreated PNG masters are published separately in logo PR 21. The page serves only `internal/rendering/static/learnoo-wordmark.webp`, generated with:

```sh
cwebp -resize 510 0 -q 85 assets/brand/learnoo-wordmark-recreated.png -o internal/rendering/static/learnoo-wordmark.webp
```

The WebP preserves alpha and the original aspect ratio. Header and footer share the same URL. The browser regression requires it to remain under 20 KB. The original banner is not embedded in the local server.
