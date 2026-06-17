# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ThothAI is a content-publishing platform: a central hub for creating, curating, and publishing
technical content (articles, tutorials, notes), with AI-assisted drafting/review and a
public SEO-optimized reading portal. See [docs/](docs/) for the full MVP spec (Portuguese):
`ThothAI_Especificacao_MVP.md` (functional/non-functional requirements) and
`ThothAI_Stack_Convencoes_Monorepo.md` (stack & conventions).

The project is at an early scaffolding stage — most domain code is not yet written.

### Phase 2 (current): multi-tenant platform
The platform is now **multi-tenant**: multiple publishers, each with a public hub at
`/{handle}` (curriculum + posts), isolated by `tenant_id` on every entity (RNF03). The tenant
of a request is resolved by `TenantContextFilter` (identity module): from the authenticated
principal (`AppUserDetails`) for `/api/admin/**`, or from the handle for public
`/api/p/{handle}/**` routes (unknown/inactive handle → 404). New publishers' tenant = their
handle. Roles: `SYSTEM_ADMIN` (manages users at `/api/system/users` and macro integrations
like the platform LinkedIn app at `/api/system/integrations/*`) and `PUBLISHER` (own content
and own AI/Tavily keys — env-var key fallback only applies to the system tenant). Self-signup
(`POST /api/auth/register`) creates PENDING accounts that can't log in until approved.
The site root is a platform landing with the publisher directory (`/api/publishers`).

