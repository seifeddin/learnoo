# Repository instructions

Read README.md, docs/REQUIREMENTS.md, docs/ARCHITECTURE.md, and docs/DECISIONS.md before implementation. Read docs/CONTENT_AND_EDITORIAL.md for content, permissions, or publication work.

Read docs/PROJECT_PLAN.md for the broad direction and docs/IMPLEMENTATION_PLAN.md for the overriding current implementation scope. Working docs summarize it. Record material decisions rather than silently expanding scope.

Before motion or 3D work read DESIGN.md, MOTION.md, requirements, architecture, and installed dependencies. Project intent > DESIGN.md > MOTION.md > architecture/dependencies > global skills > library documentation. Skills teach how; availability does not justify effects. No decorative motion or 3D is planned. Honor reduced motion and mobile accessibility. Do not add overlapping animation owners.

Never bypass server-side authorization, self-approval prevention, immutable snapshots, or transactional publication to simplify a demo. Do not select a license, invent legal agreements, claim teacher validation, or mark operational checks complete without evidence.

Keep changes focused and run checks appropriate to the work. No production deployments or credentials belong in this documentation bootstrap.

## Task boundaries and implementation

Work on an assigned issue or explicitly requested scope. Read its dependencies and acceptance criteria before editing. If prerequisites are missing, identify them rather than silently inventing educational content, legal permissions, or completed work.

The selected stack is Go for the backend and server-rendered reader, PostgreSQL for persistence, and React/TypeScript with TipTap for Studio. Begin math rendering with locally hosted browser-side KaTeX. A local renderer experiment exists; read docs/DEVELOPMENT.md for verified setup and test commands. It is not the authenticated application. Do not expose the experiment publicly.

Create a feature branch from develop and use pull requests. Follow CONTRIBUTING.md for maintainer exceptions. The exception for repository maintenance does not relax the application's rule that educational authors cannot approve their own lessons.
