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
| [LRN-001](https://github.com/hadden-me/learnoo/issues/1) | Select section/subject and prepare real lesson fixture in docs/fixtures | None | Identify source/rights, objectives, author, reviewer; include Arabic/French, math, image, example and exercise; distinguish fixture from approved content | Teacher + maintainer / small |
| [LRN-002](https://github.com/hadden-me/learnoo/issues/2) | Wireframe reader, editor, reviewer, registration/dashboard in docs/design | Requirements | Review mobile reading order, RTL, keyboard access and approval actions; record feedback | Design / small |
| [LRN-003](https://github.com/hadden-me/learnoo/issues/3) | Prototype TipTap editor and restricted JSON in web/studio | [LRN-001](https://github.com/hadden-me/learnoo/issues/1) | Save/reopen preserves text, marks, math and directionality; test copy/paste and invalid input | Frontend / medium |
| [LRN-004](https://github.com/hadden-me/learnoo/issues/4) | Validate Go + browser KaTeX; compare JS rendering if needed in internal/rendering or isolated prototype | [LRN-003](https://github.com/hadden-me/learnoo/issues/3) | Same fixture, safe output, mobile preview, failure behavior and latency; document selection; one production pipeline | Backend/frontend / medium |
| [LRN-005](https://github.com/hadden-me/learnoo/issues/5) | Go/PostgreSQL foundation and identity/permission migrations | None; align content tables with LRN-004 | Reproducible local start, migration checks, real sessions, deny unauthorized actions; establish versions and setup docs | Backend / medium |
| [LRN-006](https://github.com/hadden-me/learnoo/issues/6) | Lessons with embedded exercises, media and revision persistence | LRN-004, LRN-005 | FK/uniqueness constraints; immutable submitted snapshot including reviewed metadata; safe uploads; immutable media; one active candidate; draft save version checks | Backend / medium |
| [LRN-007](https://github.com/hadden-me/learnoo/issues/7) | Submission, feedback, approval and publishing | [LRN-006](https://github.com/hadden-me/learnoo/issues/6) | Different reviewer; changes require comment/new revision; subject permissions; transactional pointer update and audit; test unauthorized and concurrent actions | Backend/frontend / medium |
| [LRN-008](https://github.com/hadden-me/learnoo/issues/8) | Student reader, navigation, bookmarks and title search | [LRN-007](https://github.com/hadden-me/learnoo/issues/7) | Authenticated mobile reader uses canonical output; stable lesson bookmarks; correct RTL/math; public requests cannot read protected resources | Full stack / medium |
| [LRN-009](https://github.com/hadden-me/learnoo/issues/9) | Withdrawal, unpublish and restore | [LRN-007](https://github.com/hadden-me/learnoo/issues/7) | Block withdrawn lesson revisions from publication/restoration; audited safe restore; stale requests rejected | Backend / medium |
| [LRN-010](https://github.com/hadden-me/learnoo/issues/10) | Recovery and deployment rehearsal in deploy | LRN-008, LRN-009 | Restore DB/media to isolated environment; verify referenced assets; resource limits, cache controls, monitoring and rollback documented | Infrastructure / medium |
| [LRN-011](https://github.com/hadden-me/learnoo/issues/11) | Prepare public pilot | LRN-010 + rights/privacy decisions | Recovery/verification UX tested; lessons reviewed; actual student/teacher feedback recorded; no unresolved critical access defects | Maintainer + teachers / medium |

## Full internal MVP scenario

An invited author creates and previews a real lesson, submits, receives a requested correction, creates a new revision, and receives approval from a separate reviewer. An authorized publisher publishes. A registered student reads on a phone and bookmarks it. Later drafts do not change published content. A stale publish is blocked, an eligible previous revision can be restored, an incorrect lesson revision can be withdrawn and unpublished, and database/media backups restore the content.

A visual mockup alone does not satisfy this scenario. Simulated users can verify software permissions, but do not replace qualified educational review.

## Later milestones

Trusted teacher onboarding and convenient review queues/notifications; then curriculum expansion and examinations with verified rights. Consider progress, offline/PWA features, native apps, and advanced learning tools only after the core system proves useful.
