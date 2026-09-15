# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Offly — self-hosted time off / absence manager. Go backend (gRPC + gRPC-Gateway REST) serving a React SPA from a single binary/Docker image.

## Commands

Everything goes through [Task](https://taskfile.dev) (`Taskfile.yml`), not make.

```bash
task setup            # install deps (Go, buf, golangci-lint, npm) + generate protobuf + format
task dev              # starts MongoDB container, then backend (:8080/:50051) + frontend (:3000) in parallel
task build            # go build -o bin/server + vite build
task test             # Go tests only (there is no frontend test suite)
task lint             # golangci-lint + eslint
task format           # go fmt/gofmt -s + prettier
task proto            # buf mod update && buf generate — run after ANY .proto edit
task proto:lint       # buf lint (STANDARD ruleset)
task proto:breaking   # buf breaking against main
task pre-commit       # format + lint + test
task seed             # k6 run k6-seed-data.js (sample data)
task mongo:start / mongo:stop / mongo:logs
```

Single Go test:

```bash
cd backend && go test -run TestIsAdmin ./internal/auth/...
cd backend && go test -v ./internal/storage/...
```

`task dev:backend` / `task dev:frontend` load `../.env` via dotenv — put `AUTH_*`, `STORAGE_TYPE`, etc. there for local runs.

## Architecture

### The proto file is the source of truth for the API

`backend/proto/absence/v1/absence.proto` defines four services — `AbsenceService`, `UserService`, `OrganizationService` (departments + teams), `HolidayService` — each RPC annotated with `google.api.http` bindings under `/api/v1/...`. `buf generate` (config in `backend/buf.gen.yaml`) emits, all into `backend/proto/absence/v1/`:

- `*.pb.go` (messages), `*_grpc.pb.go` (service stubs)
- `*.pb.gw.go` (the REST gateway) — this is what turns an RPC into an HTTP route
- `absence.swagger.json` — served at `/openapi/` and rendered by the Swagger UI at `/docs`

Adding or changing an endpoint means: edit the `.proto`, `task proto`, then implement the method in `backend/internal/service/`. Generated files are committed; `proto/` is excluded from golangci-lint.

### Request path

The backend runs the gRPC server on `127.0.0.1:50051` (loopback only) in a goroutine, then the gateway dials it over plain HTTP/2 and mounts the generated mux under `/api/`. So every REST call is a real gRPC call to the same process. `main.go` also mounts `/api/v1/health`, `/api/v1/auth/*`, `/docs`, `/openapi/`, and an SPA fallback handler serving `./web/dist` (path-traversal-checked, falls back to `index.html`).

### Storage

`storage.Storage` (`backend/internal/storage/storage.go`) is one flat interface over all five entities. Three implementations, selected by `STORAGE_TYPE`:

- `sqlite` (default) — `sqlite.go`, schema created in `initSchema()`, **requires CGO** (`mattn/go-sqlite3`; Dockerfile builds with `CGO_ENABLED=1` and alpine `gcc musl-dev sqlite-dev`)
- `mongodb` / `hybrid` — both map to `NewHybridStorage`: `memory.go` is the live store, MongoDB is written through and reconnected to every 30s if unavailable. The app stays up with an in-memory store when Mongo is down.

Storage structs are plain Go (no proto tags); the service layer maps between `storage.User` and `pb.User` field by field.

### Auth / RBAC

Off by default. `AUTH_ENABLED=true` turns on OIDC (Dex in dev, see `dex/` and `SSO-README.md`): tokens arrive as a `Bearer` header or an `auth_token` cookie, are verified against JWKS (`internal/auth/oidc.go`), and `AuthMiddleware` injects email/groups/id into the request context.

`rbacMiddleware` in `backend/cmd/server/main.go` wraps the whole `/api/` mux and enforces, by URL path and HTTP method:

- GET is always allowed, even unauthenticated
- writes require auth; admins (`AUTH_ADMIN_EMAILS`, or group `AUTH_ADMIN_GROUP`) bypass everything
- non-admins may only PUT/POST their own `/users/{id}` and only create/modify absences whose `userId` is theirs (POST bodies are read and re-wrapped to check this)
- `/teams`, `/departments`, `/holidays` writes are admin-only

This authorization logic lives in the HTTP layer, not in the services — the gRPC services themselves are unauthenticated.

### MCP server

`internal/mcp` exposes read-only tools over the MCP streamable HTTP transport, mounted at `/mcp`
on the same mux as `/api/` when `MCP_ENABLED=true` (off by default). It uses the official
`github.com/modelcontextprotocol/go-sdk` — `mcpsdk.AddTool` infers the JSON schema from the
handler's Go input/output types, so there is no schema to hand-write; the `jsonschema:"..."`
struct tags become the property descriptions.

The handlers talk to `storage.Storage` directly, which means they **bypass `rbacMiddleware`
entirely**. That is why every tool is read-only — adding a write tool without first extracting the
ownership rules out of `cmd/server/main.go` would let any caller mutate anyone's absences. The
endpoint is also unauthenticated by design (see the README warning).

### Frontend

`frontend/src/App.tsx` is a single-page tab switcher (`absences | presences | users | teams | holidays`) holding users/teams/today's-absences state and passing `loadData` down as `onUpdate`. No router, no state library.

`api.ts` and `api/holidays.ts` are hand-written axios clients against `/api/v1` with `withCredentials: true`; `types.ts` is hand-maintained and **not** generated from the proto. The gateway emits camelCase JSON but some paths return snake_case, so `api.ts` normalizes (`u.teamId ?? u.team_id`) — keep that pattern when adding fields.

Vite dev server proxies `/api` to `localhost:8080`. UI is Tailwind + a small shadcn-style `components/ui/` set; dark mode via `hooks/useDarkMode.ts`.

## Conventions

- Conventional Commits are enforced in CI (`.github/workflows/conventional-commit.yml`) and drive Release Please, which also bumps `helm/offly/Chart.yaml` version + appVersion.
- Comments and task descriptions are a mix of French and English — match the surrounding file.
- The Dockerfile is a three-stage build; the final image expects the SPA at `./web/dist` and the swagger JSON at `./proto/`, relative to the working dir.
