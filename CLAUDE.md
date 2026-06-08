# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ThothAI is a content-publishing platform: a central hub for creating, curating, and publishing
technical content (articles, tutorials, notes), with AI-assisted drafting/review and a
public SEO-optimized reading portal. See [docs/](docs/) for the full MVP spec (Portuguese):
`ThothAI_Especificacao_MVP.md` (functional/non-functional requirements) and
`ThothAI_Stack_Convencoes_Monorepo.md` (stack & conventions).

The project is at an early scaffolding stage — most domain code is not yet written.

### Phasing constraint (affects schema/query design)
The MVP is **single-publisher** but must transition to **multi-tenant** without structural
refactoring. Therefore every persisted entity must carry a tenant isolation key, and queries
must apply authorship filters — even though only one admin user exists in the MVP (RNF03).

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
a Docker daemon must be running for the test suite.

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

## External infrastructure

Media is stored in **MinIO** (S3-compatible), not the database (RNF01). Synchronous calls to
external search/LLM APIs must have timeouts and exception handling so a third-party failure does
not take down the admin panel (RNF02). The system is packaged via Docker / Docker Compose.
