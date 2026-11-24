# Renderer experiment

The first local experiment uses one Go renderer for the reader and JSON preview, with locally served browser-side KaTeX. This supports continuing with the selected Go approach; no JavaScript rendering server is needed for this sample. It does not establish production capacity or complete the editor integration.

Run it using [DEVELOPMENT.md](DEVELOPMENT.md). The French complex-numbers fixture is original technical test material, explicitly unreviewed. Its chapter choice, curriculum alignment and teaching quality still need teachers. Arabic/French directionality is tested separately. See [fixture provenance](fixtures/README.md).

## Measurements

Measured on November 23, 2026, on an Apple M1 Pro, Go 1.25.4, and Playwright Chromium, using a cold browser context and a 390 × 844 viewport. Network requests used localhost, without throttling, compression or cache reuse. These are desktop measurements with a mobile viewport, not results from a physical phone or Tunisian mobile network.

| Observation | Result |
| --- | --- |
| Total initial transfer, including HTML | 383,069 bytes (374 KiB) |
| KaTeX script, CSS and requested fonts | 370,162 bytes (361 KiB) |
| Formula rendering | 18 formulas, 6.6 ms, zero errors |
| DOMContentLoaded | 34.2 ms on localhost |
| External requests for sample lesson | None |
| Go render benchmark, initial fixture | About 0.246 ms/op, 112,229 B/op, 3,515 allocs/op |

The benchmark preceded splitting one long solution formula into two display blocks for mobile readability. It measures rendering only, not concurrent requests, database work or server sizing. Timing varies between runs. Reproduce browser measurements with `npm run test:browser`; the raw report is written to `test-results/mobile-metrics.json`.

KaTeX accounts for most of the initial payload. Before public delivery, measure compression and static-asset caching on the actual hosting stack, then test a low-end phone and a slow connection. This experiment intentionally sends `no-store`. The original large brand banner is not part of the lesson payload.

## Verification

Go race tests and `go vet` pass. Six browser tests pass, covering mobile and RTL layout, expandable solutions, canonical reader/preview equality, local JSON save/reopen, unsafe markup, invalid formulas and unavailable KaTeX. Desktop and mobile screenshots were inspected. Long formulas can scroll within their own block without widening the page.

The JSON decoder rejects unknown fields, unsafe node/media types, invalid nesting, oversized documents and excess depth. HTML is escaped, KaTeX trust is disabled, and loopback host checks and CSP constrain the local experiment. These checks are not a production security audit.

## Remaining work

- Confirm the chapter, author, independent reviewer, curriculum references and educational rights with teachers; issue 1 remains open.
- Test on a physical phone and throttled network, with compression and caching representative of deployment.
- Select a permitted educational video and verify the complete click-to-load experience. The sample currently displays a pending-video notice.
- LRN-003 added a TipTap Studio prototype with a validated adapter to this format (see [DEVELOPMENT.md](DEVELOPMENT.md)); server-side drafts remain later work.
- Add real accounts, persistence and the editorial workflow before any public application deployment. The local experiment must not be exposed publicly.
