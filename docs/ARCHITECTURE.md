# Architecture

Status: selected direction; renderer and detailed schema pending prototype.

## Components

- Go modular monolith serves public and authenticated HTML, sessions, authorization, and Studio API.
- PostgreSQL stores users, sessions, curriculum identifiers, lesson revisions with embedded exercises, reviews, media references, bookmarks, and audit events.
- React + TypeScript + Vite + TipTap powers Studio; compiled assets are served by Go. Tailwind and shadcn/ui are planned for Studio.
- Restricted structured JSON is authoritative. Canonical rendering produces versioned HTML artifacts for preview and publication.
- Images live in a persistent media volume with immutable identifiers. YouTube delivers video.
- Docker Compose initially runs Go and PostgreSQL behind the existing reverse proxy. A controlled JS renderer process is allowed if the experiment justifies it.

## Renderer experiment

Begin with restricted Go rendering and locally hosted browser-side KaTeX using a representative fixture. Compare TipTap JavaScript rendering only if measured limitations justify it. Check Arabic/French directionality, formulas, safe URLs/HTML, mobile output, preview latency, failures, resource use, and maintenance effort. Do not build two production renderers.

If JS is selected, document how Go invokes it for live preview, publication, and regeneration. Build-time-only rendering is insufficient. Keep source snapshots and immutable media references unchanged when regenerating HTML.

## Boundaries

Server-side authorization is required for every protected route, media endpoint, and API. Public CDN caching is limited to public pages and assets; authenticated responses must bypass shared caches. Use server sessions, secure cookies, CSRF protection, established password libraries, recovery tokens, and abuse controls.

No microservices, Kubernetes, Redis, or external search engine for the initial release. Start with PostgreSQL title search and curriculum filters.

## Planned layout

`cmd/server`, `internal/{auth,users,curriculum,lessons,reviews,rendering,media,search,web}`, `web/{templates,static,studio}`, `migrations`, `deploy`.

Create directories when implementation needs them. Do not build an empty framework of speculative modules.

## Operations

The shared server's capacity is reported, not measured for Learnoo. Check peak load, disk capacity/I/O, memory, and concurrent use. Use resource limits, persistent storage, internal-only database access, off-site database/media backups, restoration tests, monitoring, application rollback, and a migration recovery strategy. Never commit secrets or deployment credentials.

## Current experiment

`cmd/renderer` is a separate loopback-only executable for LRN-004. It embeds restricted lesson fixtures and uses the same `internal/rendering.Render` function for reader and preview. It is not a production server and does not claim authentication or editorial safeguards. See [development instructions](DEVELOPMENT.md) and [experiment results](RENDERER_EXPERIMENT.md).
