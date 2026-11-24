# Learnoo

<p align="center"><img src="assets/brand/learnoo-banner.png" alt="Learnoo channel banner with its multicolour infinity mark" width="780"></p>

Free, community-driven learning for Tunisian Baccalauréat students.

[YouTube channel](https://www.youtube.com/@learnoo5344)

Learnoo will combine curriculum-aligned lessons, exercises, and educational videos with a native teacher contribution and review workflow. Students will access learning materials through free accounts. Teachers will contribute through Learnoo Studio; developers will collaborate here.

**Status:** a local Go + KaTeX renderer experiment is available. It is not the deployed learning platform; authentication, editorial publishing, and database persistence are not implemented. All sample lessons are unreviewed.

## Start here

- [Cahier des charges: status, access levels and plan to v1.0](docs/CAHIER_DES_CHARGES.md)
- [Run and test the local prototype](docs/DEVELOPMENT.md)
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

The experiment uses Go 1.25+, KaTeX 0.19.1 and Playwright 1.65.1; see [development instructions](docs/DEVELOPMENT.md). React/TipTap and PostgreSQL are planned for later milestones.

## Scope and licensing

The initial pilot is **Tunisian BAC Mathematics section → mathematics**. Teachers have expressed interest, but no author or independent reviewer is confirmed. The first chapter and lesson remain to be selected; technical fixtures must be labeled unreviewed.

Commercial use of the project's original code and educational content is prohibited without permission, including use by commercial educational institutions. See the [rights notice](LICENSE.md). A complete reuse license and contributor terms are pending; this is not an open-source license.

Planning feedback and issue discussions are welcome now. Acceptance of external code and educational contributions is deferred until those terms are established. See [contribution guidance](CONTRIBUTING.md).

Contributor pull requests will target `develop` and require approval from **@hadden-me**. `main` is the stable branch; `develop` is integration. Both branches require pull requests and block force pushes/deletion. Contributor changes require the owner’s code-owner approval; the owner has a documented PR-only review exception for their own changes. See [the workflow](CONTRIBUTING.md).

## Planning documents

The [project plan](docs/PROJECT_PLAN.md) describes the product and long-term direction. The [implementation plan](docs/IMPLEMENTATION_PLAN.md) defines the current prototype scope and takes precedence where it narrows the broader plan. Working guides summarize these documents; unresolved decisions live in the decision log. The [renderer experiment results](docs/RENDERER_EXPERIMENT.md) record what the local reader prototype has proven so far.

Update these files in place as decisions evolve. Git records their history; filenames do not carry release numbers.
