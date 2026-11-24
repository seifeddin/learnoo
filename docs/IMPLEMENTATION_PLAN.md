# Learnoo — Implementation Plan

Status: agreed direction for technical prototyping.

Base document: [Project plan](PROJECT_PLAN.md).

Scope: current implementation decisions and first working milestone. This document takes precedence where it narrows or corrects the broader project plan. Update it in place as prototype evidence informs decisions; Git tracks history.

# 1. Purpose

This implementation plan incorporates the final corrections identified during architectural review.

It does not replace the project's mission, technology stack or long-term roadmap.

The project plan remains applicable except where modified here.

The immediate objective is to implement a complete, working educational workflow:

**Author → Reviewer/Publisher → Student → Safe Revision**

The technical prototype must demonstrate this workflow using real educational content, not placeholder text alone.

# 2. Confirmed Project Requirements

The following requirements are considered settled for the initial prototype.

## Educational platform

- Learnoo is completely free for students.
- Students must have accounts to access complete lessons and exercises.
- Initial educational focus is the Tunisian Baccalauréat.
- Initial content scope is one BAC section and one subject.
- French, Arabic and mixed-language content must be supported.
- Student bookmarks are included in the MVP.
- Educational videos use YouTube.
- Teachers contribute through Learnoo Studio, not GitHub.

## Technical architecture

- Go modular monolith.
- PostgreSQL.
- Go server-rendered learning pages.
- React and TypeScript for Learnoo Studio.
- TipTap editor.
- Docker Compose.
- Deployment on the existing shared server.
- Cloudflare for public content and static asset delivery.
- GitHub for software development.

## Editorial model

- Educational content is reviewed before publication.
- Submitted content snapshots are immutable.
- Published revisions remain available while changes are reviewed.
- Exercise and media dependencies must not change silently.
- Basic author and reviewer attribution is required.
- Publishing and rollback actions must be auditable.

# 3. Updated Internal Studio Access

Replace the term **admin-only Studio** with:

**Invited internal users only.**

The first implementation will support separate permissions for:

- Author.
- Reviewer.
- Publisher.
- Administrator.

These permissions may be combined where appropriate.

A teacher invited as an author does not need administrator privileges.

An authorized reviewer may also publish an approved revision.

## Minimum editorial separation

At least two distinct people are required:

1. An author.
2. A separate reviewer with appropriate subject permissions.

The reviewer may publish the approved revision if they also have publishing permission.

An author may not approve their own submission.

Administrative emergency actions must remain available for withdrawing incorrect or unlawful content.

# 4. Finalized MVP Editorial Workflow

Phase 1 must include a complete minimal review cycle.

## Workflow

1. Author creates a draft.
2. Author submits the draft.
3. Revision becomes immutable and enters review.
4. Reviewer examines the submission.
5. Reviewer either approves or requests changes.
6. If changes are requested, the author creates a new draft revision.
7. Author corrects and resubmits.
8. Reviewer approves the corrected revision.
9. Authorized publisher publishes the approved revision.

The minimum states are:

- `draft`
- `in_review`
- `changes_requested`
- `approved`

Publication is recorded separately using a published revision pointer.

A review decision must record:

- Acting user.
- Revision.
- Action.
- Optional or required comment, depending on action.
- Timestamp.

A `changes_requested` action requires a comment.

## Phase 1 requirements

- Submission.
- Approval.
- Changes requested.
- Reviewer comments.
- Resubmission as a new revision.
- Publication.
- Unpublication.
- Rollback to an earlier approved revision.
- Basic audit trail.

Phase 2 adds richer reviewer dashboards, assignments, notifications and advanced revision comparisons.

# 5. Transactional Conflict Detection

Minimum revision conflict handling is part of Phase 1.

Every draft records a `base_revision_id`. Allow one active draft/review candidate per lesson, enforced in the database. Use version-checked draft saves to prevent lost updates between browser tabs.

When publishing, the backend must verify that the revision was created against the expected published version or has undergone an explicit, audited reconciliation.

## Required behavior

If the published revision has changed since the draft was created:

- The system detects the mismatch.
- Publication is blocked by default.
- The reviewer receives a conflict message.
- A new corrected or reconciled revision can be submitted.

