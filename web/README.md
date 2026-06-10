# SmartOps Console (web)

React + Vite frontend for the Smart Internal Operations System. Plain JavaScript (JSX), no
TypeScript, no UI framework — a single handcrafted stylesheet.

## Run

The frontend talks to the API at `http://localhost:4000` through a Vite dev proxy (`/api`), so
there are no CORS issues and tokens stay first-party.

```bash
# 1. Start the backend stack (from the repo root)
npm run db:start        # DynamoDB Local on :8000
npm run create-tables   # idempotent
npm run seed            # demo users, teams, tasks
npm run dev             # API on :4000

# 2. Start this app (from web/)
cd web
npm install
npm run dev             # http://localhost:5173
```

Open http://localhost:5173 and sign in with a seeded account (the login screen has one-click
fill buttons):

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@smartops.dev | Admin@123 |
| MANAGER | manager@smartops.dev | Manager@123 |
| USER | user1@smartops.dev | User@123 |

## What it covers

- **Auth** — login / signup, JWT access + refresh, silent refresh on 401, logout
- **Dashboard** — role-scoped (admin global / manager team workload / user personal)
- **Tasks** — list with filters (status, priority, assignee, search) + pagination, create,
  detail, edit, assign, delete
- **Workflow** — status moves offer only the transitions the backend allows for the current state
- **Comments** — per-task thread
- **Activity** — per-task audit trail + "My Activity" feed
- **Teams** — list, members, create
- **Users** — admin-only: list, create, change role, assign team
- **Bottlenecks** — the workflow insight view (manager / admin)

The UI hides or disables anything the signed-in role lacks permission for; the server enforces it
regardless.

## Build

```bash
npm run build     # outputs to web/dist
npm run preview
```

`VITE_API_TARGET` overrides the proxy target (defaults to `http://localhost:4000`).
