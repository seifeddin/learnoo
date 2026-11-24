---
name: learnoo-security
description: Implement or review authentication, authorization, sessions, caching, lesson rendering, uploads, or student-data handling. Use for a requested security review; not for unrelated copy or cosmetic changes.
---

# Security boundaries

Use [architecture](../../../docs/ARCHITECTURE.md), [requirements](../../../docs/REQUIREMENTS.md), and relevant security/upload sections of the [project plan](../../../docs/PROJECT_PLAN.md). Preserve [editorial permissions](../../../docs/CONTENT_AND_EDITORIAL.md); do not settle [open policies](../../../docs/DECISIONS.md) through implementation defaults.

Check the boundaries affected by the change:

- **Authorization:** enforce permission and object/subject scope on every protected page, media endpoint and API. Test anonymous, wrong-role and wrong-owner/subject requests, not only hidden UI controls.
- **Sessions and CSRF:** use server-managed sessions, established password libraries, HttpOnly cookies, Secure cookies over HTTPS, appropriate SameSite behavior and CSRF protection for cookie-authenticated mutations. Verify rotation, invalidation/logout, expired recovery tokens and cross-origin rejection where affected.
- **Abuse controls:** rate-limit authentication/recovery endpoints; test limits and recovery from throttling. Do not invent the email-verification-before-reading policy.
- **Shared caches:** authenticated responses must bypass Cloudflare and other shared caches. Check both response headers and deployment rules; verify one user's response cannot be served to another. A header-only test is not proof of live CDN configuration.
- **Rendering:** accept only the restricted schema and allowlisted URLs/media; reject raw HTML and unsafe schemes. Keep reader/preview rendering consistent. Test malicious text, invalid nesting, malformed math and failure fallbacks; keep KaTeX trust disabled.
- **Uploads:** validate permitted file types using actual content, size/dimension limits and safe storage identifiers. Prevent traversal/executable serving and in-place media replacement; test unauthorized access and invalid files.
- **Secrets/privacy:** keep credentials and tokens out of source, fixtures and logs. Collect minimal student personal data; no required public student profile. Retention/deletion decisions remain with their recorded owners.

The [local renderer](../../../docs/DEVELOPMENT.md) intentionally has no accounts and must remain loopback-only. Do not present its checks as production security, add fake auth to pass a review, or expose it publicly. Report concrete risks and missing verification; follow [SECURITY.md](../../../SECURITY.md) for disclosure.
