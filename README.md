# Smart Internal Operations System

A backend for a fast-growing startup that needs to manage work across teams, hold people accountable, and see what is actually happening in its workflows. It implements task management with role-based access control, an immutable activity log, an enforced status workflow, collaboration via comments, and role-scoped dashboards.

Built with Node.js, Express, and DynamoDB (no TypeScript, no Docker required).

The reasoning behind each decision is in [docs/ENGINEERING_DECISIONS.md](docs/ENGINEERING_DECISIONS.md): architecture, trade-offs, and the scaling plan.

## Features

| Area | What it does |
|------|--------------|
| Auth | Signup / login with JWT access + refresh tokens; refresh-token rotation and server-side revocation |
| RBAC | 3 roles (ADMIN / MANAGER / USER) via a permission catalogue; routes require permissions, not roles |
| Tasks | Create, update, assign, delete, and track via an enforced status workflow; search, filter, pagination |
| Workflow | TODO -> IN_PROGRESS -> IN_REVIEW -> DONE (plus BLOCKED); illegal transitions rejected (422) |
| Comments | Threaded collaboration on each task |
| Activity log | Immutable audit trail (who did what, when); status changes and comments written atomically with the action |
| Dashboard | One endpoint, role-scoped payload: admin (global), manager (team + per-member workload), user (personal) |
| Bottleneck Detector (invented) | Diagnoses where work gets stuck: measures time-in-status per stage and names the throughput constraint, plus lists stuck tasks |

## Architecture at a glance

```
HTTP -> route -> validate(Zod) -> authenticate(JWT) -> requirePermission(RBAC) -> controller -> service -> repository -> DynamoDB
```

- Layered and modular: every feature is a self-contained module (routes / controller / service / schema).
- The repository layer is the only place raw DynamoDB commands live, so business logic stays storage-agnostic.
- Single error funnel: every error returns the same envelope, and unexpected errors are logged without leaking internals.

```
src/
  config/        env validation, dynamo client, table+index names, rbac, constants
  lib/           ApiError, ApiResponse, asyncHandler, jwt, password, pagination
  middleware/    validate, authenticate, requirePermission, errorHandler
  repositories/  users, teams, tasks, comments, activity, refreshTokens
  modules/       auth, users, teams, tasks, comments, activity, dashboard
  services/      activity.service (shared, includes transactional writes)
  docs/          openapi.js
scripts/         dynamodb-local, createTables, seed
```

## Getting started

### Prerequisites
- Node.js 18 or newer
- Java 8 or newer (only to run DynamoDB Local; the AWS jar downloads automatically on first start)

### 1. Install
```bash
npm install
cp .env.example .env
```

### 2. Start DynamoDB Local (no Docker)
```bash
npm run db:start
```
Leave this running in its own terminal.

### 3. Create tables and seed demo data (in a second terminal)
```bash
npm run create-tables
npm run seed
```

### 4. Run the API
```bash
npm run dev
```

- Swagger UI: http://localhost:4000/docs
- OpenAPI JSON: http://localhost:4000/openapi.json
- Postman: import [postman_collection.json](postman_collection.json), run Auth > Login first; it auto-saves the token.

### Seeded login credentials

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@smartops.dev | Admin@123 |
| MANAGER | manager@smartops.dev | Manager@123 |
| USER | user1@smartops.dev | User@123 |
| USER | user2@smartops.dev | User@123 |

## Quick API tour

```bash
BASE=http://localhost:4000/api

# 1. Login (grab .data.accessToken)
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"manager@smartops.dev","password":"Manager@123"}'

TOKEN=...   # paste the accessToken

# 2. Create a task (manager/admin only)
curl -s -X POST $BASE/tasks -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Investigate latency spike","priority":"HIGH"}'

# 3. List tasks (scoped to your role) with filters
curl -s "$BASE/tasks?status=TODO&priority=HIGH&q=latency" -H "Authorization: Bearer $TOKEN"

# 4. Move it through the workflow
curl -s -X PATCH $BASE/tasks/<taskId>/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}'

# 5. See the audit trail and your team dashboard
curl -s $BASE/activity/task/<taskId> -H "Authorization: Bearer $TOKEN"
curl -s $BASE/dashboard            -H "Authorization: Bearer $TOKEN"
```

## Role permissions (summary)

| Capability | ADMIN | MANAGER | USER |
|---|---|---|---|
| Manage users / roles / teams | Yes | No | No |
| Create / assign / delete tasks | Yes | Yes (own team) | No |
| Update task fields | Yes | Yes (own team) | No |
| Change status of own assigned task | Yes | Yes | Yes |
| View tasks | all | team | own |
| Comment | Yes | Yes | Yes (visible tasks) |
| View activity | all | team + own | own |
| Dashboard | global | team | personal |

Data scope (all / team / own) is enforced in the service layer; capability is enforced by RBAC middleware. The decision document explains why.

## API reference

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/signup | Register (always USER) |
| POST | /api/auth/login | Login, returns tokens |
| POST | /api/auth/refresh | Rotate refresh, returns new tokens |
| POST | /api/auth/logout | Revoke a refresh token |
| GET | /api/auth/me | Current identity |
| POST/GET | /api/users | Create / list users (admin) |
| PATCH | /api/users/:id/role, /team | Change role / assign team (admin) |
| POST/GET | /api/teams, /:id | Create / list / detail (with members) |
| POST/GET | /api/tasks | Create / list (filters + pagination) |
| GET/PATCH/DELETE | /api/tasks/:id | Get / update / delete |
| PATCH | /api/tasks/:id/assign, /status | Assign / change status |
| GET/POST | /api/tasks/:taskId/comments | List / add comments |
| GET | /api/activity/me, /task/:id, /user/:id | Activity feeds |
| GET | /api/dashboard | Role-scoped insights |
| GET | /api/insights/bottlenecks | Workflow Bottleneck Detector (manager/admin) |

All responses share one envelope: `{ "success": true, "data": ..., "meta"?: ... }` or `{ "success": false, "error": { "message", "details"? } }`.

## Scripts

| Command | Description |
|---|---|
| npm run db:start | Start DynamoDB Local (Java, no Docker) on :8000 |
| npm run create-tables | Provision tables and GSIs (idempotent) |
| npm run seed | Insert demo users, teams, tasks, comments |
| npm run dev | Start API with auto-reload |
| npm start | Start API |
| npm test | Run the test suite |
| npm run lint / npm run format | ESLint / Prettier |
