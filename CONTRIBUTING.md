# Contributing to Learnoo

The project is preparing its first prototype. Start with [README](README.md), [requirements](docs/REQUIREMENTS.md), and [the backlog](docs/ROADMAP.md).

Planning feedback, issue discussions, and expressions of interest are welcome. Acceptance of external code and educational contributions is deferred until complete [licensing and inbound contribution terms](docs/LICENSING.md) are established. Do not submit third-party teaching material without permission or publish student information.

## Development workflow

Follow the [working protocol](docs/CAHIER_DES_CHARGES.md#5-working-protocol-for-contributors-and-ai-agents): get assigned on the GitHub issue before starting, keep shared contracts in their documented home, and end every pull request with a handoff.

Use focused branches and pull requests. Describe the problem, resulting behavior, relevant acceptance criteria, and validation. The maintainer reviews merges. CODEOWNERS requests review; repository protection settings must separately enforce it.

Tests should cover meaningful risks: authorization, submitted-content immutability, publication races, lesson withdrawal, rendering safety, and recovery. Avoid broad scaffolding or unrelated dependencies. Document runnable setup when the prototype exists.

## Agent skills

Canonical skills are in [.agents/skills/](.agents/skills/). `.claude/skills` is a relative symlink to `../.agents/skills`, so both tools read one maintained copy. Windows contributors may need Developer Mode or other symlink permissions and Git symlink support enabled before checkout; verify this path is a directory link, not a text file. Do not maintain duplicate copies.

Discovery paths were checked against the [Codex skills docs](https://developers.openai.com/codex/skills/) and [Claude Code skills docs](https://code.claude.com/docs/en/skills) on 2026-11-23. Codex documents `.agents/skills`; Claude Code documents `.claude/skills` and symlinked skill folders. On 2026-11-23, the maintainer relayed a Claude Code session report that all three `learnoo-*` skills appeared while using this branch, confirming discovery through the parent-directory symlink in that session (client version not supplied). Filesystem resolution is also verified. Codex reads the canonical directory directly; appearance in its skill selector remains unverified. Check the skills in your client before relying on automatic selection; if missing, read the canonical files explicitly and report the client/version. Discovery does not prove that a skill was invoked or followed correctly.

Optional UI/UX skills and pinned upstream licenses are listed in [recommended skills](.agents/RECOMMENDED_SKILLS.md). The shared skills grant no additional tool permissions or merge authority.

## Educational workflow

Teachers will use Studio, not GitHub. Content must have a curriculum objective, clear explanation, sources/rights information, and a different qualified reviewer. AI-generated material is subject to the same review requirements.

## No AI attribution

You may use AI tools, but commits, pull requests and comments must not credit them: no AI `Co-Authored-By` trailers, no "Generated with" footers, no AI author or committer identity. Keep commit messages to one short, plain line. The `verify` check fails otherwise. Claude Code users get this by default from the project's `.claude/settings.json`; configure other tools to match.

## Collaboration

Be respectful, specific, and constructive. Discuss the work rather than attacking contributors. Do not post secrets, personal student data, or exploit details publicly.

## Branches and pull requests

The code/content contribution workflow below applies once contributor terms are finalized; those submissions are not yet accepted. Planning discussions are welcome now.

Fork this repository and create a feature branch from `develop`. Open a pull request targeting `develop`; explain the change and validation. Do not request direct pushes to `main` or `develop`. The sole code owner is @hadden-me; their approval is required for contributor changes. Release pull requests go from `develop` to `main`.

GitHub does not allow authors to approve their own pull requests. The repository owner, @hadden-me, has a pull-request-only review exception for maintainer-authored changes and release PRs. They must open a PR, inspect the diff and validation, and merge through that PR. Contributor PRs should receive their explicit approving review before merge.

The exception is scoped to the owner account, not all future admins. GitHub cannot limit this exception to owner-authored PRs: the owner could also bypass review on other PRs, so the preceding rule is maintainer policy. All other actors still require the owner's code-owner approval. Separate rules retain mandatory PRs, conversation resolution, and blocks on force pushes/deletion without bypasses. Direct pushes to main/develop remain disallowed.

See [the decision log](docs/DECISIONS.md) for the recorded rationale. This repository exception does not permit self-approval of educational lessons inside Learnoo.
