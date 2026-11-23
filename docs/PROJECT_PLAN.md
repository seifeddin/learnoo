# Learnoo — Project Plan

Status: proposed product and technical baseline, pending prototype validation.

This document describes Learnoo's mission, product requirements, and long-term direction. The [implementation plan](IMPLEMENTATION_PLAN.md) narrows the current scope and overrides older recommendations below where necessary. Update these documents in place; Git tracks their history.

# 1. Executive Summary

Learnoo is a completely free, community-driven e-learning platform designed to improve access to quality education for Tunisian students.

The project is inspired by Khan Academy, Wikipedia and open development communities.

Its main objective is to provide structured, reliable educational resources to students who cannot necessarily afford existing commercial learning platforms.

Learnoo will initially focus on the Tunisian Baccalauréat (BAC), with the possibility of expanding to other educational levels.

The platform will provide:

- Structured lessons organized by the Tunisian curriculum.
- Educational videos.
- Written explanations and mathematical formulas.
- Exercises and detailed solutions.
- Past BAC examination materials where reproduction is permitted.
- Student accounts and a basic personalized learning experience.
- A native content creation interface for teachers.
- A moderation and review process before publication.
- A public, community-contributed software codebase.

**All educational content on Learnoo requires a free student account.**

Teachers and other educational contributors will create content directly within the platform, without needing GitHub or technical knowledge.

Developers will contribute to the application through GitHub, with changes reviewed and merged by authorized maintainers.

The platform will initially run on an existing server using Go, PostgreSQL, React and Docker Compose.

The first priority is to develop and validate one complete learning and publishing workflow before scaling up features or curriculum coverage.

# 2. Mission, Vision and Principles

## Mission

Make high-quality educational content freely accessible to Tunisian students, independently of their financial situation.

## Long-term vision

Create a sustainable, community-maintained educational platform where students learn for free and educators continuously improve the available knowledge.

## Core principles

1. **Free education:** No mandatory subscription, tuition or payment for learning materials.
2. **Account-based learning:** Every student registers or signs in before accessing educational content.
3. **Community contribution:** Volunteers can create, correct and improve educational material.
4. **Educational validation:** Material is reviewed before publication.
5. **Open participation in development:** Developers can propose software improvements through GitHub.
6. **Non-commercial protection:** The project intends to restrict unauthorized commercial reuse of software and educational materials.
7. **Accessibility:** Learnoo must work well on affordable smartphones and modest internet connections.
8. **Multilingual support:** French, Arabic and mixed-language educational content are first-class requirements.
9. **Transparency:** Clear editorial attribution, governance and any future financial reporting.
10. **Technical simplicity:** Avoid unnecessary infrastructure and dependencies.
11. **Portability:** Educational content and infrastructure should be exportable and movable.
12. **Long-term sustainability:** The project should be maintainable by volunteers without depending indefinitely on a single person.

# 3. Target Audience

## Initial audience

Tunisian students preparing for the Baccalauréat.

The platform should eventually support all official BAC sections.

Examples include:

- Mathematics
- Experimental Sciences
- Technical Sciences
- Computer Science
- Economics and Management
- Literature
- Other applicable official sections

The official list, curriculum structure and teaching requirements must be confirmed from authoritative Tunisian educational sources.

## Future audience

- Students in earlier secondary-school levels.
- Teachers seeking a platform to share educational material.
- Students seeking exercises and past examinations.
- Volunteer educational content creators.
- Other learners following Tunisian curricula.

## Initial curriculum scope

The pilot should cover:

- One BAC section.
- One subject.
- Approximately 10–20 human-reviewed lessons.
- A small set of exercises with explained solutions.
- At least one complete chapter or meaningful learning sequence.

The long-term data model should accommodate other sections without requiring major restructuring.

# 4. User Roles and Permissions

A user account can have multiple roles.

Authorization must be enforced by the backend rather than solely by frontend controls.

## 4.1 Student

Students can:

- Register for free.
- Sign in and sign out.
- Select their BAC section.
- Choose a preferred interface language.
- Browse subjects and chapters.
- View lessons.
- Watch embedded educational videos.
- Access exercises and worked solutions.
- Search educational content.
- Bookmark lessons.
- View bookmarked lessons in a simple dashboard.
- Manage account information.
- Report incorrect educational material.

Students do not automatically receive publication permissions.

## 4.2 Contributor / Teacher

Contributors can:

- Access student features.
- Enter Learnoo Studio.
- Create content drafts.
- Edit their own drafts.
- Upload or reference educational images.
- Insert formulas and diagrams.
- Add videos and exercises.
- Preview content.
- Submit revisions for review.
- Receive feedback.
- Correct and resubmit content.
- See contribution history.
- Receive public attribution.

Contributor permissions must be granted by authorized administrators.

## 4.3 Subject Reviewer

Reviewers can:

- View submitted content within their assigned subject areas.
- Check curriculum alignment.
- Verify mathematical and factual correctness.
- Review exercise questions and solutions.
- Request changes.
- Approve educational revisions.
- Record review comments and decisions.
- Report copyright or content-policy concerns.

