# Content and editorial rules

## Content contract

Prototype paragraph, heading, list, image, inline/block mathematics, YouTube embed, and typed callout/worked-example blocks. Embed exercise questions and worked solutions directly in the lesson snapshot for the pilot. Markdown import/export is deferred.

Submitted snapshots include title, objectives, prerequisites, content JSON/schema version, topic, immutable/versioned curriculum assignments, embedded exercise questions and solutions, media IDs, authorship, and base revision. Meaningful educational metadata changes require another reviewed revision.

A lesson has stable identity, language, translation group, archive state, and published revision pointer. Bookmarks reference that stable identity. Translations have separate records and review histories. Titles must not break URLs; use stable resolution or redirects.

## Scientific lesson language

For Learnoo's Tunisian BAC scientific subjects, French is the primary instructional language: lesson titles, scientific terminology, definitions, notation and exercises use French. Teachers may explain in Arabic or Tunisian dialect, including in videos or supporting written explanations, while retaining scientific keywords in French. These explanations remain subject to the same educational review.

Do not add Arabic solely to make a lesson bilingual. Use it where the teacher considers it helpful; keep artificial mixed-direction stress cases in separate technical fixtures. Interface language is independent of lesson language, and Arabic explanations do not automatically make a French scientific lesson a separate Arabic translation.

## Workflow and permissions

Draft → in review → approved. A reviewer can instead request changes with a required comment; corrections are a new revision. Submitted content is immutable. Workflow status and recorded decisions can change separately.

An author cannot approve their own work. Subject authorization applies to review. Publishing permission is separate; a reviewer can also hold it. Administrators can urgently unpublish incorrect or unlawful material.

## Publication invariants

- Publish only an approved, eligible revision belonging to the target lesson.
- Preserve the current published revision during drafting/review.
- Check the expected published base and update the publication pointer in one transaction with concurrency control.
- A stale publication is blocked; reconciliation requires reviewed content and an audit record.
- Restoration is a distinct audited action: select a previously approved, non-withdrawn revision, recheck revision and media eligibility, and atomically replace the expected current pointer. Do not blindly apply the historical draft's base check to restoration.
- Record actor, revision, action, and timestamp for submission, decisions, publication, unpublication, restoration, and withdrawal.

## Exercises, media, and withdrawal

Pilot exercises are embedded in the lesson snapshot and reviewed together. Independent exercise records and cross-lesson dependencies are deferred. Replacing an image creates a new immutable asset.

Withdraw the affected lesson revision with a reason, block it from publication/restoration, and explicitly unpublish it when currently visible. No cross-lesson exercise dependency lookup is required in this pilot.

## One active candidate

Allow only one open draft/review candidate per lesson, enforced by a database constraint. Submission makes content immutable. A changes-requested revision is retained while a new successor draft is created. Use optimistic version checks on draft saves and a locked current-publication comparison at publish time. Two browser tabs must not silently overwrite one another.

## Attribution and rights

Retain author/reviewer credit from the first release. Validate curriculum alignment, factual accuracy, clarity, and reproduction permissions. External contribution terms and licensing must be established before accepting external submissions. AI-assisted materials require human educational review.

## Schema work

Implement only the first workflow's users/permissions, curriculum identifiers, lessons/revisions with embedded exercises, media, reviews/audits, and bookmarks. Enforce foreign keys and uniqueness. Exact SQL and JSON schemas will be validated with the editor, not declared final in advance.
