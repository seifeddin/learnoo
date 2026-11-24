# Repository instructions

Start with docs/CAHIER_DES_CHARGES.md for the access model, milestone plan and working protocol. Live task state, ownership and blockers are on GitHub issues: check the issue and be assigned before starting, and end every PR with the handoff described there. Then read README.md, docs/REQUIREMENTS.md, docs/ARCHITECTURE.md, and docs/DECISIONS.md before implementation. Read docs/CONTENT_AND_EDITORIAL.md for content, permissions, or publication work.

Read docs/PROJECT_PLAN.md for the broad direction and docs/IMPLEMENTATION_PLAN.md for the overriding current implementation scope. Working docs summarize it. Record material decisions rather than silently expanding scope.

Before motion or 3D work read DESIGN.md, MOTION.md, requirements, architecture, and installed dependencies. Project intent > DESIGN.md > MOTION.md > architecture/dependencies > global skills > library documentation. Skills teach how; availability does not justify effects. No decorative motion or 3D is planned. Honor reduced motion and mobile accessibility. Do not add overlapping animation owners.

Never bypass server-side authorization, self-approval prevention, immutable snapshots, or transactional publication to simplify a demo. Do not select a license, invent legal agreements, claim teacher validation, or mark operational checks complete without evidence.

Keep changes focused and run checks appropriate to the work. No production deployments or credentials belong in this documentation bootstrap.

## No AI attribution

Never credit an AI tool (Claude, Codex, Copilot, ChatGPT or similar) in commits, pull requests, issues or comments: no `Co-Authored-By` trailers, no "Generated with" footers, and no AI author or committer identity. Commits are authored by the human contributor. Commit messages are one short, plain line. CI rejects pull requests whose commits break this rule.

## Task boundaries and implementation

Work on an assigned issue or explicitly requested scope. Read its dependencies and acceptance criteria before editing. If prerequisites are missing, identify them rather than silently inventing educational content, legal permissions, or completed work.

The selected stack is Go for the backend and server-rendered reader, PostgreSQL for persistence, and React/TypeScript with TipTap for Studio. Begin math rendering with locally hosted browser-side KaTeX. A local renderer experiment exists; read docs/DEVELOPMENT.md for verified setup and test commands. It is not the authenticated application. Do not expose the experiment publicly.

Create a feature branch from develop and use pull requests. Follow CONTRIBUTING.md for maintainer exceptions. The exception for repository maintenance does not relax the application's rule that educational authors cannot approve their own lessons.

## Agent skills

Project skills live in [.agents/skills/](.agents/skills/); Claude Code accesses the same files through `.claude/skills`. Use `learnoo-editorial-invariants` for revision/workflow changes, `learnoo-security` for trust-boundary changes, and `learnoo-code-review` for reviews. Load only applicable skills; their checklists support, rather than replace, project requirements and enforced safeguards. Optional external UI guidance is listed in [RECOMMENDED_SKILLS.md](.agents/RECOMMENDED_SKILLS.md); do not vendor it or infer new product scope from it.