Reviewer assignments should support subject-specific authorization.

## 4.4 Administrator

Administrators can:

- Manage accounts and roles.
- Approve contributors and reviewers.
- Maintain curriculum structure.
- Review audit logs.
- Publish approved revisions.
- Restore previous approved revisions.
- Unpublish content.
- Moderate contributions.
- Manage platform configuration.
- Handle content reports.

The founding maintainer retains final technical control initially.

## 4.5 Editorial separation of duties

For the initial production release, the intended rule is:

**An author cannot approve their own educational revision.**

A different authorized reviewer must approve the content.

Publication is a separate action performed by an authorized publisher or administrator.

The system should record the identity and time of every submission, approval and publication action.

If there are insufficient reviewers at the start, the team must recruit a trusted reviewer or define a clearly documented exceptional procedure. Silent self-approval should not be the default.

# 5. Authentication and Account Management

All full educational content requires authentication.

## 5.1 Registration

Students can create free accounts.

The preferred public-launch authentication method is:

**Email and password, with account recovery.**

Google Sign-In can be added as an optional method later.

A Google-only sign-in system may be used for an explicitly limited internal pilot, but should not be assumed suitable for every Tunisian student.

## 5.2 Required account information

Keep the registration form minimal:

- Display name or pseudonym.
- Email address.
- Password, when using password authentication.
- Optional BAC section.
- Preferred interface language.

Do not require school, phone number, address or other unnecessary information.

## 5.3 Email verification

For the broad public release, email verification should be supported.

The project must define whether unverified accounts can temporarily access lessons or only account-related pages.

**Recommended default:** Allow sign-in but require verification before full educational access, with a resend-verification mechanism and reasonable safeguards against email delivery failures.

This rule should be tested against the goal of minimizing barriers to free education.

## 5.4 Password handling

Use established password hashing and authentication libraries.

Requirements:

- Argon2id or another suitable modern password hashing algorithm.
- Secure password reset tokens.
- Short-lived, single-use recovery links.
- Login rate limiting.
- Secure session rotation.
- Session revocation.
- Protection against account enumeration.

Never store plaintext passwords.

## 5.5 External identities

The database should support multiple authentication identities linked to a single user.

If Google Sign-In is added later, do not automatically merge accounts based only on an unverified email match.

Account linking must require appropriate verification of ownership.

## 5.6 Sessions

Use server-managed sessions with secure cookies.

Requirements:

- HttpOnly cookies.
- Secure cookies over HTTPS.
- Appropriate SameSite policy.
- CSRF protection.
- Session expiration.
- Logout and revocation.
- Server-side authorization checks.

Protected API endpoints must return appropriate authentication or authorization errors.

## 5.7 Student privacy

Some BAC students are minors.

Requirements include:

- Minimal personal data collection.
- A clear privacy policy.
- Appropriate consent and age-related safeguards.
- Account deletion procedures.
- Defined data retention periods.
- No compulsory public profiles.
- No direct student messaging during the MVP.
- No unnecessary tracking of learning behavior.

Applicable Tunisian data protection requirements must be reviewed before broad public registration.

# 6. Student Learning Experience

## 6.1 Public homepage

The homepage is accessible without an account.

It should explain:

- What Learnoo is.
- The free educational mission.
- Available BAC sections.
- How students can register.
- How teachers can contribute.
- How developers can participate.

The homepage should contain clear registration and login actions.

## 6.2 Public curriculum catalog

The platform may expose limited public information such as:

- BAC sections.
- Subjects.
- Chapter titles.
- General topic descriptions.
- Availability of educational materials.

Full lessons and exercise solutions remain protected.

This public catalog helps search engines discover Learnoo while preserving the account requirement.

## 6.3 Student dashboard

After login, the student sees a simple dashboard.

Initial features:

- Selected BAC section.
- Subject shortcuts.
- Available lessons.
- Bookmarked lessons.
- Recently updated educational material.
- Language preferences.

Avoid building complicated progress analytics during the initial MVP.

## 6.4 Lesson reader

A lesson page should contain:

- Title.
- Subject and chapter.
- Learning objectives.
- Prerequisites where relevant.
- Written explanation.
- Mathematical formulas.
- Definitions and examples.
- Images or diagrams.
- Optional YouTube video.
- Relevant exercises.
- Worked solutions or links to solutions.
- Contributor attribution.
- Review information.
- Bookmark action.
- Report-an-error action.

A lesson must remain educationally useful without an accompanying video.

## 6.5 Student bookmarks

Bookmarks are included in the MVP to provide an immediate benefit to account holders.

Students can:

- Save a lesson.
- Remove a bookmark.
- View bookmarked lessons in the dashboard.

A bookmark references the stable lesson identity, not one particular revision.

The bookmark should resolve to the current published revision.

## 6.6 Low-bandwidth experience

Requirements:

- Responsive design.
- Small initial JavaScript payloads.
- Optimized images.
- Lazy-loaded YouTube players.
- Fast HTML rendering.
- Avoid unnecessary network requests.
- Readable content without loading videos.

