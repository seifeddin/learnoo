# LRN-002 wireframes

Status: **draft for review**. No teacher, student or reviewer has reviewed these wireframes yet (see [feedback log](#feedback-log)).

These are implementation references for [IMPLEMENTATION_PLAN Artifact C](../../IMPLEMENTATION_PLAN.md#artifact-c--initial-wireframes), not production UI. They are static HTML pages that use the shared tokens in [`web/design/tokens.css`](../../../web/design/tokens.css) through a wireframe-only stylesheet ([`wireframes.css`](wireframes.css)). They have no scripts, motion, web fonts or external requests.

## How to view

Open the pages over a local static server from the repository root so the relative token stylesheet resolves:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8765/docs/design/wireframes/>. Each page shows phone frames (360px) and desktop frames (1024px). Wide frames scroll inside their own container. Black numbered circles show the intended keyboard and screen-reader order.

## Flows

| # | Flow | Page | Covers |
| --- | --- | --- | --- |
| 1 | Student lesson reader | [reader.html](reader.html) | Mobile FR, Arabic interface around a French lesson, visitor gate, unavailable lesson, report an error, desktop |
| 2 | Studio lesson editor | [editor.html](editor.html) | Draft, changes requested (author view), submitted/immutable, save conflict, submit validation, 403, narrow screen, history, preview |
| 3 | Reviewer decision and publication | [review.html](review.html) | Approve / request changes (comment required), self-approval denial, separate publish control, stale-publication block, queue + empty state, mobile, permission table |
| 4 | Registration and sign-in | [registration.html](registration.html) | Pilot invitation (M1), public sign-up (M3), validation, enumeration-safe errors, rate limit, Arabic interface, desktop |
| 5 | Dashboard and bookmarks | [dashboard.html](dashboard.html) | Bookmarks, empty and no-result states, unavailable bookmark, Arabic interface, desktop, role-based entries, teacher lesson list |

The issue's "review/changes-requested" flow is split across Flow 3 (reviewer side) and Flow 2.2 (author side).

## Cross-cutting rules

### Mobile reading order

- Phone layouts are a single column in DOM order: header → context (breadcrumb, credit) → title → bookmark → content → report error → previous/next.
- Nothing is reordered with CSS `order` or absolute positioning, so visual, Tab and screen-reader order match.
- Primary actions are full width with a 44px minimum height (`--learnoo-size-touch`). The header is not sticky so it does not take space from the content.
- The reviewer decision panel follows the snapshot (read, then decide). On mobile, a skip link "Aller à la décision" is provided.

### French / Arabic and RTL

- Interface language and lesson language are independent. An Arabic interface (`dir="rtl"`) wraps French lessons that keep `lang="fr" dir="ltr"`.
- Optional Arabic explanation blocks carry `lang="ar" dir="rtl"`. French terms and formulas inside them are isolated with `<bdi>` / `dir="ltr"`.
- Only logical properties are used (`inline-start`/`inline-end`). Sidebars and split panes swap sides automatically.
- Directional arrows are separate `aria-hidden` items so they mirror correctly. Breadcrumb separators use the bidi-mirrored `›`.
- Email, password and formula fields are LTR in both interfaces. Free text inputs use `dir="auto"` in implementation.
- Arabic uses `--learnoo-font-arabic` and `--learnoo-leading-arabic` (1.9).

### Keyboard

- Skip link first on every screen. Focus is always visible (3px outline in `--learnoo-color-focus`).
- Menus and disclosures use `aria-expanded` and close on Escape, returning focus to their trigger. Solutions use native `<details>`.
- The Studio toolbar is a `role="toolbar"` with roving tabindex: one Tab stop, arrow keys inside (mirrored in RTL).
- Decisions use a radio group plus one submit button whose label names the action.
- Error summaries take focus after a failed submit and link to each field.
- Confirmation dialogs (submit, approve, publish) trap focus and return it to the trigger on cancel.
- Permission denials are explained in text instead of disabled buttons, because disabled controls are skipped by keyboard and screen readers.

### Error and empty states

| Flow | States drawn |
| --- | --- |
| Reader | Visitor gate; lesson unavailable (404/410); report-error validation; KaTeX failure falls back to readable source |
| Editor | Save conflict (version check); submit validation summary; 403 for students/non-authors; one active candidate per lesson |
| Review | Missing required comment; self-approval denied; no reviewer permission (403); empty queue; publication blocked by changed base |
| Registration | Field validation; invalid/expired invitation; generic sign-in failure; too many attempts |
| Dashboard | No bookmarks; no search results; unavailable bookmarked lesson; empty catalogue; empty teacher lesson list |

Status is always written text. Colour is supplementary and never implies pedagogical approval.

## Permission states and the role model

The account labels **Student / Teacher / Teacher + Reviewer / Administrator** come from [CAHIER_DES_CHARGES §2](../../CAHIER_DES_CHARGES.md#2-users-and-access-levels). The maintainer confirmed that model on 2026-11-24 ([DECISIONS.md](../../DECISIONS.md#role-model)).

The screens depend only on the existing independent permissions (`author`, `reviewer` per subject, `publisher`, `administrator`), which the server checks. The wireframes do not grant any new permission. The detailed tables are in [review.html § Permission states](review.html#matrix), [editor.html § Who can open the editor](editor.html#who) and [dashboard.html § Role-based entry points](dashboard.html#roles).

Invariants shown:

- An author never approves or requests changes on their own revision, including administrators and reviewers (Flow 3.3). The server enforces this; the UI only explains it.
- Approval and publication are separate controls and separate permissions (Flow 3.4). Publishing a stale revision is blocked, with no override (Flow 3.4 C).
- "Request changes" requires a comment (Flow 3.2). Corrections become a new revision (Flow 2.2).
- Submitted revisions are never editable (Flow 2.3).
- Hiding a link is never the access check. Every action is authorized on the server.

## Unverified assumptions and open questions

| Item | Status | Owner / where it is decided |
| --- | --- | --- |
| Role model labels (Teacher, Teacher + Reviewer, Admin) | Confirmed 2026-11-24 | [DECISIONS.md](../../DECISIONS.md#role-model) |
| Whether an author holding `publisher` may publish their own lesson after someone else approved it | Not specified | Maintainer; needs a recorded decision before LRN-007 |
| What an administrator without a subject assignment sees on a submitted revision | Assumed: status and metadata only | LRN-007 |
| Whether the reviewer checklist is stored with the decision | Open | LRN-007 schema |
| Whether an author may cancel a pending submission | Not specified; not drawn | LRN-007 |
| Email verification before the first lesson | Open product decision; two variants noted | Maintainer (IMPLEMENTATION_PLAN "Email verification policy") |
| Minors: minimum age, parental consent, retention | Open | Maintainer; privacy policy before M3 |
| Privacy policy wording and consent checkbox | Policy does not exist yet | Maintainer |
| Password length rule `[N]` | Placeholder | LRN-005 |
| Teachers write mainly on a computer; phone Studio is for small fixes | Unverified | Teacher feedback |
| Reviewers do long mathematical review on desktop | Unverified | Reviewer feedback |
| Arabic interface copy | Placeholder; needs native-speaker review | LRN-023 |
| Studio keyboard shortcuts and block-language control | Proposals only | LRN-003 (#3) |
| Visitor sees no lesson preview | Assumed from §2.2 | Maintainer |

## Coordination with parallel work

- **#3 (TipTap editor, `web/studio`)**: Flow 2 offers only the block types of the current experimental contract in [fixtures/README.md](../../fixtures/README.md). Nothing here changes that schema. Toolbar grouping, shortcuts and the per-block language control are suggestions for #3.
- **#5 (backend foundation)**: Flow 4 assumes enumeration-safe sign-in and recovery messages, login rate limiting and session rotation, as listed for LRN-005. No API shapes are defined here. `docs/API.md` remains LRN-006's contract home.

## Feedback log

No feedback has been collected yet. Rows are placeholders to fill in as real reviews happen. Do not record approval that did not occur.

| Date | Reviewer (role) | Flow(s) | Feedback | Resulting change |
| --- | --- | --- | --- | --- |
| _pending_ | Maintainer | All | — | — |
| _pending_ | Teacher (author) | 2, 5 | — | — |
| _pending_ | Independent subject reviewer | 3 | — | — |
| _pending_ | BAC student(s), on a real phone | 1, 4, 5 | — | — |
| _pending_ | Native Arabic speaker | 1.2, 4.4, 5.4 | — | — |

## Validation record

Checks performed for the first version (2026-11-24) by the implementer:

| Check | Result |
| --- | --- |
| `git diff --check` | Clean |
| Pages rendered over a local static server in the in-app browser at 375px and 1440px | Tokens load. No horizontal page overflow at 375px on all six pages (wide frames scroll inside their containers) |
| Duplicate `id`, broken `for` / `aria-*` references, broken in-page and cross-page anchors | None found (scripted DOM check) |
| RTL arrow and breadcrumb placement in Flow 1.2 | Verified by measuring element positions; fixed one arrow placement during review |
| Keyboard order | Reviewed against DOM order; no CSS reordering is used. Not tested with a screen reader |
| Physical phone, screen reader, real users | **Not done** |

Viewport emulation is not a physical-phone test.
