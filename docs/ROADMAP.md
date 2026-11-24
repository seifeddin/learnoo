# Roadmap and implementation backlog

Status: planned, not completed. No fixed delivery date. Keep the first experiment smaller than the internal MVP. Implement permissions alongside editorial actions, not afterward.

## Checkpoints

1. Content experiment: representative lesson edits, saves, reopens, and previews correctly; select one renderer.
2. Editorial workflow: real authenticated author submits; different reviewer requests changes and approves; authorized publisher publishes.
3. Student experience: registration, curriculum navigation, reading, and bookmarks on mobile.
4. Reliability: race/conflict handling, lesson withdrawal, restoration, backups, and safe deployment.
5. Educational pilot: a coherent chapter with 10–20 reviewed lessons tested by teachers and students.

## Initial backlog

The tasks below are tracked as GitHub issues for coordination. They are not completed or assigned by their creation. External code/content acceptance remains deferred pending contributor terms; planning discussions and maintainer-owned internal prototyping can proceed. Suggested paths are provisional.

| ID | Objective and suggested area | Depends on | Acceptance and validation | Role / size |
| --- | --- | --- | --- | --- |
| [LRN-001](https://github.com/hadden-me/learnoo/issues/1) | Prepare a BAC Mathematics lesson fixture in docs/fixtures (section and subject confirmed) | None | Select the first chapter; document sources/rights and objectives; include Arabic/French, math, image, example and exercise; mark the technical fixture unreviewed; author/reviewer assignments remain pending | Teacher + maintainer / small |
| [LRN-002](https://github.com/hadden-me/learnoo/issues/2) | Wireframe reader, editor, reviewer, registration/dashboard in docs/design | Requirements | Review mobile reading order, RTL, keyboard access and approval actions; record feedback | Design / small |
| [LRN-003](https://github.com/hadden-me/learnoo/issues/3) | Prototype TipTap editor and restricted JSON in web/studio | [LRN-001](https://github.com/hadden-me/learnoo/issues/1) | Save/reopen preserves text, marks, math and directionality; test copy/paste and invalid input | Frontend / medium |
| [LRN-004](https://github.com/hadden-me/learnoo/issues/4) | Validate Go + browser KaTeX; compare JS rendering if needed in internal/rendering or isolated prototype | LRN-001 technical JSON fixture only; not LRN-003 | Render the fixture safely on mobile; record math payload and rendering latency; test malformed input; document the rendering choice; reuse one renderer for preview and reader | Backend/frontend / medium |
| [LRN-005](https://github.com/hadden-me/learnoo/issues/5) | Go/PostgreSQL foundation and identity/permission migrations | None; align content tables with LRN-004 | Reproducible local start, migration checks, real sessions, deny unauthorized actions; establish versions and setup docs. Argon2id (or equivalent) password hashing, HttpOnly/Secure/SameSite cookies, CSRF protection, session rotation on login and revocation on logout. Login abuse protection before any login is reachable beyond loopback: rate limiting, enumeration-safe errors. Independently grantable author, subject-scoped reviewer, publisher and administrator permissions (role model confirmed 2026-11-24; see [DECISIONS.md](DECISIONS.md#role-model)). Tests cover rate limiting, CSRF rejection and permission denial | Backend / medium |
| [LRN-006](https://github.com/hadden-me/learnoo/issues/6) | Lessons with embedded exercises, media and revision persistence | LRN-004, LRN-005 | FK/uniqueness constraints; immutable submitted snapshot including reviewed metadata; safe uploads; immutable media; one active candidate; draft save version checks | Backend / medium |
| [LRN-007](https://github.com/hadden-me/learnoo/issues/7) | Submission, feedback, approval and publishing | [LRN-006](https://github.com/hadden-me/learnoo/issues/6) | Different reviewer; changes require comment/new revision; subject permissions; review and publish checked as separate permissions; transactional pointer update and audit; each revision records its author and approving reviewer for attribution; test unauthorized and concurrent actions, self-approval rejection, and publishing without `publisher` permission | Backend/frontend / medium |
| [LRN-008](https://github.com/hadden-me/learnoo/issues/8) | Student reader, navigation, bookmarks and title search | [LRN-007](https://github.com/hadden-me/learnoo/issues/7) | Authenticated mobile reader uses canonical output; stable lesson bookmarks; correct RTL/math; public requests cannot read protected resources; each published lesson shows basic author and reviewer credit from the published revision; authenticated responses bypass shared caches | Full stack / medium |
| [LRN-009](https://github.com/hadden-me/learnoo/issues/9) | Withdrawal, unpublish and restore | [LRN-007](https://github.com/hadden-me/learnoo/issues/7) | Block withdrawn lesson revisions from publication/restoration; audited safe restore; stale requests rejected | Backend / medium |
| [LRN-010](https://github.com/hadden-me/learnoo/issues/10) | Recovery and deployment rehearsal in deploy | LRN-008, LRN-009 | Restore DB/media to isolated environment; verify referenced assets; resource limits, cache controls, monitoring and rollback documented | Infrastructure / medium |
| [LRN-011](https://github.com/hadden-me/learnoo/issues/11) | Prepare public pilot | LRN-010 + rights/privacy decisions | Recovery/verification UX tested; lessons reviewed; actual student/teacher feedback recorded; no unresolved critical access defects | Maintainer + teachers / medium |

## Proposed backlog

Proposed on 2026-11-24 in the [cahier des charges](CAHIER_DES_CHARGES.md); **not yet GitHub issues, not assigned and not accepted scope**. The maintainer creates an issue before work starts. Rows for M2–M3 depend on the role model and blockers listed there.

| ID | Objective and suggested area | Depends on | Acceptance and validation | Milestone / size |
| --- | --- | --- | --- | --- |
| LRN-012 | CI in .github/workflows: Go tests/vet, design checks, Playwright on PRs to develop/main | None | Runs on every PR; fails on test failure; no secrets required; documented in DEVELOPMENT.md | M0 / small |
| LRN-013 | Role administration CLI: bootstrap first admin, independently grant/revoke author, reviewer per subject, publisher and administrator | LRN-005 | Grants are audited; no web endpoint can self-grant; tests deny unauthorized grants | M1 / small |
| LRN-014 | Curriculum catalogue seed for BAC Mathematics → mathematics | LRN-005, chapter list from LRN-001 | Versioned migration/seed; stable IDs; no invented curriculum claims | M1 / small |
| LRN-015 | Student "report an error" on lessons, visible to reviewers/admins | LRN-008 | Authenticated only; rate limited; linked to lesson revision; audited resolution | M1 / small |
| LRN-016 | Teacher access request and invitation flow | M1, contributor terms | Request → admin approval; no self-granted permissions; audited | M2 / medium |
| LRN-017 | Teacher Studio dashboard: drafts, status, feedback, history | LRN-007 | Teacher sees only own work; reflects workflow states accurately | M2 / medium |
| LRN-018 | Reviewer queue per assigned subject with comments | LRN-007 | Only assigned subjects; own submissions excluded from approval | M2 / medium |
| LRN-019 | Web admin console: users, roles, subjects, catalogue, error reports, audit log | LRN-013, LRN-015 | Server-side checks on every action; role changes audited | M2 / medium |
| LRN-020 | Email provider and review notifications | Email-provider decision | No student data leakage; unsubscribe/preferences; delivery failures handled | M2 / medium |
| LRN-021 | Richer contributor profiles and public contribution history (basic author/reviewer credit on lessons is M1, delivered with LRN-007/LRN-008) | LRN-008 | Minimal personal data; contributor consent; profiles optional | M2 / small |
| LRN-022 | Additional public-launch hardening: self-registration abuse controls, verification policy, recovery, account deletion. Basic login rate limiting, enumeration-safe errors and session rotation are already required in LRN-005 (M1) | Privacy and verification decisions | Registration abuse controls tested; deletion procedure tested | M3 / medium |
| LRN-023 | Arabic interface localization (interface strings fr/ar, RTL layout) | LRN-008 | Interface language independent of lesson language; RTL tested on mobile | M3 / medium |
| LRN-024 | Public catalogue pages with SEO and hreflang | LRN-014 | No protected lesson content exposed; cache rules respected | M3 / small |
| LRN-025 | Onboard additional sections/subjects | M2, available reviewers | Each subject has at least one assigned reviewer before publishing | M3 / medium |

## Full internal MVP scenario

An invited author creates and previews a real lesson, submits, receives a requested correction, creates a new revision, and receives approval from a separate reviewer. An authorized publisher publishes. A registered student reads on a phone and bookmarks it. Later drafts do not change published content. A stale publish is blocked, an eligible previous revision can be restored, an incorrect lesson revision can be withdrawn and unpublished, and database/media backups restore the content.

A visual mockup alone does not satisfy this scenario. Simulated users can verify software permissions, but do not replace qualified educational review.

## Later milestones

Trusted teacher onboarding and convenient review queues/notifications; then curriculum expansion and examinations with verified rights. Consider progress, offline/PWA features, native apps, and advanced learning tools only after the core system proves useful.