# 7. Educational Curriculum Model

Learnoo must represent the Tunisian curriculum in a structured, versioned way.

## 7.1 Main concepts

- Education level.
- Academic section.
- Subject.
- Topic or chapter.
- Curriculum version.
- Curriculum assignment.
- Lesson.
- Exercise.
- Examination.

## 7.2 Shared topics

The same topic may appear in multiple BAC sections.

For example, a mathematical concept could be required in both Mathematics and Experimental Sciences, but at different depths.

Do not duplicate the concept solely because it appears in different sections.

Instead, use curriculum assignments to indicate:

- Applicable BAC section.
- Subject.
- Curriculum version.
- Topic.
- Required depth or learning objectives.
- Display order.

Lessons may be shared across compatible curriculum assignments.

## 7.3 Curriculum versions

Educational programs can change over time.

Every curriculum assignment should belong to a specific version or program edition.

The platform must be able to distinguish current materials from older ones.

Do not delete historical curriculum associations without an intentional archival policy.

# 8. Language and Translation Architecture

Learnoo supports French and Arabic from the beginning.

## 8.1 Interface language vs content language

These are separate concepts.

**Interface language:** The language used for menus, buttons, navigation and account settings.

**Content language:** The language used for a lesson, exercise or educational resource.

A student using the Arabic interface may still study a mathematics lesson written in French.

## 8.2 Lesson translations

Translations are separate lesson records linked by a shared translation group.

Example:

```
Translation Group: 42
│
├── Lesson 101
│   ├── Language: fr
│   └── Title: Étude des fonctions
│
└── Lesson 102
    ├── Language: ar
    └── Title: دراسة الدوال
```

Each language version has:

- Independent revisions.
- Independent authors.
- Independent reviewers.
- Independent publication state.
- Its own title and URL slug.

A translation does not need to be published at the same time as the original.

## 8.3 URLs

Use localized URL structures where appropriate.

Examples:

```
/fr/learn/lessons/etude-des-fonctions
/ar/learn/lessons/dirasat-al-dawal
```

Public multilingual catalog pages should use appropriate SEO metadata and `hreflang` links.

Full lesson contents must remain behind authentication.

## 8.4 Mixed-direction content

Learnoo must support Arabic and French within the same lesson or paragraph.

Test:

- Arabic and French text together.
- Mathematical formulas embedded in Arabic.
- Numerals and punctuation.
- Text selection.
- Cursor behavior.
- Copy and paste.
- Mobile editing.
- Rendering in right-to-left layouts.

This is a critical technical proof-of-concept requirement.

# 9. Educational Content Model

Educational content is stored in PostgreSQL.

GitHub is not the primary content database.

## 9.1 Structured content

Lessons should use a restricted JSON document schema.

The schema must support safe rendering and future migration.

Content should be independent of the editor's specific UI implementation where practical.

## 9.2 Initial content blocks

The first editor prototype will support only:

1. Paragraph.
2. Heading.
3. List.
4. Image.
5. Mathematical formula.
6. YouTube embed.
7. Styled callout or worked example.

The callout block can initially represent definitions, theorems, examples and remarks using a type field.

Exercise links or simple embedded exercise references can be added to the schema as part of the first integrated publishing prototype.

More complex interactive exercise blocks can follow later.

## 9.3 Content schema versioning

Every stored document should record a content schema version.

This allows future migrations when blocks change.

Avoid silently rewriting old content into incompatible formats.

## 9.4 Markdown

Markdown import/export is not an MVP requirement.

Complex educational content may not round-trip cleanly through Markdown.

Prioritize structured JSON and a reliable rendering system.

Portable export formats can be added later.

# 10. Learnoo Studio

Learnoo Studio is the native browser-based authoring and moderation interface.

**Frontend technology:** React, TypeScript, Vite and TipTap.

## 10.1 Initial editor

The editor should allow:

- Creating a lesson.
- Selecting curriculum metadata.
- Choosing language.
- Entering structured content.
- Inserting formulas.
- Uploading images.
- Adding YouTube references.
- Saving a draft.
- Previewing the rendered result.
- Submitting for review.

## 10.2 Admin-first rollout

The first version of Studio will be available to trusted internal users.

This reduces the need to build full community onboarding before the first lessons can be published.

Teachers can initially collaborate using structured document templates, with authorized editors importing the reviewed material into Learnoo.

## 10.3 Community contribution rollout

Later, contributors receive access to:

- Personal drafts.
- Submission status.
- Revision history.
- Review feedback.
- Resubmission.
- Attribution.
- Contributor profile information.

Reviewers gain:

- Pending submissions.
- Educational review controls.
- Comments.
- Approval actions.
- Revision comparisons.

## 10.4 Autosaving

Autosave may be implemented after the basic editing and submission process works.

For the first prototype, reliable explicit saving is acceptable.

Never allow autosave to mutate an immutable submitted revision.

# 11. Content Rendering Architecture

This is one of Learnoo's highest-risk technical areas.

## 11.1 Public and student-facing rendering

Use Go server-rendered HTML for public information pages and authenticated student learning pages.

