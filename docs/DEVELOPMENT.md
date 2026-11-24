# Development

Two programs live in this repository and stay separate:

- `cmd/server`: the application server (LRN-005 foundation): PostgreSQL, migrations, accounts, sessions and login. Authentication only; no roles, permissions or lessons yet.
- `cmd/renderer`: the loopback-only renderer experiment (LRN-004), below. It has no accounts or database and does not share code paths with the server.

## Application server

### Versions

| Component | Version |
| --- | --- |
| Go | 1.25 or newer (`go.mod` declares 1.25.0; tested with 1.25.4) |
| PostgreSQL | 16 (Compose and CI use `postgres:16.13`; tested locally with Homebrew 16.13) |
| `github.com/jackc/pgx/v5` | v5.12.0 (driver and pool) |
| `golang.org/x/crypto` | v0.55.0 (Argon2id) |

Migrations use a small built-in runner (`internal/database`), not an external tool. See [DECISIONS.md](DECISIONS.md#application-server-foundation-lrn-005).

### Environment variables

No secrets have defaults or belong in the repository. Put local values in your shell or an ignored `.env` file.

| Variable | Used by | Meaning |
| --- | --- | --- |
| `LEARNOO_DATABASE_URL` | `serve`, `migrate`, `create-user` | PostgreSQL URL, e.g. `postgres://learnoo@127.0.0.1:5432/learnoo?sslmode=disable` |
| `LEARNOO_ADDR` | `serve` | Listen address. Default `127.0.0.1:8090`. Only loopback addresses are accepted until deployment work defines TLS and the proxy chain |
| `LEARNOO_TEST_DATABASE_URL` | `go test` | Disposable database for database-backed tests. Unset: those tests are skipped |
| `LEARNOO_REQUIRE_DB_TESTS` | `go test` | `1` makes database-backed tests fail instead of skip when the URL is missing (CI sets it) |

### Local PostgreSQL

Option A, Docker Compose (loopback-only, trust authentication, no stored password):

```sh
docker compose up -d postgres
export LEARNOO_DATABASE_URL='postgres://learnoo@127.0.0.1:5432/learnoo?sslmode=disable'
export LEARNOO_TEST_DATABASE_URL='postgres://learnoo@127.0.0.1:5432/learnoo_test?sslmode=disable'
```

`scripts/dev-db-init.sql` creates `learnoo_test` when the volume is first created. `docker compose down -v` deletes all local data.

Option B, an existing local PostgreSQL 16 (for example Homebrew `postgresql@16`): create a `learnoo` role and the `learnoo` and `learnoo_test` databases owned by it, then export the same variables with your own connection details. Tests need permission to create schemas in the test database.

### Migrate, create an account, start

```sh
go run ./cmd/server migrate           # apply pending migrations; safe to repeat
go run ./cmd/server migrate -check    # exit non-zero if anything is pending or was edited
read -rs PW && printf '%s\n' "$PW" | go run ./cmd/server create-user -email you@example.test -name 'Your Name'; unset PW
go run ./cmd/server serve             # http://127.0.0.1:8090
```

`serve` refuses to start while migrations are pending or the applied history differs from the files. `create-user` reads the password (12 to 1024 characters) from stdin so it never appears in shell history or process lists; it creates an account without roles and is not public registration. Role grants arrive with LRN-013.

Try it (curl stores `Secure` cookies for `127.0.0.1`; browsers do the same for loopback):

```sh
curl -s -c jar -H 'Content-Type: application/json' \
  -d '{"email":"you@example.test","password":"…"}' http://127.0.0.1:8090/api/auth/login
curl -s -b jar http://127.0.0.1:8090/api/auth/session
```

Endpoints, errors, CSRF and throttling are specified in [API.md](API.md).

### Migrations

Files live in `migrations/` as `NNNN_description.sql` and are embedded in the binary. Each runs in its own transaction under a PostgreSQL advisory lock; `schema_migrations` records a SHA-256 checksum of each file. The runner refuses a database whose history contains an unknown version, an edited file or an out-of-order gap. Never edit a merged migration: add the next number. Only one open PR adds migrations at a time ([§5.4](CAHIER_DES_CHARGES.md#54-shared-contracts-agree-first-then-build-in-parallel)).

### Tests

```sh
go test ./...
go vet ./...
```

With `LEARNOO_TEST_DATABASE_URL` set, each database-backed test creates an isolated schema, migrates it and drops it afterwards, so tests may run in parallel and leave nothing behind. They cover migration repeatability and tamper detection, cookie attributes, enumeration-safe errors, anonymous access, idle and absolute expiry, rotation on login, logout revocation, CSRF rejection, strict login JSON (exact, unique keys), per-account and per-address throttling and concurrent attempts. They use simulated users only.

### Pending

Permission and role tables, default grants and permission checks are not implemented yet; the role model is confirmed in [DECISIONS.md](DECISIONS.md#role-model). Registration, recovery, verification, deletion (LRN-022), deployment, TLS termination and trusted-proxy client addresses are not implemented.

## Local renderer experiment

This is the LRN-004 renderer experiment, not the production application. It deliberately has no accounts, database, teacher workflow or publishing. It binds only to 127.0.0.1 and accepts only fixtures marked `unreviewed`. Do not expose it through a public reverse proxy or tunnel.

### Prerequisites

- Go 1.25 or newer (tested with 1.25.4).
- Node.js 22 and npm (tested with Node 22.20.0).

### Run

From the repository root:

```sh
npm ci --ignore-scripts
npm run assets
go run ./cmd/renderer
```

Open http://127.0.0.1:8080/lesson. Change the local port with `go run ./cmd/renderer -port 8081`.

- `/`: landing-page UI example; local only, no registration or publication.
- `/lesson`: unreviewed French complex-numbers fixture.
- `/bidi`: isolated Arabic/French directionality fixture.
- `/failure`: intentionally invalid formula with readable fallback.
- `/lab`: edit raw JSON, preview with the same Go renderer, save/reopen on the current browser only.
- `POST /preview`: validates JSON and returns the canonical HTML used by the reader.

Browser-side KaTeX is copied from the pinned npm package and served locally with its license. No CDN requests are needed. YouTube loads only on a click when an actual video ID is present; the initial lesson has a pending-selection placeholder. The original logo banner is not loaded on every lesson page.

The JSON laboratory is not TipTap. No server-side draft storage or approval behavior is simulated. See [fixture details](fixtures/README.md).

### Design foundations

The reader consumes generated design tokens. Edit `web/design/tokens.json`, run `npm run design:build`, and rebuild the Go server. See [shared design exports](../web/design/README.md) for plain CSS and future Tailwind v4 Studio integration.

## Studio editor prototype (LRN-003)

`web/studio` is a local React/TypeScript/TipTap prototype with its own `package.json` and lockfile. It edits the restricted lesson JSON through a validated adapter; it has no accounts, server storage or publication. Saves stay in the current browser (`localStorage`) or a downloaded file. Verified versions: React 19.3.1, TipTap 3.35.0, Vite 8.3.8, TypeScript 6.0.3, Vitest 5.1.1, jsdom 29.1.1, on Node 22.20.0.

Start the renderer in one terminal, then the Studio in another:

```sh
go run ./cmd/renderer
cd web/studio
npm ci --ignore-scripts
npm run dev
```

Open http://127.0.0.1:5173. Vite binds to loopback and proxies `/preview` and `/static` to the renderer (`LEARNOO_RENDERER_URL`, default `http://127.0.0.1:8080`; `LEARNOO_STUDIO_PORT` changes 5173). The preview pane shows the renderer's canonical HTML; the Studio has no second renderer.

Checks, from `web/studio`:

```sh
npm run typecheck
npm test
npm run build
```

`npm test` covers fixture round trips, save/reopen, paste filtering, invalid input and the Go-parity cases in `test/contract/cases.json`, which `go test ./internal/rendering` also runs. The editor typesets formulas with the reader's KaTeX version and options; `test/math.test.ts` fails if they drift from `internal/rendering/static/math.js` or the root `package.json` pin. `test/golden/studio-features.json` is an editor-authored export that Go validates and renders; regenerate it deliberately with `UPDATE_GOLDEN=1 npm test`. The root `npm run test:browser` also builds the Studio and serves it on `LEARNOO_STUDIO_TEST_PORT` (default 18180), so install its dependencies first.

Keyboard: `Ctrl/Cmd+B` bold, `Ctrl/Cmd+Alt+2` section heading, `$…$` inline formula, `$$ ` on an empty line for a display formula, `- ` for a list. Toolbar buttons are reachable with Tab; selected formulas, media, containers and paragraph language/direction are edited in the "Propriétés de la sélection" panel.

## Combined verification

```sh
npm run design:check
npm run design:contrast
go test ./...
go vet ./...
npx playwright install chromium
npm run test:browser
go test ./internal/rendering -run '^$' -bench BenchmarkRenderLesson -benchmem
```

Playwright always starts its own loopback server on port 18080 and refuses to reuse an existing process, in development and CI alike. Set `LEARNOO_TEST_PORT=18081` to select another port. Tests derive URLs and request-origin checks from this configuration; the interactive preview on 8080 is independent. Results and screenshots are written to ignored `test-results/`. Run `npm run assets` before compiling: Go embeds the prepared local browser assets into the binary.

For a restricted environment, put the Go build cache in a writable temporary directory by prefixing commands with `GOCACHE=/tmp/learnoo-go-cache`.

### Continuous integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs the commands above on every pull request to `develop` or `main` (including fork PRs) and on pushes to those branches. GitHub reports the check as **`verify`** under the **CI** workflow; select that check from the list when configuring branch protection rather than typing a name. It runs on Ubuntu 24.04 with Go 1.25.x and Node 22, in this order: `npm ci --ignore-scripts`, `npm run design:check`, `npm run assets`, `npm run design:contrast`, then in `web/studio` `npm ci --ignore-scripts`, `npm run typecheck`, `npm test`, `npm run build`, then `go test ./...`, `go vet ./...`, `npx playwright install --with-deps chromium`, `npm run test:browser`. Any failing step fails the job; no step is allowed to fail. A `postgres:16.13` service container (loopback port, trust authentication, no secret) backs the database tests; the job sets `LEARNOO_TEST_DATABASE_URL` and `LEARNOO_REQUIRE_DB_TESTS=1`, so those tests fail rather than skip if the database is unreachable.

Security: the workflow uses the `pull_request` trigger (never `pull_request_target`), a read-only `contents: read` token, no repository secrets, and checkout without persisted credentials. Third-party actions are pinned to commit SHAs. If a step fails, the `test-results/` folder (local fixture screenshots and metrics only) is uploaded as the `playwright-test-results` artifact for 7 days.

`design:check` runs before `assets` on purpose: `assets` regenerates the design files, so checking afterwards would hide generated CSS that was not committed. Making `verify` a required status check in branch protection is a maintainer setting and is not changed by the workflow.

### Security limits

Schema allowlists, escaped templates, local image allowlists, content/depth/formula limits, CSP, same-origin preview checks, and KaTeX `trust: false` reduce rendering risks. They do not establish production security. The only HTTP mutation is a read-only rendering request; browser saves are local fixtures. Authentication, durable storage, role checks, review and publication invariants belong to later work and remain required for the real platform.

### Dependency licensing

KaTeX, React, TipTap, Vite and Vitest are MIT-licensed; Playwright and TypeScript are Apache-2.0-licensed; their own terms apply. The project's interim notice does not override dependencies. `scripts/copy-katex.mjs` preserves the KaTeX license in the generated vendor directory.
