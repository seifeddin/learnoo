# Cahier des charges — Learnoo

Status: living project specification. Last updated 2026-11-24.

Where truth lives:

| Record | Holds |
| --- | --- |
| Repository documents (this file, plans, decisions) | Scope, architecture, milestones, rules, accepted decisions |
| **GitHub issues** | **Live task state, owner, blockers, handoffs** |
| Pull requests + CI | Implementation, review and validation evidence |

This file gives a milestone-level snapshot and links to those records. It is **not** a live task board. Before starting work, always check the issue on GitHub, not this file.

This is the entry point for every contributor and AI agent: what Learnoo is, who uses it, where the project stands, and what comes next. It summarizes and links the authoritative documents; it does not replace them. If this file conflicts with them, the order of authority is: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) > [CONTENT_AND_EDITORIAL.md](CONTENT_AND_EDITORIAL.md) > [REQUIREMENTS.md](REQUIREMENTS.md) / [ARCHITECTURE.md](ARCHITECTURE.md) > [PROJECT_PLAN.md](PROJECT_PLAN.md) > this file. Report the conflict rather than picking silently.

## 1. Project in one page

| Item | Definition |
| --- | --- |
| Purpose | Free, trustworthy learning materials for Tunisian BAC students, written by teachers and reviewed by other teachers before students see them. |
| Pilot scope | BAC Mathematics section → mathematics subject → one coherent chapter (chapter not yet chosen), 10–20 reviewed lessons. |
| Final product (v1.0) | Public website where students register for free and study reviewed lessons on a phone; invited teachers write lessons in Learnoo Studio; reviewers and administrators validate, publish and correct them safely. |
| Stack (settled) | Go modular monolith, PostgreSQL, Go server-rendered reader, React + TypeScript + TipTap Studio, locally hosted KaTeX, Docker Compose on the existing server, Cloudflare, YouTube for video. |
| Non-goals for v1.0 | Native apps, AI tutoring, forums/messaging, live classes, certificates, automated grading, analytics, microservices, Redis, Elasticsearch. See [REQUIREMENTS.md](REQUIREMENTS.md#explicitly-deferred). |
| Language | French is the instructional language for scientific lessons; Arabic/Tunisian-dialect explanations are optional. Interface in French and Arabic, independent of lesson language. |

## 2. Users and access levels

### 2.1 Model: three account types plus a reviewer permission

> **Confirmed by the maintainer on 2026-11-24.** Recorded in [DECISIONS.md](DECISIONS.md#role-model).

The product presents three account types. A fourth capability, **Reviewer**, is a permission that an administrator grants to a trusted teacher for specific subjects. It is not a separate account. This keeps the user-facing model simple while preserving the non-negotiable rule that **nobody approves their own lesson**.

| Account type | Who | How they get it |
| --- | --- | --- |
| **Visitor** (no account) | Anyone | — |
| **Student** | Any learner | Free self-registration (public launch); invited accounts during the internal pilot |
| **Teacher** | Verified teachers and educational contributors | Invitation or access request approved by an administrator; never self-granted |
| **Teacher + Reviewer** | Experienced teachers trusted for a subject | Administrator grants review permission for one or more subjects |
| **Administrator** | Project maintainers | Granted by an existing administrator; the first one is bootstrapped from the command line |

The account types are a **presentation** of the existing backend permissions, which stay independent: `author`, `reviewer` (per subject), `publisher` and `administrator`. Each is granted separately and checked separately by the server.

| Account type | Backend permissions granted by default | Optional additional grants |
| --- | --- | --- |
| Student | none (authenticated learner) | — |
| Teacher | `author` | `reviewer` for specific subjects; `publisher` |
| Administrator | `administrator`, `publisher`, `author` | `reviewer` for specific subjects |

A reviewer **may** also receive `publisher`, per [CONTENT_AND_EDITORIAL.md](CONTENT_AND_EDITORIAL.md#workflow-and-permissions). Trusted reviewers will usually get both, but reviewing never implies publishing. Administrators review educational content only in subjects they are assigned as reviewers.

"A teacher can submit any course" means: any teacher can draft and submit a lesson for **any subject and chapter that exists in the curriculum catalogue**. Quality is controlled by subject-scoped review, not by restricting who may write. Creating new sections, subjects or chapters is an administrator action; teachers can propose them.

### 2.2 Permission matrix

| Action | Visitor | Student | Teacher | Teacher + Reviewer | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| See homepage and public catalogue (sections, subjects, chapter titles) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read full lessons, exercises and solutions | — | ✓ | ✓ | ✓ | ✓ |
| Bookmark lessons, search, report an error | — | ✓ | ✓ | ✓ | ✓ |
| Open Learnoo Studio; create, edit and preview own drafts | — | — | ✓ | ✓ | ✓ |
| Submit own draft for review; resubmit after changes requested | — | — | ✓ | ✓ | ✓ |
| Review submissions in assigned subjects; request changes (comment required) | — | — | — | ✓ ¹ | ✓ ¹ |
| Approve a submission | — | — | — | ✓ ¹ ² | ✓ ¹ ² |
| Publish an approved revision; restore an earlier approved revision | — | — | ³ | ³ | ✓ |
| Withdraw a revision; emergency unpublish | — | — | — | — | ✓ |
| Manage users, roles and reviewer subject assignments | — | — | — | — | ✓ |
| Manage curriculum catalogue (sections, subjects, chapters) | — | — | — | — | ✓ |
| Handle error reports; view audit log | — | — | — | own subjects | ✓ |

¹ Only within subjects the person is assigned to review. Administrators who review educational content also need the subject assignment.
² **Never their own revision.** This is enforced by the server, not just hidden in the UI.
³ Only with the separately granted `publisher` permission. Publishing never bypasses review: only an approved, eligible revision can be published.
Lessons display basic author and reviewer credit from the first release (M1).

Every protected action is checked on the server. Every submission, decision, publication, unpublication, restoration, withdrawal and role change is recorded in the audit log with actor, target and time.

### 2.3 Advice on additional roles

- **Do not add more account types for v1.0.** Moderator and publisher duties are covered by grantable permissions on Teacher and Administrator accounts.
- **Reviewer is essential, even if users only see three types.** Without a second qualified person, no lesson can be published. Recruiting one independent mathematics reviewer is the most important non-technical task.
- **Teacher access must stay invitation- or approval-based** until contributor terms exist (see §5). A "request teacher access" form is planned for Milestone 2.
- Possible later additions, only when there is real demand: *Video manager* (uploads to the YouTube channel), *Translator* (separate Arabic lesson versions), *Curriculum editor* (catalogue maintenance without full admin rights).

## 3. Status board

**Snapshot as of 2026-11-24.** May be out of date; the GitHub issue is authoritative for any single task. Refresh this snapshot when a milestone changes, not on every PR.

Legend: ✅ done · 🟡 in progress / partially done · ⬜ not started · ⛔ blocked by a non-technical decision.

### 3.1 What already exists

- Planning set: project plan, implementation plan, requirements, architecture, editorial rules, decision log, roadmap and GitHub issues LRN-001 to LRN-011.
- Repository workflow: `develop` → `main`, protected branches, CODEOWNERS, issue and PR templates, shared agent skills in `.agents/skills`.
- Design foundation: semantic tokens (Radix Blue/Slate) generated for CSS and Tailwind, contrast check, brand assets.
- Local renderer experiment (`cmd/renderer`, `internal/rendering`): restricted lesson JSON → safe HTML with local KaTeX, Arabic/French fixture, JSON lab with live preview, local landing-page preview, Go tests and 6 Playwright tests. **Loopback only, not the application:** it has no accounts, database or workflow.

### 3.2 Backlog status

| ID | Task | Milestone | Status | Notes / blocker |
| --- | --- | --- | --- | --- |
| [LRN-001](https://github.com/hadden-me/learnoo/issues/1) | BAC Mathematics sample lesson | M0 | ⛔ | Technical fixture exists; needs teacher to choose chapter, plus a named author and independent reviewer |
| [LRN-002](https://github.com/hadden-me/learnoo/issues/2) | Wireframes: reader, editor, reviewer, registration/dashboard | M0 | ⬜ | Homepage concept and tokens exist; wireframes not started |
| [LRN-003](https://github.com/hadden-me/learnoo/issues/3) | TipTap editor prototype producing restricted JSON | M0 | ⬜ | Must emit the schema in [fixtures/README.md](fixtures/README.md) or a validated adapter |
| [LRN-004](https://github.com/hadden-me/learnoo/issues/4) | Go + KaTeX renderer validation | M0 | 🟡 | Go renderer selected on evidence; remaining: physical phone + throttled network, real video check |
| LRN-012 | CI on pull requests | M0 | ⬜ | Proposed; see [ROADMAP](ROADMAP.md#proposed-backlog) |
| [LRN-005](https://github.com/hadden-me/learnoo/issues/5) | Go/PostgreSQL foundation, sessions, roles | M1 | ⬜ | **Ready:** server skeleton, migrations tooling, users, password hashing, sessions, CSRF, login rate limiting. **Unblocked 2026-11-24:** permission/role tables (role model confirmed) |
| LRN-013 | Role administration CLI and first admin bootstrap | M1 | ⬜ | Proposed |
| LRN-014 | Curriculum catalogue seed (Math section) | M1 | ⬜ | Proposed; chapter list needs teacher input |
| [LRN-006](https://github.com/hadden-me/learnoo/issues/6) | Lessons, revisions, embedded exercises, media | M1 | ⬜ | Needs LRN-004, LRN-005 |
| [LRN-007](https://github.com/hadden-me/learnoo/issues/7) | Submit, review, approve, publish | M1 | ⬜ | Needs LRN-006 |
| [LRN-008](https://github.com/hadden-me/learnoo/issues/8) | Student reader, navigation, bookmarks, search | M1 | ⬜ | Needs LRN-007 |
| LRN-015 | Student error reports | M1 | ⬜ | Proposed |
| [LRN-009](https://github.com/hadden-me/learnoo/issues/9) | Withdraw, unpublish, restore | M1 | ⬜ | Needs LRN-007 |
| [LRN-010](https://github.com/hadden-me/learnoo/issues/10) | Backup restore and deployment rehearsal | M1 | ⬜ | Needs LRN-008, LRN-009 |
| [LRN-011](https://github.com/hadden-me/learnoo/issues/11) | Prepare pilot with real students and teachers | M1 | ⛔ | Needs reviewed lessons, privacy decisions |
| LRN-016 … LRN-025 | Teacher beta, public launch | M2–M3 | ⬜ | Proposed; see [ROADMAP](ROADMAP.md#proposed-backlog) |

### 3.3 Non-technical blockers (owner: maintainer)

| Blocker | Blocks | Why it matters |
| --- | --- | --- |
| **Contributor terms and licence** ([LICENSING.md](LICENSING.md)) | Merging any external code or content | External PRs cannot be accepted until this is resolved. Resolve this first if outside developers or their AI agents are expected to contribute. |
| First chapter, named teacher author, **separate** qualified reviewer | LRN-001, real pilot content, LRN-011 | Software can be tested with simulated users, but publication needs two real people. |
| Privacy policy, account deletion and retention; email-verification policy; email provider | Public registration (M3) | Some students are minors. |
| Server capacity measurement, backup target | LRN-010, any deployment | Shared server already runs other workloads. |

## 4. Development plan: from now to v1.0

Milestones follow [IMPLEMENTATION_PLAN.md §17](IMPLEMENTATION_PLAN.md#17-implementation-roadmap). No delivery dates are promised; each milestone ends with an exit check that must be demonstrated, not claimed.

```
M0 Foundations ──► M1 Internal MVP ──► M2 Teacher beta ──► M3 Public launch (v1.0) ──► M4 Learning tools
 (validate)         (one full workflow)  (teachers self-serve)  (open registration)        (only if proven)
```

### M0 — Technical foundations (current)

Goal: every risky technical assumption is checked before the real app is built.

- Finish LRN-004 (phone and slow-network check) and close it.
- LRN-012: CI running `go test`, `go vet`, design checks and Playwright on every PR. Do this early because AI-generated PRs need automatic checks.
- LRN-002 wireframes and LRN-003 TipTap prototype, which can run in parallel.
- LRN-001 chapter choice with a teacher, which can run in parallel.

**Exit check:** content typed in the TipTap prototype is saved, reopened and rendered by the Go renderer identically in preview and reader; CI is green on `develop`.

### M1 — Internal educational MVP (all three access types work)

Goal: the full chain *Teacher writes → different Reviewer approves → publish → Student reads on a phone → safe correction* works with real database records and real permissions.

Suggested order (each step is one or more small PRs):

1. **Foundation** — LRN-005 (server, migrations, sessions, CSRF, password hashing, role tables, and basic login abuse protection: rate limiting, enumeration-safe errors, session rotation; required before any login is reachable outside loopback, even for invited pilot users) + LRN-013 (CLI to create the first admin and grant/revoke `author`, `reviewer` per subject, `publisher` and `administrator` independently).
2. **Catalogue** — LRN-014 seed of section → subject → chapters.
3. **Lessons** — LRN-006 revisions with immutable submitted snapshots, one active draft per lesson, safe image upload.
4. **Workflow** — LRN-007 submit / request changes / approve / publish with transactional publication and audit, recording author and reviewer on each revision; Studio integrates the LRN-003 editor.
5. **Students** — LRN-008 registration (invited pilot users), navigation, protected reader showing basic author/reviewer credit, bookmarks, title search; LRN-015 error reports.
6. **Safety** — LRN-009 withdraw / unpublish / restore.
7. **Operations** — LRN-010 Docker Compose deployment, backups, restore test, monitoring, rollback.
8. **Pilot** — LRN-011: 10–20 reviewed lessons, tested by real students and teachers.

**Exit check:** the [internal MVP scenario](ROADMAP.md#full-internal-mvp-scenario) passes end to end. In this milestone, teachers are invited and their roles are granted by CLI; there is no web admin console yet.

### M2 — Trusted teacher beta

Goal: a teacher can join, write, submit and respond to feedback without any help from a developer, and an administrator can run the platform from the browser.

Needs: contributor terms resolved. Work: LRN-016 teacher access request and invitations, LRN-017 teacher Studio dashboard, LRN-018 reviewer queue, LRN-019 admin console (users, roles, subjects, catalogue, error reports, audit log), LRN-020 email notifications, LRN-021 contributor profiles and contribution history (basic lesson credit already ships in M1).

**Exit check:** a newly approved teacher completes the submit → changes requested → approve cycle with no maintainer intervention beyond granting access.

### M3 — Public launch (v1.0, "final project" for this plan)

Goal: open free registration to all Tunisian BAC students.

Needs: privacy policy, deletion and retention procedure, email-verification decision, capacity check. Work: LRN-022 additional public-launch hardening on top of the M1 login protection (self-registration abuse controls, email verification, recovery, account deletion), LRN-023 Arabic interface, LRN-024 public catalogue and SEO, LRN-025 onboarding further sections and subjects. Later in M3: past BAC exams once reproduction rights are verified.

**Exit check:** [MVP acceptance criteria](PROJECT_PLAN.md#23-mvp-acceptance-criteria) all pass on production, with real students and teachers.

### M4 — Advanced learning tools (only after v1.0 proves useful)

Progress tracking, PWA/offline, reusable exercise bank, more interactive exercises, native apps, and optional AI assistance after educational and privacy review. These need a product decision before any issue is created.

### What can run in parallel now

| Track | Tasks | Skills |
| --- | --- | --- |
| Backend | LRN-005 → LRN-013 → LRN-006 | Go, PostgreSQL, security |
| Studio frontend | LRN-003 | React, TypeScript, TipTap |
| Design | LRN-002 | UX, RTL, accessibility |
| DevOps | LRN-012 CI | GitHub Actions |
| Education (maintainer + teachers) | LRN-001, reviewer recruitment | Mathematics teaching |

## 5. Working protocol for contributors and AI agents

Any contributor should be able to open the repository with an AI agent and know what exists, what to build next and how to prove it is finished, without earlier chats. Coordination happens **on GitHub issues**, because two agents on different branches can each read an outdated Markdown file and start the same task.

### 5.1 Task states

Each task is one GitHub issue. Its state is a label. **Exactly one `status:*` label applies at a time**; when moving state, remove the old label. `blocked` is independent and can be combined with any open state, so a task can be ready for one part and blocked for another. An open issue without a `status:*` label has not been triaged into this protocol yet; do not start it.

| State (label) | Meaning | Who moves it |
| --- | --- | --- |
| `status:proposed` | Idea or roadmap row; not yet detailed to the readiness checklist (§5.3) | Anyone proposes; maintainer triages |
| `status:ready` | Ready to implement: meets §5.3 and technical dependencies are merged. Assigning an owner **reserves** it; the label stays until work starts | Maintainer |
| `status:in-progress` | Work has started: **one human owner** (GitHub assignee) and a linked branch | Owner |
| `status:in-review` | PR open against `develop`, linked to the issue | Owner |
| Done | Every acceptance criterion satisfied in merged PRs, or remaining scope moved to agreed follow-up issues; issue closed (§5.6) | Maintainer |
| `blocked` (independent) | Names the blocking decision or issue in a comment | Anyone, with reason |

### 5.2 Before starting

1. Read [AGENTS.md](../AGENTS.md), this file and the **current** GitHub issue, including its comments.
2. **Get assigned first.** Only start an issue that is `status:ready` **and** assigned to you by the maintainer. If it is assigned to someone else or `in-progress`, do not start a parallel copy; comment instead. An AI agent works on behalf of its human owner and never self-assigns.
3. Check dependencies by kind:
   - **Technical dependencies** (code another task must deliver) must be merged, or the issue must explicitly allow a stand-in. Technical work may use clearly labelled `unreviewed` fixtures and simulated users, as [DECISIONS.md](DECISIONS.md#mathematics-pilot-and-teacher-participation) allows; it does not wait for teacher approval.
   - **Decision blockers** (⛔ or §3.3) block only the part they name. Build the ready part; leave the blocked part out and say so in the PR rather than guessing the decision.
   - **Educational validation** (real author, independent reviewer, curriculum alignment) is never simulated or claimed. It blocks publishing real lessons, not building the software.
   - If it is unclear which kind a dependency is, ask on the issue.
4. Branch from `develop` (`feat/LRN-xxx-…`, `fix/…`, `docs/…`), replace `status:ready` with `status:in-progress`, and link the branch in an issue comment. External PRs cannot be merged until contributor terms exist (§3.3).

### 5.3 What a ready issue contains

The maintainer only marks an issue `status:ready` when it has all of these (see the [task template](../.github/ISSUE_TEMPLATE/task.md)):

- Objective and milestone.
- **Included** and **excluded** scope.
- Dependencies, split into technical / decision / educational.
- Shared contracts it reads or changes (§5.4).
- Acceptance criteria as observable results.
- Validation commands to run, and the risks the tests must cover.

M0 and M1 tasks are detailed to this level before assignment. M2–M4 rows in the [roadmap](ROADMAP.md#proposed-backlog) stay `status:proposed` until M1 is close to done.

### 5.4 Shared contracts: agree first, then build in parallel

Parallel tasks break when they change the same contract independently. Each contract has one home. **Agree the contract first** by documenting the proposed shape on the issue or in its home, then build in parallel:

- A contract change used by **another open task** is agreed on the issue before either side relies on it. A separate small PR is optional; use one when several tasks wait on it.
- A contract change **confined to one task** ships in the same PR as its implementation.
- The other side may build against **documented fixtures or mocks** of the agreed contract; it does not wait for the implementation to merge. Integration is verified when both sides are merged.

| Contract | Home | Rule |
| --- | --- | --- |
| Lesson JSON schema | [fixtures/README.md](fixtures/README.md) and `internal/rendering` validation | Schema changes bump `schemaVersion`, update fixtures and tests, and are recorded in DECISIONS.md |
| Studio ↔ server API (requests, responses, errors) | `docs/API.md`, created by the first task that defines an endpoint (LRN-006) | Frontend may build against agreed, documented request/response examples or mocks before the endpoint merges |
| Permission rules | §2 of this file + [CONTENT_AND_EDITORIAL.md](CONTENT_AND_EDITORIAL.md) | Changes need a recorded decision before code |
| Database migrations | `migrations/` | Only one open PR adds migrations at a time; others rebase and renumber after it merges. Never edit a merged migration |
| Design tokens | `web/design/tokens.json` | Edit the source, regenerate, never hand-edit generated CSS |

### 5.5 Never, even to make a demo work

- Bypass server-side authorization, or rely on hiding buttons as a permission check.
- Let an author approve their own revision.
- Modify a submitted revision's content, exercises or media references.
- Publish outside a transaction with the published-base check.
- Expose the renderer experiment publicly, commit secrets, or deploy to production.
- Invent educational content, teacher approval, licences, or claim an operational check passed without evidence.
- Add dependencies, 3D, decorative motion or speculative modules outside the issue's scope.

### 5.6 Definition of done

A **PR** is complete when it is merged into `develop` with required checks passing. A branch or locally generated code is not complete. Until CI exists (LRN-012), the PR lists the commands run and their output, and the maintainer re-runs them before merging.

An **issue** is done only when **all** of its acceptance criteria are satisfied by merged PRs, or the maintainer has explicitly moved the remaining criteria into agreed follow-up issues, linked from the issue. Merging a PR must not silently close an issue with unmet criteria: use `Closes #…` only when the PR satisfies every remaining criterion; otherwise use `Part of #…`.

The PR must show:

- Each acceptance criterion of the issue, met or explicitly not met.
- Tests for the risk introduced (authorization, immutability, races, rendering safety, recovery, as applicable); `go test ./...`, `go vet ./...` and relevant browser tests pass.
- Mobile and RTL checked for any UI change; `prefers-reduced-motion` respected.
- Docs updated: setup steps in [DEVELOPMENT.md](DEVELOPMENT.md), material decisions in [DECISIONS.md](DECISIONS.md), shared contracts in their home (§5.4).

### 5.7 Handoff

Every PR, and any issue left unfinished, ends with a handoff (the [PR template](../.github/PULL_REQUEST_TEMPLATE.md) has the section):

- **What changed.**
- **Tests actually run**, with results. Do not list tests that were not run.
- **Unresolved problems** and what remains unverified.
- **Exact next step**, i.e. what the next person or agent should do first.

If you stop before finishing, post the handoff as an issue comment, push the branch, and unassign yourself or tell the maintainer.

### 5.8 Project skills for agents

Use `learnoo-editorial-invariants` for revision/workflow work, `learnoo-security` for anything touching sessions, permissions, uploads or rendering, and `learnoo-code-review` when reviewing. They live in [.agents/skills](../.agents/skills/).

## 6. Glossary

| Term | Meaning |
| --- | --- |
| Section | BAC track, e.g. Mathématiques, Sciences expérimentales |
| Subject | Discipline within a section, e.g. mathematics |
| Chapter | Ordered group of lessons; what users may call a "course" |
| Lesson | Stable identity (URL, bookmarks) pointing to one published revision |
| Revision | Snapshot of a lesson's content; immutable once submitted |
| Studio | Teacher and reviewer web application (React/TipTap) |
| Reader | Student-facing server-rendered lesson pages (Go) |
| Withdrawal | Marking a revision as incorrect so it can never be published or restored again |