Benefits include:

- Fast initial rendering.
- Reduced frontend JavaScript.
- Straightforward routing and authorization.
- Lower operational complexity.
- Reliable public-page SEO.
- Good mobile performance.

## 11.2 Editor rendering challenge

TipTap generates structured JSON and provides JavaScript-based rendering utilities.

Go does not automatically understand every TipTap node and mark.

There are two possible approaches.

### Option A — Go renderer

Implement a restricted JSON-to-HTML renderer in Go.

Advantages:

- One production application runtime.
- Direct integration with the Go backend.
- Simple deployment.

Disadvantages:

- Custom implementation for each supported block.
- Ongoing maintenance when the editor schema changes.
- Potential differences from TipTap's rendering behavior.

### Option B — TipTap JavaScript static renderer

Use TipTap's rendering tools during a controlled publishing process.

Advantages:

- Uses renderer tooling aligned with the editor schema.
- May reduce custom rendering code.
- Easier support for some TipTap-specific structures.

Disadvantages:

- JavaScript runtime or build/publishing dependency.
- More complicated publishing pipeline.
- Requires secure HTML sanitization and integration with Go.

## 11.3 Required prototype

Before finalizing the renderer, create one representative lesson containing:

- French text.
- Arabic text.
- Inline and block mathematics.
- A heading.
- A list.
- An image.
- A YouTube video.
- A worked example.

Test both approaches for:

- Rendering accuracy.
- Mobile display.
- Directionality.
- Security.
- Development complexity.
- Maintainability.

**Final renderer choice: pending prototype results.**

## 11.4 Canonical rendering

Once selected, a single canonical rendering pipeline must be used for:

- Studio previews.
- Published lessons.
- Regenerated lesson HTML.

Do not maintain unrelated React and Go content renderers that can produce contradictory results.

## 11.5 Stored rendered HTML

The authoritative content is structured JSON.

Rendered HTML is a generated artifact.

Store:

- Content JSON.
- Content schema version.
- Rendered HTML or a reference to it.
- Renderer version.

When rendering behavior changes, HTML can be regenerated safely.

The HTML must be validated and sanitized.

# 12. Lesson Revision and Publication Model

A stable lesson can have multiple revisions.

## 12.1 Lesson entity

Represents the long-lived identity of the educational lesson.

Suggested fields:

```
lesson
- id
- translation_group_id
- language
- slug
- topic_id
- published_revision_id
- created_at
- archived_at
```

## 12.2 Lesson revision entity

Represents a content snapshot.

Suggested fields:

```
lesson_revision
- id
- lesson_id
- base_revision_id
- revision_number
- content_json
- content_schema_version
- rendered_html
- renderer_version
- author_id
- created_at
- submitted_at
```

Review status and review history must be modeled in a way that preserves immutable content snapshots.

## 12.3 Review events

Suggested fields:

```
review_event
- id
- lesson_revision_id
- reviewer_id
- action
- comment
- created_at
```

Events may include:

- Submitted.
- Review started.
- Changes requested.
- Approved.
- Publication authorized.
- Published.
- Unpublished.
- Restored.

## 12.4 Initial publication workflow

```
Draft
  ↓
Submitted / In Review
  ↓
Approved
  ↓
Published
```

If changes are required:

```
In Review
  ↓
Changes Requested
  ↓
New Draft Revision
  ↓
Resubmitted
```

The editorial workflow must be implemented in Phase 1, even if the interface is basic.

## 12.5 Immutable submitted revisions

Draft content may be editable.

Once submitted, a revision's content snapshot becomes immutable.

Each resubmission creates a new revision.

Review decisions and workflow state may evolve, but submitted content must not change silently.

## 12.6 Published revision pointer

The lesson stores a `published_revision_id`.

Publishing changes the pointer to an approved revision.

A new draft does not affect the currently visible lesson.

Students continue seeing the approved published version until a replacement is authorized.

## 12.7 Concurrency and conflicts

Each draft records its `base_revision_id`.

If the published lesson has changed since that base revision, the application must warn the reviewer and prevent accidental overwriting.

A conflict requires reconciliation or an explicit, audited resolution.

Publishing must be implemented transactionally.

## 12.8 Rollback and unpublishing

Administrators can:

- Restore an earlier approved revision.
- Unpublish a lesson.
- Review publication history.

Restore actions should be audited.

# 13. Exercise Architecture

For the pilot, exercise questions and worked solutions live inside the immutable lesson revision. They are reviewed and published as part of that lesson. There is one active draft/review candidate per lesson, with draft-save version checks and a transactional publication-base comparison.

Independent exercise identities, reusable exercise banks, pinned exercise dependencies and cross-lesson withdrawal lookup are future expansion features, not pilot requirements. Examination reproduction rights must be verified before publishing third-party materials.

# 14. Media Management

Educational images and diagrams are managed separately from content JSON.

## 14.1 Image uploads

The upload pipeline should:

1. Authenticate and authorize the contributor.
2. Check file size and allowed type.
3. Decode the image safely.
4. Reject invalid or unsafe files.
5. Resize oversized images where appropriate.
6. Re-encode using suitable formats.
7. Strip unnecessary EXIF metadata.
8. Generate a stable asset identifier.
9. Store the file in controlled storage.
10. Associate it with the content revision.

Avoid exposing uploaded files through unsafe executable paths.

## 14.2 Immutable media

Once an asset is used in an approved published revision, replacing the image must not silently alter that revision.

New media replacements receive new asset identifiers or immutable versions.

## 14.3 Storage

Use a dedicated persistent media volume initially.

An object-storage service may be considered later.

Avoid storing image binaries directly in PostgreSQL without a specific justification.

## 14.4 Copyright verification

Contributors must confirm they have the necessary rights to submit the material.

Reviewers should verify that images, diagrams and textbook excerpts do not create obvious copyright problems.

## 14.5 Backups

Back up both:

- PostgreSQL data.
- Uploaded media files.

Include deployment configuration and a secure recovery procedure for secrets.

Test restoration periodically.

# 15. Video Strategy

Learnoo will primarily use YouTube for video hosting and streaming.

## 15.1 Official YouTube channel

Create an official Learnoo channel.

The account should have:

- Strong authentication.
- Appropriate channel permissions.
- At least one trusted backup administrator or manager where supported.
- Documented ownership and succession procedures.

## 15.2 Video contribution workflow

Initially:

1. Contributor creates a video.
2. Contributor submits a download link and metadata.
3. An authorized reviewer checks the educational material.
4. The channel manager uploads it manually.
5. The video is reviewed and made available.
6. The YouTube identifier is attached to the lesson.

Automated uploads may be implemented later.

## 15.3 AI-assisted content production

Possible tools:

- Codex and Claude for scripts and animations.
- HyperFrames for educational animation.
- Google speech tools or human voice recording for narration.
- Captioning and editing tools.

Workflow:

```
Educational lesson
       ↓
Script and storyboard
       ↓
Teacher review
       ↓
Animation production
       ↓
Narration
       ↓
Captions
       ↓
Final educational validation
       ↓
YouTube publication
```

AI-generated educational content must undergo human review.

Tunisian dialect narration should be evaluated for pronunciation, naturalness and accuracy.

## 15.4 Embedded playback

Use a lightweight YouTube player facade.

Initially load a thumbnail and play button.

Load the YouTube iframe only when the student chooses to play the video.

## 15.5 Mandatory accounts and YouTube

Learnoo requires authentication to access its lesson pages.

However, this does not make videos hosted publicly on YouTube account-restricted.

Public YouTube videos remain accessible on YouTube.

Unlisted videos can be accessed by anyone with the link.

This limitation is accepted for the MVP.

## 15.6 Advertising revenue

Learnoo may eventually generate revenue from eligible videos on its official YouTube channel.

This is not guaranteed.

Contributor permissions must explicitly cover any intended monetized distribution.

Revenue and expenses should be transparently documented.

# 16. Technical Architecture

## 16.1 Overall approach

Use a modular monolith built primarily with Go.

Do not use microservices for the MVP.

## 16.2 Backend

**Technology:** Go.

Responsibilities:

- Authentication.
- Session management.
- User authorization.
- Curriculum data.
- Lesson management.
- Revision management.
- Editorial workflow.
- Exercise management.
- Rendering.
- Search.
- Bookmarks.
- Media metadata.
- Audit logs.

Use REST endpoints for Studio and account-related interactions.

## 16.3 Student-facing frontend

Use Go server-rendered HTML templates.

JavaScript should be introduced only where needed for interactive features.

Prioritize fast loading and accessibility.

## 16.4 Studio frontend

Use:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui.
- TipTap.

The React application can be compiled into static assets served by Go.

## 16.5 Database

Use PostgreSQL.

Core entities include:

```
users
auth_identities
sessions
roles
user_roles
education_levels
academic_sections
subjects
topics
curriculum_versions
curriculum_assignments
translation_groups
lessons
lesson_revisions
review_events
media_assets
bookmarks
audit_events
```

This is a pilot domain inventory, not the final SQL schema. Exercise questions and solutions are embedded in lesson revisions. Independent exercise tables, cross-lesson exercise references, and examination collections are deferred.

The actual model must include foreign keys, uniqueness constraints, revision invariants and appropriate indexes.

## 16.6 Search

Begin with PostgreSQL search capabilities.

Support:

- French text.
- Arabic text.
- Lesson titles.
- Chapter names.
- Exercises.
- BAC examination references.

Evaluate `pg_trgm` and text normalization for mixed-language search.

Advanced relevance ranking is not part of the initial MVP.

# 17. Infrastructure and Deployment

## 17.1 Existing server

The initial infrastructure is already available.

Specifications:

- 4 vCPU.
- 24 GB RAM.
- Approximately 15% reported CPU usage.
- Approximately 5 GB reported RAM usage.
- Existing containerized applications.

These specifications suggest sufficient capacity for a small pilot, but actual limits must be validated.

## 17.2 Docker Compose

Deploy Learnoo as containers.

Minimal runtime services:

```
learnoo-app
learnoo-postgres
```

The Go application can serve:

- Public pages.
- Protected lesson pages.
- Studio assets.
- REST APIs.

Use the existing reverse proxy where possible.

## 17.3 Docker security

Requirements:

- Private database network.
- Persistent storage.
- Health checks.
- Resource limits.
- Restart policies.
- Non-root containers where practical.
- Environment-specific secrets.
- No unnecessary public ports.

## 17.4 Cloudflare

Use Cloudflare for:

- DNS.
- HTTPS.
- Static asset caching.
- Public landing-page caching.
- Basic abuse protection.

Do not use shared CDN caching for authenticated content.

## 17.5 Caching policy

**Can be publicly cached:**

- JavaScript and CSS bundles.
- Fonts.
- Public images.
- Public landing pages.
- Public catalog pages.

**Must not be shared-cached:**

- Authenticated lessons.
- Exercise solutions.
- Student dashboards.
- Account settings.
- Studio pages.
- Private API responses.
- Preview pages.

Use appropriate cache headers and explicit bypass rules.

Redis is not required for the MVP.

## 17.6 Performance

Before public launch:

- Measure current server peaks.
- Check available disk capacity.
- Monitor disk I/O.
- Test concurrent login and lesson requests.
- Evaluate PostgreSQL memory and CPU consumption.
- Validate image storage growth.
- Run basic load tests.
- Ensure Learnoo does not disrupt existing applications.

## 17.7 Backups and rollback

Required:

- Automated off-site PostgreSQL backups.
- Media volume backups.
- Periodic restoration testing.
- Documented deployment.
- Application rollback procedure.
- Database migration recovery strategy.
- Uptime and disk monitoring.

# 18. Software Licensing

Commercial use of original code and educational content is prohibited without permission, including commercial educational institutions. The [rights notice](../LICENSE.md) is interim; a complete reuse license and contributor terms are pending. External code/content acceptance is deferred while planning feedback is welcome. See [licensing status](LICENSING.md). No custom license draft is adopted.

# 19. GitHub Governance

The source code will be hosted publicly on GitHub.

## Policies

- GitHub organization.
- Protected main branch.
- Pull requests.
- CI checks.
- CODEOWNERS.
- Maintainer approvals.
- Contribution guidelines.
- Security policy.
- Code of conduct.
- Issue templates.

The initial maintainer controls merges and releases.

Other developers can submit changes for review.

## Repository structure

```
learnoo/
├── cmd/
│   └── server/
├── internal/
│   ├── auth/
│   ├── users/
│   ├── curriculum/
│   ├── lessons/
│   ├── reviews/
│   ├── rendering/
│   ├── media/
│   ├── search/
│   └── web/
├── web/
│   ├── templates/
│   ├── static/
│   └── studio/
│       ├── src/
│       └── package.json
├── migrations/
├── deploy/
│   ├── compose.yml
│   └── env.example
├── docs/
│   ├── PROJECT_VISION.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── CONTENT_SCHEMA.md
│   ├── AUTHENTICATION.md
│   ├── CURRICULUM.md
│   ├── EDITORIAL_GUIDELINES.md
│   ├── VIDEO_GUIDELINES.md
│   ├── DESIGN_SYSTEM.md
│   ├── DEPLOYMENT.md
│   └── ROADMAP.md
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── CODEOWNERS
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── LICENSE
```

Educational contributors interact with Learnoo Studio, not GitHub.

# 20. UI/UX Design

Learnoo should use a clean, modern educational design.

## Design objectives

- Mobile-first.
- Fast loading.
- Easy navigation.
- Accessible contrast.
- Readable mathematical notation.
- French and Arabic support.
- RTL support.
- Consistent components.
- Low-bandwidth compatibility.

## Initial screens

1. Public homepage.
2. Registration.
3. Login.
4. Student dashboard.
5. BAC section selection.
6. Subject and chapter navigation.
7. Lesson reader.
8. Exercise viewer.
9. Bookmarks.
10. Admin content editor.
11. Minimal review and approval screen.

The initial design should be documented with shared mockups and reusable component conventions.

## Mobile apps

Native Android and iOS applications are not MVP requirements.

A responsive website comes first.

Progressive Web App features may follow.

# 21. Project Roadmap

The roadmap is divided into a validation milestone and subsequent releases.

Dates are targets rather than guaranteed schedules.

## Phase 0 — Technical Validation

**Indicative duration:** 1–2 weeks, depending on volunteer availability.

Objectives:

- Create GitHub organization.
- Initialize Go and React projects.
- Configure Docker Compose.
- Create initial PostgreSQL migrations.
- Implement minimal authentication.
- Define lesson and revision schema.
- Prototype TipTap editing.
- Test French, Arabic and LaTeX.
- Compare Go and JavaScript rendering approaches.
- Define the initial content blocks.
- Implement a basic published lesson route.
- Begin legal and licensing review.

### Exit criteria

A lesson can be authored as structured content, saved, rendered and viewed through an authenticated route.

The team has chosen a canonical rendering strategy based on actual tests.

