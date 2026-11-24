# Server API

Contract home for Studio ↔ server and reader ↔ server endpoints ([CAHIER_DES_CHARGES.md §5.4](CAHIER_DES_CHARGES.md#54-shared-contracts-agree-first-then-build-in-parallel)). Changes used by another open task are agreed on its issue first.

Served by `cmd/server` (not `cmd/renderer`). Status: **LRN-005 foundation, authentication only.** No endpoint checks roles or permissions yet. The role model is confirmed ([DECISIONS.md](DECISIONS.md#role-model)); permission checks arrive with the permission tables. No educational endpoint exists.

## Conventions

- JSON bodies, UTF-8. Request bodies must use `Content-Type: application/json`.
- Every response carries `Cache-Control: no-store` and `Vary: Cookie`; authenticated responses must never be stored by shared caches.
- Session: cookie `__Host-learnoo_session` (`HttpOnly; Secure; SameSite=Lax; Path=/`, no `Domain`). The value is opaque; clients never read it. Browsers accept `Secure` cookies on `http://localhost` and `http://127.0.0.1` only.
- CSRF, two layers:
  1. Every unsafe method (`POST`, `PUT`, `PATCH`, `DELETE`) from a browser is rejected when `Sec-Fetch-Site` or `Origin` shows a cross-origin request (Go `http.CrossOriginProtection`). This also prevents login CSRF.
  2. Authenticated unsafe requests also need header `X-CSRF-Token` equal to the `csrfToken` returned by login or `GET /api/auth/session`.
- Errors share one shape:

```json
{"error": {"code": "invalid_credentials", "message": "Email or password is incorrect."}}
```

`message` is for display and may change or be translated; clients branch on `code`.

| Status | `code` | When |
| --- | --- | --- |
| 400 | `invalid_request` | Malformed JSON, unknown or wrong-case fields, duplicate fields, data after the JSON object, missing email or password |
| 401 | `invalid_credentials` | Login failed. Identical for unknown email, wrong password and disabled account |
| 401 | `unauthenticated` | No valid session (missing, expired, revoked or forged cookie) |
| 403 | `csrf_rejected` | Missing or wrong `X-CSRF-Token` on an authenticated mutation |
| 403 | `cross_origin_rejected` | Cross-origin unsafe request |
| 404 | `not_found` | Unknown route |
| 415 | `unsupported_media_type` | Request body is not `application/json` |
| 429 | `rate_limited` | Login throttled; see `Retry-After` (seconds) |
| 500 | `internal` | Unexpected server error (details only in server logs, never secrets) |
| 503 | `unavailable` | Health check could not reach the database |

## Session object

Returned by login and `GET /api/auth/session`:

```json
{
  "user": {"id": 1, "email": "student@example.test", "displayName": "Simulated Student"},
  "csrfToken": "opaque-string",
  "expiresAt": "2026-11-25T09:00:00Z"
}
```

`expiresAt` is the current idle expiry; it moves forward with activity but never past the absolute limit.

## Endpoints

### `POST /api/auth/login`

Request: `{"email": "student@example.test", "password": "…"}`. Email is trimmed and compared case-insensitively. The request body is strict: field names must be exactly `email` and `password` (no other spelling, case or Unicode case folding such as `pasſword`), each at most once, and nothing but whitespace may follow the object; otherwise `400 invalid_request`. Rejected requests are not counted as sign-in attempts.

- `200` session object and a new session cookie. Any session cookie sent with the request is revoked first: the token always rotates at login.
- `401 invalid_credentials`, `400`, `415`, `403 cross_origin_rejected`, `429 rate_limited`.

Throttling (sliding 15-minute window, counted before the password is checked, enforced for existing and non-existent accounts alike): more than 5 attempts for one email address, or more than 30 from one client address, return `429` even with the correct password. A successful login clears that email's counter. The client address is the TCP peer; proxy headers are not trusted until deployment defines the proxy chain.

### `POST /api/auth/logout`

Requires a session and `X-CSRF-Token`. Deletes the session server-side and clears the cookie.

- `204` no body.
- `401 unauthenticated`, `403 csrf_rejected`, `403 cross_origin_rejected`.

### `GET /api/auth/session`

- `200` session object for the current cookie (also refreshes the idle expiry).
- `401 unauthenticated`. An invalid cookie is also cleared.

### `GET /healthz`

`200 {"status":"ok"}` when the database answers; `503 unavailable` otherwise. Not authenticated; reveals nothing else.

## Session lifetime

| Limit | Value |
| --- | --- |
| Idle timeout | 24 hours without a request |
| Absolute timeout | 14 days after login |
| Idle extension | At most once per minute per session |

## Not yet defined

Registration, password recovery, email verification, account deletion (LRN-022); roles, permission checks and role administration (LRN-005 permission slice, LRN-013); lesson, review and media endpoints (LRN-006 onward).