The backend must not silently replace newer approved material.

The conflict check and update of the published revision pointer must occur within a database transaction.

Use row locking or another appropriate concurrency-control mechanism to prevent simultaneous publishing requests from bypassing the check.

An explicit override must not bypass required educational review.

# 6. Reviewed Content Metadata

A submitted revision must capture all educational information that affects the meaning, classification or validity of the lesson.

## Stable lesson identity

The lesson entity contains stable identity information:

- `id`
- `translation_group_id`
- `language`
- `published_revision_id`
- Creation timestamp
- Archive status

A stable lesson URL identifier may also be stored separately.

## Reviewed lesson snapshot

Each lesson revision contains:

- Title.
- Learning objectives.
- Prerequisites.
- Educational content JSON.
- Content schema version.
- Topic/chapter association.
- Applicable curriculum assignments.
- Language-specific educational metadata.
- Embedded exercise questions and worked solutions.
- Referenced immutable media asset IDs.
- Author ID.
- Base revision ID.
- Creation and submission timestamps.

Curriculum assignments referenced in a revision must identify the applicable curriculum version or immutable assignment version.

Changing a lesson's objectives, prerequisites, subject classification or curricular applicability requires a new reviewed revision.

Changing unrelated display preferences or site-wide styling does not.

## Slugs and URLs

Public route identifiers should be stable.

Changing the visible title must not automatically invalidate existing bookmarked lesson URLs.

If URL slugs change, maintain redirects or an equivalent stable resolution strategy.

# 7. Pilot Exercises, Media and Withdrawal

Exercises and worked solutions are embedded inside the lesson revision and reviewed with it. Independent exercise records, reuse across lessons, and dependency lookup are deferred beyond the pilot. Images retain immutable asset identifiers; replacements create new assets.

A withdrawn lesson revision records a reason, cannot be newly published or restored, and can be promptly unpublished by an administrator. Withdrawal and unpublication are audited.

# 8. Canonical Content Rendering

The renderer decision remains subject to the technical prototype.

Start with restricted Go rendering and locally hosted browser-side KaTeX. Measure mixed-direction formulas, mobile payload, and preview consistency. Compare the JavaScript alternative only if evidence warrants it. Available approaches:

**Option A: Restricted Go JSON-to-HTML renderer.**

**Option B: TipTap JavaScript static renderer integrated into the publishing and preview pipeline.**

## Required behavior

Whichever option is chosen must support:

1. Studio preview requests.
2. Publication.
3. Regeneration of previously rendered content.
4. French scientific content, with optional Arabic/Tunisian-dialect explanations retaining French scientific terms; a separate fixture covers mixed-direction stress cases.
5. Mixed-direction paragraphs.
6. Inline and block mathematics.
7. Images.
8. Lists.
9. YouTube embeds.
10. Educational callouts.

## Preview consistency

Studio previews and student-facing pages must use the same canonical rendering pipeline.

Preview HTML must not be generated through an independent React implementation that can diverge from production output.

## JavaScript renderer requirements

If the TipTap JavaScript renderer is chosen, the implementation must document how Go invokes the renderer during preview and publication.

Potential approaches include a controlled rendering process or a local service, depending on prototype results.

The team must test:

- Preview latency.
- Rendering failures.
- Process isolation.
- Resource consumption.
- Safe HTML output.
- Deployment and maintenance complexity.

Do not assume that a build-time renderer alone is sufficient for live editor previews.

## Rendering artifacts

The authoritative content remains structured JSON.

Generated HTML is stored as a derived rendering artifact with a renderer version.

Rendering artifacts can be regenerated when presentation logic changes.

Regeneration must not modify an immutable educational revision's source content or silently change its embedded exercises or immutable media references.

# 9. Student Authentication and Access

Mandatory student accounts remain a project requirement.

## Initial authentication

Preferred public-launch implementation:

- Email/password.
- Secure password hashing.
- Server-managed sessions.
- Password recovery.
- Authentication rate limiting.
- Basic profile management.

Google Sign-In remains optional for a later phase.

## Email verification policy

