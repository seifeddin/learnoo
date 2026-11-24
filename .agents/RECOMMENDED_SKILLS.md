# Optional external skills

These are optional local tools, not repository dependencies or instructions to install automatically. No third-party skill content is vendored here. Review the pinned source before using it; project intent, DESIGN.md, MOTION.md and the existing architecture take precedence. Availability never justifies a new dependency or effect.

| Source | Allowed purpose | Pinned commit | License at that commit |
| --- | --- | --- | --- |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | UI/UX and accessibility work within the assigned design task | [`b49177d32788f2dc585c42831d845dacf1ebed2c`](https://github.com/pbakaus/impeccable/tree/b49177d32788f2dc585c42831d845dacf1ebed2c) | [Apache-2.0](https://github.com/pbakaus/impeccable/blob/b49177d32788f2dc585c42831d845dacf1ebed2c/LICENSE) |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | Optional `emil-design-eng` guidance for small UI polish only | [`64eb3deb9a5fbfa041faf783e0bc3fd635872e9c`](https://github.com/emilkowalski/skills/tree/64eb3deb9a5fbfa041faf783e0bc3fd635872e9c) | [MIT](https://github.com/emilkowalski/skills/blob/64eb3deb9a5fbfa041faf783e0bc3fd635872e9c/LICENSE) |
| [prototype](https://github.com/emilkowalski/skills/blob/64eb3deb9a5fbfa041faf783e0bc3fd635872e9c/skills/prototype/SKILL.md) | Explicitly requested UI variants for LRN-002; stay within the assigned wireframe scope and motion policy | Same Emil commit above | MIT, same license above |
| [pick-ui-library](https://github.com/emilkowalski/skills/blob/64eb3deb9a5fbfa041faf783e0bc3fd635872e9c/skills/pick-ui-library/SKILL.md) | Explicitly requested Studio library evaluation; respect existing choices and avoid dependency churn | Same Emil commit above | MIT, same license above |

Repository licenses and commit contents were checked on 2026-11-23. Pins identify the reviewed source revision, not certification of every instruction. If installing locally, select only the relevant skill from that revision and retain its upstream terms; do not copy it into this repository.

Animation, 3D and video skills (`gsap-*`, `threejs-*`, `hyperframes`, etc.) are outside this repository skills package. [MOTION.md](../MOTION.md) excludes decorative motion/3D from the MVP; educational video production is a separate task, not permission to add video tooling to the web application.

See [DESIGN.md](../DESIGN.md) for mobile, RTL/LTR, contrast, keyboard and bandwidth requirements, and [AGENTS.md](../AGENTS.md) for project skills.

## Invocation boundaries

At the pinned Emil revision, `prototype` and `pick-ui-library` declare `disable-model-invocation: true` for Claude Code. Invoke them explicitly with a concrete task. Other hosts may interpret metadata differently; preserve explicit-only use through that host's supported configuration rather than assuming the Claude field is enforced everywhere. Prototype creates live variants, not an entire wireframe specification automatically. Its motion guidance remains subordinate to MOTION.md. Library advice does not authorize replacing the selected Studio stack.

## Optional Claude Code security plugin

[security-guidance](https://github.com/anthropics/claude-plugins-official/tree/73c8cf3ea7e296057b467990f2f5d61b4c922260/plugins/security-guidance) is an optional hook-based plugin, not a shared skill. Inspected commit: `73c8cf3ea7e296057b467990f2f5d61b4c922260`; plugin license: [Apache-2.0](https://github.com/anthropics/claude-plugins-official/blob/73c8cf3ea7e296057b467990f2f5d61b4c922260/plugins/security-guidance/LICENSE).

Its [README](https://github.com/anthropics/claude-plugins-official/blob/73c8cf3ea7e296057b467990f2f5d61b4c922260/plugins/security-guidance/README.md) documents edit-time pattern warnings, end-of-turn diff review and commit-time agentic review. It requires Claude Code 2.1.144+ and Python 3.8+; model reviews need supported credentials/provider configuration and can be disabled or skipped. Current defaults use the newest available Opus, so budget for extra model usage and latency. Reviews send code/diffs to the configured model service; inspect current data-handling and setup details before opting in.

Contributors may install it personally through the official marketplace. No installation, credentials, hooks or plugin settings are added by this recommendation. Marketplace installs can differ from this inspected revision. Codex does not automatically gain these Claude hooks. The existing Go renderer already provides code to review; this plugin still cannot replace permission tests, human review or the Learnoo security skill.

## Not recommended by default

[frontend-design](https://github.com/anthropics/claude-plugins-official/blob/73c8cf3ea7e296057b467990f2f5d61b4c922260/plugins/frontend-design/skills/frontend-design/SKILL.md) is not recommended for Learnoo's default setup: it adds overlapping aesthetic direction alongside project guidance and optional Impeccable. The inspected version does respect the brief and calls for restrained, purposeful motion; it is not inherently incompatible or a mandate for heavy animation. Our reason is to avoid competing design instructions, while retaining the project's selected styling, readability and low-bandwidth requirements.
