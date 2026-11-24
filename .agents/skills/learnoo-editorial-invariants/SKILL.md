---
name: learnoo-editorial-invariants
description: Implement or review changes to lessons, revisions, review, publishing, withdrawal, restoration, or their media dependencies. Do not use for unrelated UI styling or repository maintenance.
---

# Editorial invariants

Read [editorial rules](../../../docs/CONTENT_AND_EDITORIAL.md) and the relevant [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md) sections before changing the workflow. They are the source of truth; [open decisions](../../../docs/DECISIONS.md) stay open.

For each affected invariant, enforce it server-side and verify the corresponding behavior. Use real database transactions for concurrency tests, not only mocked repositories.

- **Immutable submissions:** reject changes to submitted content and educational metadata; corrections create a successor. Test attempted edits and unchanged stored snapshots, including exercises/media references.
- **One active candidate:** enforce one draft/review candidate per lesson with a database constraint. Test concurrent creation and the changes-requested → successor transition without deleting history.
- **Versioned saves:** reject stale draft writes. Test two editor tabs saving the same version; the losing save must not overwrite the winner.
- **Atomic publication:** compare the expected base and update the pointer in one locked transaction. Test racing publishes, stale bases, wrong-lesson/unapproved revisions, and retaining the published version during drafting. Corrections still require review.
- **Independent review:** authors never approve their own revision, including users with admin or multiple roles. Test self-approval denial, subject authorization, separate publishing permission, and a valid different reviewer.
- **Audited withdrawal/restoration:** record actor, revision, action, timestamp and withdrawal reason. Test withdrawal of the current revision, explicit unpublication, and denial of withdrawn content. Restoration rechecks approval/media eligibility and atomically compares the expected current pointer; do not reuse the historical draft-base check. Verify audit records and pointer changes together.
- **Embedded exercises, immutable media:** test that exercise edits require a new reviewed snapshot and replacing media creates a new asset. Regenerating derived HTML must not mutate source snapshots or references.

Report which checks ran and which remain pending. An unreviewed technical fixture is not a teacher-approved lesson. Do not claim backup recovery or educational validation without evidence; follow [contribution expectations](../../../CONTRIBUTING.md).
