---
name: learnoo-code-review
description: Review a Learnoo diff or pull request for correctness, editorial safety, security, tests and scope. Use when a review is requested or required; not as a mandate for an unrelated repository-wide audit.
---

# Review a focused change

Read the diff, assigned issue and relevant source of truth: [contribution workflow](../../../CONTRIBUTING.md), [architecture](../../../docs/ARCHITECTURE.md), [implementation scope](../../../docs/IMPLEMENTATION_PLAN.md), and [open decisions](../../../docs/DECISIONS.md). Complement the agent's built-in review tools; do not replace them or introduce a parallel review framework.

- Trace changed behavior through callers, persistence and failure paths. Identify a concrete trigger and consequence for each finding; distinguish bugs from optional improvements.
- For editorial changes, apply [editorial invariants](../learnoo-editorial-invariants/SKILL.md): immutable snapshots, one active candidate, versioned saves, atomic publication, independent review, audited withdrawal/restoration, embedded exercises and immutable media.
- For trust-boundary changes, apply [security checks](../learnoo-security/SKILL.md): protected-route/media/API authorization, sessions/CSRF, auth abuse, shared caches, safe rendering, uploads and minimal personal data.
- Check tests proportional to the change: authorization, immutability, publication races, withdrawal, rendering safety and recovery. Concurrency needs database-backed evidence; a backup restore claim needs a real restoration result. Separate executed checks from proposed ones.
- Keep the Go monolith/PostgreSQL/server-rendered reader and planned React/TypeScript Studio boundaries. Reject speculative modules and unrelated dependencies. Follow [DESIGN.md](../../../DESIGN.md) and [MOTION.md](../../../MOTION.md): no decorative motion/3D or animation dependencies for this MVP.
- Check branch/PR scope and documented maintainer policy. Agent review does not grant merge approval or replace the owner's review. Do not change licensing, finalize unresolved policies, claim teacher approval, or treat the local renderer as deployable.

Return actionable findings ordered by severity, with file/line references, evidence and impact. State validation gaps and residual risks even if there are no findings. Stay within the requested review scope; do not silently fix, merge or publish a reviewed change.
