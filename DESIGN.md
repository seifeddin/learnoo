# Design direction

Status: product guidance; visual identity and wireframes are pending.

Prioritize readable learning content, clear navigation, and low-bandwidth mobile use. Support Arabic RTL, French LTR, mixed text, accessible contrast, visible keyboard focus, labeled controls, and readable equations. A lesson should remain useful without playing a video.

## First screens

1. Mobile lesson reader: chapter context, title, objectives, explanation, worked example, exercise/solution, attribution, bookmark, report mistake.
2. Studio editor: curriculum metadata, restricted editor, save state, canonical preview, submit.
3. Review screen: submitted snapshot, author, feedback, request changes/approve; publish only with permission.
4. Registration and dashboard: minimal account form, section navigation, bookmarks.

Use the same typography and content styles in canonical preview and the student reader. The supplied repository logo is `assets/brand/learnoo-logo.png`; preserve it as the original brand asset. UI tokens and any decorative animation remain unapproved. Create low-fidelity wireframes before detailed visual implementation.

Read [MOTION.md](MOTION.md), requirements, architecture, and actual dependencies before motion/3D work. Skills guide implementation; they do not choose the experience.

## Brand delivery

The original 900×900 logo is appropriate for the repository README. Preserve it. When the student website is implemented, create optimized responsive derivatives, set explicit display dimensions and measure transferred bytes on mobile; do not ship the full original by default. Asset optimization is part of the first reader's performance checks, not a reason to alter the source image now.