Whether email verification must be completed before a student can view their first lesson remains an open product decision.

The prototype should test the impact of verification on first-time access.

The final policy should balance:

- Account security.
- Abuse prevention.
- Email delivery reliability.
- Accessibility for students.
- Friction during registration.

Do not silently make email delivery a prerequisite for accessing every first lesson without validating the user experience.

## Student benefit

The MVP includes bookmarks.

A student can save a lesson and later return to it from their dashboard.

No advanced progress-tracking system is required initially.

# 10. Phase 1 Scope

Phase 1 must deliver a small but complete production-capable learning workflow.

## Build in Phase 1

### Student experience

- Registration.
- Authentication.
- Subject and chapter navigation.
- Protected lesson pages.
- Basic exercises with solutions.
- YouTube embeds.
- Bookmarks.
- Basic title search.

### Internal authoring

- Invited internal author accounts.
- Structured lesson editor.
- Saving drafts.
- Previewing.
- Submitting for review.
- Reviewer comments.
- Changes requested.
- Approval.
- Publication.
- Basic attribution.

### Revision safety

- Immutable submitted snapshots.
- Base revision conflict detection.
- Exercises embedded in lesson revisions.
- Immutable media dependencies.
- Withdrawal mechanism.
- Unpublication.
- Restoration of previously approved content.
- Audit records.

### Infrastructure

- Docker Compose.
- PostgreSQL migrations.
- Persistent media storage.
- Secure reverse-proxy setup.
- Public asset caching.
- Authentication-aware response headers.
- Database and media backups.
- Backup restoration test.
- Basic monitoring.
- Deployment rollback procedure.

## Do not build in Phase 1

- Public contributor onboarding.
- Complex teacher profiles.
- Advanced reviewer assignment.
- Email review notifications.
- Sophisticated revision diff viewer.
- Complex automated grading.
- Broad curriculum management UI.
- Translation-management dashboard.
- Detailed student analytics.
- Native mobile applications.
- AI tutoring.
- Forums or messaging.

# 11. Minimal Prototype Content Scope

The first real lesson should demonstrate:

- One BAC section.
- One subject.
- One topic.
- French scientific content; optional Arabic/Tunisian-dialect explanations retain French scientific terms. Test mixed-direction support separately when the lesson does not need such explanations.
- Mathematical expressions.
- One educational image.
- One YouTube video.
- One worked example.
- One exercise embedded in the lesson revision.

The content should be reviewed by a real teacher or other appropriately qualified reviewer.

This avoids treating synthetic placeholder content as proof of educational quality.

# 12. Database Prototype Scope

Do not finalize every future database table before validating the editor.

Implement only the tables and relationships necessary for the first complete workflow, while retaining essential long-term invariants.

Minimum domain areas:

- Users and authentication.
- Roles and permissions.
- Curriculum identifiers.
- Lesson identity.
- Lesson revisions.
- Review events.
- Embedded exercise content within lesson revisions.
- Media assets.
- Immutable media references.
- Bookmarks.
- Audit events.

Initial migrations should enforce core foreign keys and uniqueness constraints.

Later migrations can expand curriculum management, translations, examination banks and advanced moderation.

# 13. Hosting and Operations

Learnoo will initially use the existing server:

- 4 vCPU.
- 24 GB RAM.
- Approximately 15% reported CPU utilization.
- Approximately 5 GB reported RAM usage.
- Other containerized workloads already running.

These numbers are an initial indication of capacity, not a performance guarantee.

Before broader student access, validate:

- Peak CPU utilization.
- Memory headroom.
- Free disk space.
- Disk performance.
- Database growth.
- Media storage growth.
- Backup storage availability.
- Concurrent user behavior.

Use Docker Compose with resource constraints and appropriate monitoring.

The minimal runtime architecture remains:

- Go application.
- PostgreSQL.

Additional rendering processes are permitted if justified by the prototype.

Cloudflare will cache public pages and static assets, but not authenticated educational content through shared edge caching.

# 14. Licensing and Contribution Rights

