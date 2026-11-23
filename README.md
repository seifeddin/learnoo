# Learnoo

<p align="center"><img src="assets/brand/learnoo-logo.png" alt="Learnoo logo: a smiling student learning from books" width="320"></p>

Free, community-driven learning for Tunisian Baccalauréat students.

Learnoo will combine curriculum-aligned lessons, exercises, and educational videos with a native teacher contribution and review workflow. Students will access learning materials through free accounts. Teachers will contribute through Learnoo Studio; developers will collaborate here.

**Status:** documentation and technical prototype preparation. There is no working application or deployment yet.

## Start here

- [Project requirements](docs/REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Content and editorial rules](docs/CONTENT_AND_EDITORIAL.md)
- [Design direction](DESIGN.md) and [motion policy](MOTION.md)
- [Milestones and implementation backlog](docs/ROADMAP.md)
- [Decision log](docs/DECISIONS.md)
- [Contribution guidance](CONTRIBUTING.md)
- Agent entry points: [AGENTS.md](AGENTS.md) for Codex and [CLAUDE.md](CLAUDE.md) for Claude Code
- [Licensing status](docs/LICENSING.md)

## First milestone

Prove that one representative lesson can be edited, saved, reopened, and rendered correctly with Arabic, French, mathematics, an image, a YouTube reference, and a worked example. Begin with restricted Go rendering and locally hosted browser-side KaTeX; measure mobile performance before considering server-side JavaScript. Pilot exercises live inside lesson revisions, with one active draft/review candidate per lesson.

Next, implement the author → reviewer/publisher → student workflow with real permissions, safe revisions, and tested recovery.

## Planned stack

Go modular monolith · PostgreSQL · server-rendered learning pages · React/TypeScript/TipTap Studio · Docker Compose · YouTube video hosting.

Dependencies and runtime versions have not been selected or installed. Setup instructions will accompany the first runnable prototype.

## Scope and licensing

The initial pilot covers one BAC section and one subject. The section, subject, author, and independent reviewer remain to be selected.

Commercial use of the project's original code and educational content is prohibited without permission, including use by commercial educational institutions. See the [rights notice](LICENSE.md). A complete reuse license and contributor terms are pending; this is not an open-source license.

Planning feedback and issue discussions are welcome now. Acceptance of external code and educational contributions is deferred until those terms are established. See [contribution guidance](CONTRIBUTING.md).

Contributor pull requests will target `develop` and require approval from **@hadden-me**. `main` is the stable branch; `develop` is integration. Both branches require pull requests and block force pushes/deletion. Contributor changes require the owner’s code-owner approval; the owner has a documented PR-only review exception for their own changes. See [the workflow](CONTRIBUTING.md).

## Planning documents

The [project plan](docs/PROJECT_PLAN.md) describes the product and long-term direction. The [implementation plan](docs/IMPLEMENTATION_PLAN.md) defines the current prototype scope and takes precedence where it narrows the broader plan. Working guides summarize these documents; unresolved decisions live in the decision log.

Update these files in place as decisions evolve. Git records their history; filenames do not carry release numbers.