## Phase 1 — Internal MVP

**Initial target:** Approximately 4–6 weeks from project start, subject to prototype findings and volunteer capacity.

Build:

- Student registration.
- Email/password login and recovery.
- Session management.
- BAC section selection.
- Student dashboard.
- Basic bookmarks.
- Curriculum navigation.
- Protected lessons.
- Basic exercises.
- YouTube embeds.
- Basic title search.
- Admin-only Studio.
- Draft creation.
- Submission.
- Review and approval.
- Publication.
- Rollback and unpublishing.
- Minimal audit trail.
- Database and media backups.
- Production Docker deployment.

### Content target

Publish approximately 10–20 carefully reviewed lessons covering a coherent part of one subject.

### Exit criteria

Real students can register, log in, study lessons and bookmark material.

Authorized administrators can create, review, publish and restore content.

## Phase 2 — Trusted Contributor Beta

Build:

- Contributor invitations.
- Contributor permissions.
- Personal Studio dashboards.
- Teacher lesson submissions.
- Reviewer queues.
- Review comments.
- Changes-requested workflow.
- Revision conflict detection.
- Contributor attribution.
- Email notifications.
- Expanded audit history.

Begin with a small number of trusted teachers.

### Exit criteria

A teacher can independently submit educational content and receive approval or revision feedback without using GitHub.

## Phase 3 — Curriculum Expansion

Build:

- Additional BAC sections.
- More subjects.
- Larger exercise bank.
- Past BAC examination collections.
- Improved Arabic and French search.
- More educational videos.
- Improved contributor recognition.
- Curriculum coverage reporting.

## Phase 4 — Advanced Learning Tools

Potential features:

- Progress tracking.
- Continue-learning history.
- Personalized revision plans.
- Advanced interactive exercises.
- Offline access.
- PWA enhancements.
- Native mobile applications.
- Additional educational levels.
- Optional AI tutoring, subject to educational and privacy evaluation.

# 22. First End-to-End Technical Milestone

The most important immediate milestone is a small, working demonstration.

## Scenario

**A teacher creates one real lesson and a registered student studies it.**

Required sequence:

1. An authorized author signs in.
2. The author creates a lesson using Learnoo Studio.
3. The lesson contains French and Arabic text.
4. The lesson includes mathematical notation.
5. The lesson includes an image.
6. The lesson references a YouTube video.
7. The lesson includes a worked example and an exercise.
8. The author saves the draft.
9. The author previews the exact student rendering.
10. The author submits the revision.
11. A different authorized reviewer approves it.
12. An administrator publishes the revision.
13. A student registers and logs in.
14. The student opens the lesson on a smartphone.
15. The student bookmarks the lesson.
16. An author creates a new revision.
17. The previously published revision remains visible.
18. An authorized publisher can replace or restore the published revision.
19. Database and media backups can restore the relevant content.

This milestone validates the most difficult assumptions with minimal functionality.

# 23. MVP Acceptance Criteria

Learnoo's initial MVP is complete when:

- Students can create free accounts.
- Authentication and authorization work securely.
- Full educational content requires a valid session.
- Students can navigate their BAC section.
- Lessons display correctly on mobile devices.
- Mathematical notation renders accurately.
- French and Arabic content is readable.
- Students can watch linked videos.
- Students can access exercises and solutions.
- Students can bookmark lessons.
- Authorized authors can create and submit lessons.
- Different authorized reviewers can approve revisions.
- Administrators can publish approved content.
- Published revisions remain available during edits.
- Revision conflicts are detected before replacement.
- Essential publication actions are audited.
- Previous approved versions can be restored.
- Images and content can be recovered from backups.
- The production deployment is reproducible.
- At least 10–20 educational lessons have been reviewed.
- Real students and teachers have tested the platform.

# 24. Security and Quality Requirements

## Security

- HTTPS.
- Secure session cookies.
- Server-side authorization.
- CSRF protection.
- Authentication rate limiting.
- Secure password recovery.
- Safe content rendering.
- HTML sanitization.
- Safe image processing.
- Restricted file uploads.
- Internal-only database access.
- Secret management.
- Dependency security checks.
- Audit logs.

## Testing

- Go unit tests.
- Integration tests for database operations.
- Authentication and authorization tests.
- Revision publication tests.
- Concurrent publishing tests.
- Content validation tests.
- Rendering fixtures.
- Arabic/French/LaTeX rendering tests.
- Basic browser end-to-end tests.
- Backup restoration tests.

## Reliability

- Uptime monitoring.
- Disk utilization monitoring.
- Container resource limits.
- Database health checks.
- Deployment rollback.
- Off-site backups.
- Recovery documentation.

# 25. Community and Sustainability

Learnoo depends on volunteers.

The platform should recognize contributions through:

- Lesson attribution.
- Contributor profiles, where appropriate.
- Educational reviewer credit.
- Public contribution history.
- Clear contribution guidelines.
- Respectful review feedback.

## Potential future funding

- Voluntary donations.
- Infrastructure sponsorships.
- Partnerships with educational organizations.
- Eligible YouTube advertising income.
- Other lawful funding consistent with the project's mission.

