# Decision log

Baseline: PROJECT_PLAN.md and IMPLEMENTATION_PLAN.md. Updated 2026-11-23. This file distinguishes selected direction from unverified assumptions.

## Settled direction

- Free account-based learning; bookmarks in MVP.
- Go modular monolith, PostgreSQL, React/TypeScript/TipTap Studio, server-rendered learning pages.
- YouTube video delivery; responsive web before native apps.
- Human review, two distinct author/reviewer people, separate publishing permission.
- Immutable submitted lesson snapshots including exercises, immutable media, transactional publication, audited withdrawal/restoration.
- One section and one subject for the pilot; invited internal users first.
- GitHub for developers; Studio for teachers.

## Open decisions

| Decision | Responsible role (person unassigned unless noted) | Needed by |
| --- | --- | --- |
| First BAC section, subject, real lesson | Maintainer + teacher | Content experiment |
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

Use the maintainer-supplied image at `assets/brand/learnoo-logo.png` as the repository logo. Preserve the original asset. No third-party reuse rights are implied.

## Maintainer pull-request workflow

GitHub forbids self-approval. Requiring the sole owner to approve their own PR made maintainer changes impossible to merge. Permit only @hadden-me to bypass the approval rule through a pull request, not through direct pushes. Keep mandatory PRs, resolved conversations, force-push prevention and deletion prevention in a separate ruleset with no bypass actors.

Contributor changes require the owner's approval. For owner-authored or release PRs, the owner reviews the diff and validation and explicitly merges. The platform cannot condition the owner exception on PR authorship; using it on contributor PRs is technically possible but contrary to the documented review policy. Revisit the exception when a second trusted maintainer exists. Educational author/reviewer separation remains unchanged.