Commercial use of original code and educational content is prohibited without permission, including commercial educational institutions. The [rights notice](../LICENSE.md) is interim; a complete reuse license and contributor terms are pending. External code/content acceptance is deferred while planning feedback is welcome. See [licensing status](LICENSING.md). No custom license draft is adopted.

# 15. Prototype Milestone

The first milestone is an end-to-end demonstration.

## Acceptance scenario

1. An invited author signs in.
2. The author creates a real educational lesson.
3. The lesson contains French scientific content, formulas, an image, a video and an exercise. Arabic/Tunisian-dialect explanations are optional and retain French scientific terms; verify mixed-direction rendering with a separate fixture if needed.
4. The author saves and previews the lesson.
5. The author submits the lesson for review.
6. A different authorized reviewer requests a correction with a comment.
7. The author submits a corrected new revision.
8. The reviewer approves it.
9. The reviewer or another authorized publisher publishes it.
10. A student registers and signs in.
11. The student reads the lesson on a mobile device.
12. The student bookmarks it.
13. A new draft is created while the existing approved revision remains available.
14. A stale publication attempt is detected and blocked.
15. A previous approved revision can be restored.
16. An incorrect lesson revision is withdrawn, blocked from restoration, and unpublished.
17. Database and media can be restored from a tested backup.

## Completion criteria

The milestone is complete only when the entire flow works with real database records and the intended permission boundaries.

A visual demonstration without functional review, publishing and restoration is not sufficient.

# 16. Immediate Implementation Package

Instead of expanding the master specification again, prepare four implementation artifacts.

## Artifact A — Decision Log

A concise record of:

- Settled architectural choices.
- Open decisions.
- Decision owners.
- Reasons for each major choice.
- Prototype findings.

## Artifact B — Initial Data and Content Schema

Include:

- Minimal PostgreSQL migrations.
- Initial entity-relationship diagram.
- Lesson revision invariants including embedded exercises.
- Educational JSON block schema.
- One real sample lesson fixture.

## Artifact C — Initial Wireframes

Design:

- Mobile student lesson reader.
- Lesson editor.
- Reviewer decision screen.
- Basic student registration and dashboard.

The wireframes should become implementation references rather than decorative concepts.

## Artifact D — GitHub Backlog

Create small, independently testable issues.

Each issue should include:

- Objective.
- Relevant files or modules.
- Dependencies.
- Acceptance criteria.
- Test requirements.
- Suggested difficulty.
- Contributor role.

The backlog should prioritize one complete working workflow over implementing many disconnected screens.

# 17. Implementation Roadmap

## Milestone 0 — Technical Proof of Concept

Validate:

- Authentication.
- Database migrations.
- Structured content editing.
- Mixed-direction content.
- Canonical rendering.
- Basic review and publishing.
- Protected lesson display.

## Milestone 1 — Internal Educational MVP

Complete the author-reviewer-student workflow, revision recovery, bookmarks, backups and mobile usability.

Publish a small set of validated lessons.

## Milestone 2 — Trusted Teacher Contribution Beta

Add contributor onboarding, more convenient moderation, richer dashboards and notifications.

Allow selected teachers to create and manage submissions independently.

## Milestone 3 — Public Community Expansion

Expand curriculum coverage and recruit more educational contributors.

Improve search, examinations, content review tools and volunteer recognition.

## Milestone 4 — Advanced Learning Features

Consider progress tracking, PWA functionality, mobile applications and more advanced exercises after the core learning and contribution systems prove useful.

# 18. Final Decision

This implementation plan is the baseline for technical prototyping.

The following architectural decisions are stable:

- Go modular monolith.
- PostgreSQL.
- React/TypeScript Studio.
- TipTap educational editor, subject to prototype validation.
- Mandatory free student accounts.
- Go-rendered public and student pages.
- Structured educational content.
- Immutable submitted revisions.
- Human editorial review.
- Embedded exercises and immutable media.
- Docker Compose.
- Existing shared server.
- Cloudflare.
- YouTube.
- GitHub software contributions.
- Native teacher contributions.

The remaining uncertainty should be resolved through working prototypes rather than another broad architectural redesign.

**The next objective is to build one complete lesson workflow that is secure, educationally accurate, reviewable, versioned, recoverable and usable by a student on a smartphone.**
