# Engineering Decision Document: Smart Internal Operations System

This document explains how I approached the problem, what I decided, and what I deliberately left out. The brief is intentionally open-ended, so the choices below matter more than the line count.

## 0. Framing: what problem am I actually solving?

The scenario names four pains:
1. Managing tasks and operations across teams
2. Tracking user actions and accountability
3. Poor structure as the product scales
4. Lack of visibility into workflows

So I optimised for accountability and visibility, not just CRUD. Two design choices fall directly out of that: an immutable activity log wired into every state change (accountability), and a role-scoped dashboard that turns raw data into a per-role picture of work (visibility). The core module is Task Management because it is the workload these teams actually coordinate around.

## 1. System Architecture

### Overall structure
A single Express service with a strict, one-directional layering:

```
HTTP -> route -> validate(Zod) -> authenticate(JWT) -> requirePermission(RBAC) -> controller -> service -> repository -> DynamoDB
```

- Routes wire middleware to handlers and nothing else.
- Controllers are thin: they translate between HTTP and service calls and never contain business rules.
- Services own all business logic: scope rules, the status state-machine, transactional writes.
- Repositories are the only code that talks to DynamoDB. Swapping the database means rewriting this layer and nothing above it.
- Middleware is cross-cutting: validation, auth, RBAC, error funnel, rate limiting.

### How components interact
- Identity flows in the token. `authenticate` verifies the JWT and attaches `{ id, role, teamId, name }` to `req.user`. There is no DB round-trip per request for identity.
- Authorization is two-stage. RBAC middleware answers "may this role do this kind of thing?" (a permission). The service answers "on this specific record?" (scope/ownership). Keeping them separate is deliberate; see section 3.
- The activity log is a first-class citizen. State-changing operations (create, assign, status change, comment) write the domain record and the activity entry inside one DynamoDB transaction (`TransactWrite`), so the audit trail can never disagree with reality.
- One response and error contract. Success is `{ success, data, meta? }`; failure is `{ success, error }`. A single error-handling middleware enforces it and distinguishes operational errors (returned cleanly) from bugs (logged, generic 500).

## 2. Database Design

DynamoDB, multi-table, access-pattern-first. Relationships in a NoSQL store live in keys and indexes, not foreign keys, so I listed the queries the app must serve and designed keys and GSIs to answer each in one lookup.

### Entities and relationships (logical)
```
Team   1 - N  User          (User.teamId references Team)
Team   1 - 1  manager (User) (Team.managerId references User)
User   1 - N  Task (creator)  (Task.creatorId references User)
User   1 - N  Task (assignee) (Task.assigneeId references User, sparse)
Task   1 - N  Comment         (Comment.taskId references Task)
Entity N - N  ActivityLog     (polymorphic: pk = ENTITY#id)
User   1 - N  RefreshToken    (rotation/revocation)
```

### Tables, keys, and the access pattern each serves

| Table | Key | GSIs | Serves |
|---|---|---|---|
| Users | `userId` (PK) | `EmailIndex(email)`, `TeamIndex(teamId)` | get by id; login by email; list team members |
| Teams | `teamId` (PK) | none | team detail |
| Tasks | `taskId` (PK) | `AssigneeIndex(assigneeId, status)`, `TeamStatusIndex(teamId, status)`, `CreatorIndex(creatorId)` | a user's tasks (optionally by status); a team's tasks by status; tasks I created |
| Comments | `taskId` (PK) + `sk = createdAt#commentId` | none | all comments for a task, time-ordered |
| ActivityLog | `pk = ENTITY#id` + `sk = createdAt#logId` | `ActorIndex(actorId, createdAt)` | audit trail for one entity; everything a user did |
| RefreshTokens | `tokenId` (PK) | none | validate/rotate/revoke a refresh token |

Notable detail: `assigneeId` is a GSI partition key, so unassigned tasks omit the attribute entirely (a sparse index) rather than storing `null`. DynamoDB rejects null key attributes, and this also means unassigned tasks simply do not appear in assignee queries, which is correct.

## 3. Key Decisions (and alternatives considered)

DynamoDB over PostgreSQL. Chosen because I can reason about and defend a NoSQL access-pattern model fluently, and the brief explicitly grades "strong understanding of your own code." Alternative: Postgres plus an ORM would map relationships to foreign keys more obviously and give ad-hoc querying for free. Trade-off accepted: I give up joins and arbitrary filtering, and pay for it with in-memory secondary filtering (see section 4). I would revisit this if the product needed rich reporting.

Permission-based RBAC, not role checks. Routes require a permission (`task:assign`), and roles are mapped to permission sets in one config file. Alternative: scatter `if (role === 'ADMIN')` through handlers. Why mine: adding a fourth role later is a config change, not a code hunt, and the permission matrix is self-documenting.

