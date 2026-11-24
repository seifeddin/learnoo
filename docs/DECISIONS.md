# Decision log

Baseline: PROJECT_PLAN.md and IMPLEMENTATION_PLAN.md. Updated 2026-11-23. This file distinguishes selected direction from unverified assumptions.

## Settled direction

- Free account-based learning; bookmarks in MVP.
- Go modular monolith, PostgreSQL, React/TypeScript/TipTap Studio, server-rendered learning pages.
- YouTube video delivery; responsive web before native apps.
- Human review, two distinct author/reviewer people, separate publishing permission.
- Immutable submitted lesson snapshots including exercises, immutable media, transactional publication, audited withdrawal/restoration.
- Pilot: Tunisian BAC Mathematics section, mathematics subject; invited internal users first.
- GitHub for developers; Studio for teachers.

## Open decisions

| Decision | Responsible role (person unassigned unless noted) | Needed by |
| --- | --- | --- |
| First mathematics chapter and lesson | Maintainer + teacher | Content fixture |
| Author and independent reviewer | Maintainer | Internal educational MVP |
| Go vs JS canonical renderer; math rendering details | Implementer + maintainer | End of content experiment |
| Exact content schema and SQL migrations | Implementer | Relevant workflow implementation |
| Email provider and verification-before-reading policy | Maintainer + implementer | Public registration |
| Runtime/library versions | Implementer | Prototype setup |
| Complete reuse/contribution terms and future video agreements | Maintainer + suitable reviewer | Before monetized distribution or broader legal commitments |
| Brand, domain, visual design | Maintainer + designer | Public pilot |
| Resource limits, backup retention and recovery targets | Infrastructure maintainer | Shared-server deployment |
| Privacy, deletion and retention policy | Maintainer + suitable reviewer | Public registration |

## Assumptions to validate

Shared hosting capacity, timeline, Arabic/French editor behavior, renderer complexity, and student registration friction. No capacity or delivery-date guarantee has been established.

## Repository bootstrap

Use the founder's personal repository initially. A GitHub organization can follow when team ownership is useful; it is not required to validate the prototype. Actual remote/protection state must be verified separately, not inferred from CODEOWNERS.

## Pilot simplifications

- Exercises and worked solutions are embedded in the lesson revision. Independent exercise identities, cross-lesson reuse, and exercise dependency withdrawal lookup are deferred.
- Only one active draft/review candidate per lesson. Submission freezes that snapshot; requested corrections create its successor. Enforce this constraint in the database. Version checks also prevent two editor tabs overwriting each other.
- Keep the locked publication-base comparison; no reconciliation interface in the pilot. A stale candidate must be corrected and reviewed again.
- First test restricted Go HTML rendering with locally hosted browser-side KaTeX. Measure mobile output and payload before adding a server-side JavaScript runtime. Renderer choice remains subject to results.
- Keep mandatory accounts. Do not add public sample lessons without a separate product decision.
- The immediate experiment needs no registration, dashboard, or production deployment. Its unreviewed fixture must be clearly labeled. Real permissions are required when the editorial workflow is implemented.
- `main` is the stable branch; `develop` is integration. Contributors fork and propose pull requests to `develop`; only @hadden-me validates incoming contributions. Release PRs target `main`. Both branches must enforce code-owner review and block force pushes/deletion.

## Rights and contributions

Commercial use of original code and educational content is prohibited without permission, including commercial educational institutions. Publish an interim rights notice, not the unreviewed custom license draft. Complete reuse and inbound contribution terms remain pending; external code/content acceptance is deferred. Planning discussion is open.

## Brand asset

Use the corrected maintainer-supplied YouTube banner at `assets/brand/learnoo-banner.png`. The multicolour infinity mark is the logo reference; the previous cartoon is superseded. Channel: https://www.youtube.com/@learnoo5344. Preserve the supplied banner; no third-party reuse rights or verification of its historical promotional claims are implied.

## Maintainer pull-request workflow

GitHub forbids self-approval. Requiring the sole owner to approve their own PR made maintainer changes impossible to merge. Permit only @hadden-me to bypass the approval rule through a pull request, not through direct pushes. Keep mandatory PRs, resolved conversations, force-push prevention and deletion prevention in a separate ruleset with no bypass actors.