**Login with LinkedIn / account linking.** Two OAuth flows share the *same* platform LinkedIn
app (so the dev app needs **both** redirect URIs registered, plus the "Sign In with LinkedIn
using OpenID Connect" product for the `email` scope): the per-tenant **sharing** flow
(`/api/admin/social/linkedin/callback`, authenticated, in `social`) and the unauthenticated
**login/linking** flow (`/api/auth/linkedin/callback`, in `identity`, via the public
`social.LinkedInOidcGateway`). Login resolves the account by `users.linkedin_sub` (active → session
established; pending/disabled → message); else by matching email (→ emails a 30-min link-confirm
token before linking); else auto-creates a PENDING publisher from the LinkedIn profile. Linking is
**always** confirmed by an email token (`linkedin_link_tokens`, like password reset); the OAuth
`state` rides in an HttpOnly cookie since there's no session yet.

**Post publishing models.** `posts.mode` is `PLATFORM` (classic: lives on the hub; LinkedIn share =
AI "isca" + link back) or `FLEXIBLE` (hub optional via `status` — DRAFT = LinkedIn-only/off-hub,
PUBLISHED = also on hub; LinkedIn share = full body as plain text, no back-link). AI extras:
per-draft custom prompt, AI image generation with a **dedicated** provider/key in `ai_settings`
(`image_*` columns; OpenAI gpt-image or Gemini Imagen, stored to MinIO via the public
`media.MediaImageStore`), and AI review of a selected excerpt.

LinkedIn publishing uses the current **Posts API** (`POST /rest/posts`, headers `LinkedIn-Version`
— hardcoded `LINKEDIN_API_VERSION` in `social.LinkedInApi`, bump if rejected — and
`X-Restli-Protocol-Version: 2.0.0`); the created id comes back in the `x-restli-id` response
header. The member token needs the "Share on LinkedIn" product (`w_member_social`). Share failures
log the real status+body. The share text caps at LinkedIn's ~3000 chars; FLEXIBLE posts get an AI
"adapt to LinkedIn" (`/api/admin/assistant/linkedin-format`) producing a native, within-limit post.

## Monorepo layout

- [backend/](backend/) — Kotlin + Spring Boot (Spring Modulith) REST API, PostgreSQL, Flyway.
- [frontend/](frontend/) — Angular SSR + TailwindCSS + Angular Material.
- [docs/](docs/) — product spec and stack/convention docs.

Trunk-based development on `main`. Use Conventional Commits with scopes: `feat(api):`, `fix(web):`.
A change spanning both halves should land as one consistent commit.

## Backend (`backend/`)

Maven wrapper, Java 21, Kotlin 2.2. Source roots are `src/main/kotlin` and `src/test/kotlin`
(configured in [backend/pom.xml](backend/pom.xml), not the Maven defaults).

```powershell
cd backend
.\mvnw.cmd spring-boot:run          # run the app
.\mvnw.cmd test                     # run all tests
.\mvnw.cmd test "-Dtest=ClassName#methodName"   # run a single test
.\mvnw.cmd verify                   # full build incl. Spring Modulith + ktlint check
.\mvnw.cmd package                  # build jar
.\mvnw.cmd ktlint:check             # lint Kotlin only
.\mvnw.cmd ktlint:format            # auto-fix lint violations
```

Tests use **Testcontainers** (PostgreSQL) via `@ServiceConnection`
([TestcontainersConfiguration.kt](backend/src/test/kotlin/com/gabrielaraujo/thothai/TestcontainersConfiguration.kt)) —
a Docker daemon must be running for the suite. `ModulithArchitectureTests` (module verification)
is the exception — it is pure static analysis and needs no Docker, so to check architecture without
Docker run `.\mvnw.cmd "-Dtest=ModulithArchitectureTests" test`.

### Build environment on this dev machine (Windows, corporate network)
- **`JAVA_HOME` is misconfigured** in the system env — it points to `...\jdk-22.0.1\bin` but Maven
  needs the JDK **root**. Set `$env:JAVA_HOME = "C:\JAVA JDKS\jdk-22.0.1"` before invoking `mvnw.cmd`.
- A **TLS-intercepting proxy** breaks Maven Central downloads (`PKIX path building failed`). The
  corporate root CA lives in the Windows cert store, so build with
  `$env:MAVEN_OPTS = "-Djavax.net.ssl.trustStoreType=Windows-ROOT"`. Not committed to `.mvn/jvm.config`
  because `Windows-ROOT` would break non-Windows CI.

### Spring Modulith architecture (enforced at build time)
- Organize code by **business domain** (e.g. `content`, `identity`), not by technical layer at the root.
- Internal logic classes must not be exposed across module boundaries. Spring Modulith
  **fails the build** on encapsulation breaks or cyclic dependencies — keep cross-module calls
  going through each module's public API (top-level package).
- Cross-cutting interactions use **Spring Application Events**, not direct service calls.
- Lint with **ktlint** (gantsign maven plugin); the `check` goal is bound to the `verify` phase.
  ktlint enforces 4-space indentation (no tabs) — note Spring's generated scaffolding uses tabs,
  so run `ktlint:format` on newly generated files.

The Kotlin compiler runs with `all-open`/`no-arg` plugins for JPA `@Entity`/`@Embeddable`/
`@MappedSuperclass` and `-Xjsr305=strict` (JSR-305 nullability is strictly enforced).

### Database
- Schema changes go through **Flyway** migrations — never edit the schema manually.
- Table names: `snake_case`, **plural**.

## Frontend (`frontend/`)

Angular 21 with SSR (Express server), npm, Vitest, TailwindCSS v4, Angular Material.

```powershell
cd frontend
npm install
npm start                      # ng serve -> http://localhost:4200
npm run build                  # production build into dist/
npm test                       # Vitest via ng test
npm run serve:ssr:frontend     # run the built SSR server (dist/frontend/server/server.mjs)
```

Detailed Angular coding rules live in [frontend/.claude/CLAUDE.md](frontend/.claude/CLAUDE.md)
(signals-based state, standalone components, `inject()`, native control flow, etc.) and apply
to all frontend work.

### Rendering & SEO
- Public routes must use SSR or prerendering; admin routes may be CSR (per the spec).
- Pages must render OpenGraph / Twitter Card meta tags dynamically for rich link previews (RNF05).
- Public UI is **Mobile First** (RNF04). Tailwind for layout; Angular Material for complex interactions.
- The backend serves `/feed.xml` (RSS), `/sitemap.xml` and `/robots.txt` (routed by the gateway);
  their absolute URLs are built from `PUBLIC_ORIGIN`.

### Theming (light/dark)
- Dark mode is **class-based**: the `dark` class on `<html>` drives both the Tailwind `dark:`
  variant (`@custom-variant` in [styles.css](frontend/src/styles.css)) and `color-scheme: dark`
  (which switches Angular Material's M3 system colors).
- `ThemeService` ([core/theme](frontend/src/app/core/theme/theme.service.ts)) persists the choice
  in localStorage; an inline script in [index.html](frontend/src/index.html) applies it pre-paint
  (anti-FOUC). New UI must include `dark:` variants for any hardcoded gray/color utilities.

## External infrastructure

Media is stored in **MinIO** (S3-compatible), not the database (RNF01). Synchronous calls to
external search/LLM APIs must have timeouts and exception handling so a third-party failure does
not take down the admin panel (RNF02). The system is packaged via Docker / Docker Compose.

The AI engine is **multi-provider and user-configurable** in the admin panel (`ai_settings`
table, endpoints under `/api/admin/assistant/settings`): Anthropic (own SDK) plus OpenAI,
Gemini, Qwen and any OpenAI-compatible API, all served by one generic `/chat/completions`
HTTP client (`OpenAiCompatibleChatClient`) routed per call by `RoutingLlmClient`. Panel
settings take precedence over the `ANTHROPIC_API_KEY` / `TAVILY_API_KEY` env vars (fallback,
Anthropic/Tavily only). Keys never leave the API in full — only a 4-char hint — and switching
provider resets key/model/baseUrl. Changes apply without a restart.

**Author memory (RAG)** teaches the AI each publisher's voice: a **dedicated** embeddings config in
`ai_settings` (`embedding_*`; OpenAI/Gemini/OpenAI-compatible `/embeddings`) indexes their posts
into `post_embeddings` (vector as JSON text). Indexing is **on-demand and incremental** (only
new/changed posts, hashed) inside `AuthorMemoryService`, which reads post text via
`ContentQueries.authorPostTexts()` (assistant→content, acyclic) — no events/async/pgvector. At each
draft/snippet/LinkedIn-format the top-K most similar excerpts (cosine in-app, `cosineSimilarity` in
`VectorMath.kt`) are injected as a style reference. Degrades to off when embeddings aren't
configured; panel shows indexed/total + a reindex button (`/api/admin/assistant/memory`).
Every draft/image generation is logged to `prompt_history` (favoritable, filterable at
`/api/admin/assistant/prompts`).

## Running the full stack (Docker)

Two standalone compose files bring up everything (`postgres`, `minio` + bucket init, `backend`,
`frontend` SSR, nginx `gateway`). The gateway is the **single browser origin**
([infra/nginx.conf](infra/nginx.conf)): it serves the Angular SSR app at `/` and proxies `/api`,
`/swagger-ui`, `/actuator` to the backend — so the session cookie is same-origin (no CORS/CSRF pain).

- **Dev** — [docker-compose.dev.yml](docker-compose.dev.yml): defaults baked in, runs with no `.env`;
  Postgres and the MinIO console ports are exposed for local inspection.
- **Prod** — [docker-compose.prod.yml](docker-compose.prod.yml): reads everything from `.env`,
  fails fast (`${VAR:?...}`) on missing secrets; Postgres is internal-only and the MinIO console is
  not published. Template: [.env.prod.example](.env.prod.example).

```powershell
# Dev (zero config):
docker compose -f docker-compose.dev.yml up -d --build

# Prod:
copy .env.prod.example .env     # fill in all values
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

For a Linux VPS behind Nginx Proxy Manager, [deploy/vps-deploy.sh](deploy/vps-deploy.sh) automates
the prod deploy: it generates the `.env` interactively (strong secrets), builds/starts the stack,
waits for health, and prints the NPM proxy-host setup. `update` re-pulls and redeploys.
The gateway preserves an edge proxy's `X-Forwarded-Proto` (see the `map` in nginx.conf).

- App: `http://localhost:8088` (host port is `PUBLIC_PORT`, default **8088** — port 80 is reserved
  by Windows http.sys). Admin login at `/admin/login` (seeded `ADMIN_USERNAME`/`ADMIN_PASSWORD`).
- MinIO console: `http://localhost:9001`. Swagger: `http://localhost:8088/swagger-ui.html`.
- The browser only ever talks to the gateway; the SSR server reaches the backend internally via
  `BACKEND_ORIGIN=http://backend:8080`. Media `public-url` is `http://localhost:9000` (browser-reachable).
- The frontend image uses `npm install` (not `npm ci`) because the Windows-generated `package-lock.json`
  omits some platform-specific optional deps (`@emnapi/*`).