Educational access must remain free.

Financial reporting should explain how project funding is used.

Do not assume future revenue will cover operating costs until it actually exists.

# 26. Explicitly Deferred Features

The MVP will not initially include:

- Native mobile applications.
- AI tutoring chatbots.
- Public student forums.
- Private student messaging.
- Live video classes.
- Certificates.
- Advanced gamification.
- Complex recommendation systems.
- Automated mathematical grading.
- Dedicated video hosting.
- Large-scale analytics.
- Microservices.
- Kubernetes.
- Redis without demonstrated need.
- Elasticsearch.
- Automated YouTube publishing.
- Advanced collaborative real-time editing.

These features should be evaluated only after the core platform demonstrates educational value and contributor adoption.

# 27. Open Decisions and Ownership

Not every implementation choice is finalized.

The project maintainer should assign a responsible person and target decision date to each item.

| Decision                               | Proposed owner                      | Required by                               |
| -------------------------------------- | ----------------------------------- | ----------------------------------------- |
| First BAC section and subject          | Project lead + teachers             | Phase 0                                   |
| Initial educational block schema       | Frontend lead + editor contributor  | Phase 0                                   |
| Rendering strategy                     | Backend + frontend leads            | Phase 0                                   |
| Authentication implementation          | Backend lead                        | Phase 0                                   |
| Email provider and verification policy | Backend/project lead                | Phase 1                                   |
| Final SQL schema                       | Backend/database lead               | Phase 0                                   |
| Initial author/reviewer assignments    | Project lead                        | Phase 1                                   |
| Media storage and processing           | Backend/infrastructure lead         | Phase 1                                   |
| Deployment limits and backup policy    | Infrastructure maintainer           | Phase 1                                   |
| Final software license                 | Project maintainer + legal reviewer | Before external code contributions        |
| Educational contributor terms          | Project maintainer + legal reviewer | Before external educational contributions |
| Brand identity and domain              | Project lead + designer             | Phase 1                                   |
| Video channel permissions              | Project maintainer                  | Before external video publication         |
| Broader community moderation policies  | Project lead + reviewers            | Phase 2                                   |

Legal review can proceed alongside early technical prototyping and does not need to delay internal experiments.

# 28. Final Technology Decisions

## Selected architecture

| Component                   | Technology                                       |
| --------------------------- | ------------------------------------------------ |
| Backend                     | Go                                               |
| Architecture                | Modular monolith                                 |
| Student-facing pages        | Server-rendered HTML                             |
| Studio frontend             | React + TypeScript                               |
| Frontend build              | Vite                                             |
| Styling                     | Tailwind CSS + shadcn/ui for Studio              |
| Rich-text editor            | TipTap                                           |
| Mathematical notation       | LaTeX / KaTeX-compatible rendering               |
| Canonical content rendering | Prototype decision pending                       |
| Database                    | PostgreSQL                                       |
| Authentication              | Email/password + server sessions                 |
| Future authentication       | Optional Google Sign-In                          |
| Video                       | YouTube                                          |
| Application deployment      | Docker Compose                                   |
| Reverse proxy               | Existing deployment infrastructure               |
| CDN                         | Cloudflare                                       |
| Search                      | PostgreSQL initially                             |
| Source control              | GitHub                                           |
| CI/CD                       | GitHub Actions                                   |
| Content storage             | PostgreSQL JSON and relational metadata          |
| Image storage               | Persistent local media volume initially          |
| Backups                     | Automated off-site database and media backups    |
| Mobile strategy             | Responsive web first                             |
| Code license                | Rights reserved; full terms pending |
| Content license             | Rights reserved; full terms pending            |

# 29. Project Success Criteria

Learnoo should not initially measure success by total registered accounts or number of generated videos alone.

More useful measures include:

- Number of validated educational lessons.
- Coverage of selected curriculum objectives.
- Quality and correctness of exercises.
- Ability of students to find relevant explanations.
- Mobile usability.
- Successful lesson completion during user testing.
- Number of active, trusted contributors.
- Time required to review and publish content.
- Number of corrections successfully handled.
- Infrastructure stability.
- Sustainability of volunteer participation.

The long-term goal is a platform that students trust and teachers enjoy contributing to.

# 30. Final Recommendation

Learnoo should begin with a deliberately small, fully functioning learning and publishing system.

**The first engineering milestone is not a beautiful homepage or a large content library. It is a complete, secure educational workflow:**

Teacher creates → Reviewer validates → Administrator publishes → Student signs in and learns → Content is revised safely.

Once that process is proven, developers can expand the platform while educators produce additional content in parallel.

The technology should support that mission without becoming the project's main source of complexity.

**Learnoo is therefore the proposed baseline for a focused technical prototype, followed by an internal MVP and a progressively opened community contribution system.**

The architecture is stable enough to start building, while the rendering, licensing and operational details remain explicitly subject to validation.

This is the consolidated **Learnoo** plan. I would now use it as the master reference and extract smaller GitHub documents and implementation tasks from it, rather than continuing to expand the main specification.