Two-stage authorization (permission versus scope). RBAC can say "managers may read tasks" but only the service knows which tasks (their team's). So capability lives in middleware and data-scope lives in the service. Alternative: push everything into middleware, but it cannot see the record yet, so it would either over-fetch or under-protect.

JWT access plus rotating refresh tokens. Short-lived access tokens carry identity and role (no per-request DB hit); refresh tokens are stored server-side and rotated on use, so a replayed refresh token is dead. Alternative: stateless-only JWTs (cannot revoke) or server sessions (a DB hit per request). This is the middle ground.

Atomic write plus log via `TransactWrite`. For accountability, an action and its audit entry must both happen or neither. Alternative: write the record then the log (two calls), where a crash between them corrupts the trail. The transaction removes that window.

ES Modules, plain JavaScript, layered modules. Matches my fluency (no TypeScript) while still getting structure from the module boundaries and the repository pattern.

## 4. Trade-offs (what I compromised, and why)

- Secondary filtering is in-memory over the full scoped set. DynamoDB serves the primary access pattern via indexes (caller scope plus `status` as a key condition). The service then loads the complete scoped set (paging through `LastEvaluatedKey`, capped at 1000 items) and applies `priority` and free-text `q` in memory, so `total` and pagination are correct rather than page-bound. Cost: the whole scoped set is read per filtered request, and very large teams hit the 1000 cap. Why acceptable: per-user and per-team task counts are small; a real full-text search engine (see Scaling) would be over-engineering for this scope.
- A few `Scan`s remain (admin "list all users/tasks/teams"). Scans are O(table). Why acceptable now: admin-only, low-frequency, small data. Fix at scale: section 5.
- No joins, so some N+1 reads. The manager dashboard reads team tasks per status and members separately, then stitches in memory. Clear and correct at team size; the scaling fix is noted below.
- USER task listing unions assigned and created in memory instead of paginating server-side, because a person's own task set is small. Team and admin listings do use cursor pagination.
- Notifications are modelled as activity-log entries, not delivered. There is no email or websocket. The data to drive a notification feed exists; delivery is out of scope (see scope decision).

## 5. Scaling Strategy: 10,000+ users

### What breaks first
1. Scan-based admin listings degrade linearly: the first real pain point.
2. Hot partitions and N+1 reads on the dashboard as teams and task volume grow (many small queries per request).
3. No caching: every dashboard recomputes aggregates from raw items on each call.
4. Refresh-token table growth if expired rows are not reclaimed.
5. Free-text search does not scale as an in-memory page filter.

### How I would improve it
- Kill the scans: maintain query-able access patterns (for example a status-partitioned GSI, or a small counters item per team updated transactionally on writes), so the dashboard reads pre-aggregated numbers instead of recomputing.
- Cache hot reads (dashboard, team rosters) in Redis or DAX with short TTLs.
- Offload the activity log to a write-optimised path: stream events to a queue (SQS/Kinesis) and batch them into the log or a data warehouse. The activity table is append-only and high-write, which suits a key-value store with on-demand capacity, and it lets analytical reads move off the hot path.
- Enable DynamoDB TTL on `RefreshTokens.expiresAt` so expired tokens self-delete (the field already exists for it).
- Dedicated search: push tasks to OpenSearch or Algolia for real full-text and faceted filtering, replacing the in-memory `q` filter.
- Stateless API and horizontal scale: the service holds no session state, so it scales behind a load balancer, and DynamoDB on-demand absorbs throughput.

## 6. Future Improvements: if I had 2 more days

1. Deepen the bottleneck analytics: use median (not mean) to resist outliers, add per-assignee breakdowns, and trend the constraint over time.
2. Broaden automated test coverage: there are unit tests for the status state-machine, RBAC scope rules, and pagination today; I would add an integration suite that runs against DynamoDB Local in CI.
3. Real notifications: an in-app feed endpoint backed by the activity log, then websocket or email delivery.
4. Soft deletes and restore: tasks are hard-deleted today; a `deletedAt` tombstone keeps the audit trail honest.
5. Search service: replace in-memory `q` filtering with OpenSearch.
6. Observability: structured request logging, metrics, and tracing.

## Mandatory Creativity

### Invented feature: Workflow Bottleneck Detector
`GET /api/insights/bottlenecks` (MANAGER / ADMIN, team-scoped).

What it is, and what it is not. It is not a dashboard. A dashboard shows state ("5 tasks in REVIEW"). This is a diagnostic: it measures how long work actually spends in each workflow stage and names the constraint, the stage where work gets stuck. Sample output:

> "IN_REVIEW is the slowest stage, about 14x longer on average than the others," plus the specific tasks stuck longer than their stage's average.

- Why I added it: it answers the scenario's literal pain, "lack of visibility into workflows," and goes beyond logging what happened to explaining where the team is losing time. It is also what makes this a "Smart" Operations System rather than a tracker.
- What problem it solves: managers can see late tasks (a symptom) but not the cause (the bottleneck stage). This makes the cause measurable and actionable.
- Why it was nearly free to build (the real design signal): every status change already writes `msInPrevStatus` and the from/to states into the activity log, and each task carries `statusChangedAt`. I instrumented the log that way from the start specifically so this analysis was a query, not a schema change. The detector aggregates those completed-stage samples and adds the live time open tasks have spent in their current status.
- Alternatives considered: WIP/capacity guardrails and a duplicate-effort detector. Both are viable, but the bottleneck detector reuses existing data and most directly targets the visibility pain.

### Scope decision
Built: JWT auth with refresh rotation; permission-based RBAC with team and ownership scoping; full Task Management (CRUD plus assign plus enforced status workflow plus search/filter/pagination); comments; immutable, transactional activity log; role-scoped dashboard; Workflow Bottleneck Detector (invented feature); Swagger, Postman, and seed data.

Intentionally not built, and why:
- Frontend UI: the brief weights product thinking and engineering over pixels (Code Quality is 5 of 40), and Swagger gives a usable, testable surface.
- Real-time and email notifications: the data exists in the activity log; delivery infrastructure is disproportionate to a 5-6 hour scope.
- Microservices: a single well-layered service is clearer and easier to defend, and premature decomposition is the over-engineering the brief warns against.
- File attachments, multi-tenant org layer, soft deletes: valuable later, but not core to proving the operational model now.