Contributor changes require the owner's approval. For owner-authored or release PRs, the owner reviews the diff and validation and explicitly merges. The platform cannot condition the owner exception on PR authorship; using it on contributor PRs is technically possible but contrary to the documented review policy. Revisit the exception when a second trusted maintainer exists. Educational author/reviewer separation remains unchanged.

## Mathematics pilot and teacher participation

The maintainer selected the BAC Mathematics section and mathematics subject. Teachers have expressed interest, but none is formally assigned as author or independent reviewer. Do not name or credit a confirmed teaching team yet.

The renderer experiment may use a clearly labeled, unreviewed handwritten JSON fixture from LRN-001 without waiting for TipTap (LRN-003) or final educational approval. LRN-003 must later verify that editor output matches the same schema and fixture. A reviewed educational pilot still requires a confirmed author and separate qualified reviewer. The first chapter remains undecided.

## Renderer experiment fixture

The maintainer clarified the scientific-content language policy: French is the primary instructional language for BAC scientific subjects; teachers may explain in Arabic or Tunisian dialect with scientific terminology retained in French. This is distinct from interface localization and separate translated lessons. Do not force Arabic into every scientific lesson; use separate fixtures for technical directionality coverage.

Use complex numbers (algebraic form and modulus) provisionally for the technical test. The sample is French; intentionally mixed Arabic/French content lives in a separate RTL fixture. This does not select the first published chapter or claim teacher approval. The initial video slot has no chosen video.

The prototype schema is a small typed JSON format; TipTap compatibility remains to be implemented and tested in LRN-003. The initial program is bound to loopback and is not the authenticated learning platform.

## Shared design foundations

The maintainer selected Udemy-inspired styling as an adjustable starting point. Adapt the Refero reference into Learnoo design guidance, canonical JSON tokens, generated CSS variables and a Tailwind v4 theme. Keep the infinity identity, green/orange accents, French scientific content with optional Arabic explanations, lightweight delivery and the existing motion policy. Use one token source across the Go reader and future Studio; do not import a foreign DESIGN.md as project authority. This does not complete LRN-002 wireframes or finalize the Studio build. See [DESIGN.md](../DESIGN.md).
## Project agent skills

Maintain three concise skills in `.agents/skills`: editorial invariants, security and code review. `.claude/skills` links to the same directory. Existing project documents remain authoritative; skills do not settle open licensing, email-verification, renderer or operational decisions. Discovery paths are documented in [CONTRIBUTING.md](../CONTRIBUTING.md), including reported Claude Code discovery, the remaining Codex skill-selector check and Windows setup caveat. External UI skills are optional, pinned recommendations only; no third-party skills are copied into the repo.

Defer `learnoo-rtl-math` until LRN-004's remaining renderer checks are resolved, using the [existing experiment results](RENDERER_EXPERIMENT.md). Defer `learnoo-ui` until LRN-002's wireframes establish implementable guidance. The homepage concept is not a completed wireframe package. No teaching validation or operational completion is implied by these skills.

## Refero palette adoption for the landing preview

The maintainer requested direct use of the Udemy reference exports on 2026-11-23, superseding the earlier green/orange visual adaptation. All four extended exports are retained under web/design/refero-udemy; the landing page loads the exported variables. Preserve the official Learnoo artwork. Existing educational, authentication and motion requirements remain in force. This is a local visual preview, not a launch or a completed UI kit.

## Future catalogue homepage concept

On 2026-11-23 the maintainer requested a landing page depicting the populated future product across BAC sections and courses. The local preview now includes an illustrative catalogue with browser-side section/subject/search filters. Course and account dialogs clearly distinguish the concept from published content and implemented accounts. This does not expand the mathematics pilot, establish curriculum alignment, or authorize public deployment.

## Shared Blue and Slate palette and prototype fixes

On 2026-11-23 the maintainer approved replacing the temporary direct Udemy palette with Learnoo semantic tokens derived from Radix Blue/Slate, plus Amber/Grass/Red statuses. This supersedes the earlier direct Refero-export adoption. Both reader and catalogue deliberately use the shared system; unreviewed warnings have independent amber tokens. Refero exports remain ignored local references, with no build or runtime dependency. The served wordmark is a 12 KB WebP. Arabic headings and inline punctuation are corrected, and browser tests always start an isolated server on a configurable test port (default 18080). These changes do not establish production accessibility or teacher validation.
