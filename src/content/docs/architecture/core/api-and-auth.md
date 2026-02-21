---
title: API, Auth & Data Model
description: Routes, middleware chain, JWT authentication, and the workflow data model for the KubeOrch core backend.
---

## Route Structure

All API routes are defined under the `/v1` path prefix in `routes/routes.go`. Routes are organized into groups by authentication and authorization requirements.

### Public Routes

```
/v1/api/auth/*
```

Authentication routes (register, login, OAuth callbacks, token refresh) are fully public. The refresh endpoint within this group uses `RefreshTokenMiddleware` rather than no middleware, so it still validates a token structure -- it just accepts expired ones.

### Protected Routes

```
/v1/api/*
```

All non-auth, non-admin routes require a valid JWT. The full list of protected route groups:

- `/v1/api/workflows` -- Workflow CRUD, execution, and version control
- `/v1/api/clusters` -- Cluster registration, status, and metrics
- `/v1/api/resources` -- Kubernetes resource management and SSE streams
- `/v1/api/builds` -- Container image build jobs
- `/v1/api/imports` -- Docker Compose and Git import sessions
- `/v1/api/registries` -- Container registry configuration
- `/v1/api/plugins` -- CRD plugin management
- `/v1/api/alerts` -- Alert management
- `/v1/api/notifications` -- Notification feeds
- `/v1/api/metrics` -- Cluster and resource metrics
- `/v1/api/search` -- Global cross-entity search
- `/v1/api/settings` -- Application settings
- `/v1/api/dashboard` -- Dashboard statistics
- `/v1/api/profile` -- Authenticated user profile

All of these routes have `AuthMiddleware` applied at the group level, so every handler within them can assume the `userID`, `email`, and `userRole` context values are present.

### Admin Routes

```
/v1/api/admin/*
```

Admin routes apply both `AuthMiddleware` and `AdminMiddleware` at the group level. These routes expose user management, system configuration, and other operations that must be restricted to administrators. Any request from a non-admin authenticated user is rejected at the middleware layer with a `403` before reaching the handler.

## Middleware Chain

Every protected request passes through one or more middleware functions before reaching its handler. Middleware is composed in `routes/routes.go` and attached to route groups.

### AuthMiddleware

`AuthMiddleware` validates the caller's JWT on every request to protected routes. The token is sourced from two locations in priority order:

1. The `Authorization` HTTP header, expected in `Bearer <token>` format.
2. The `?token=` query parameter, used specifically for WebSocket and terminal connections where setting custom headers is not supported by the browser WebSocket API.

When a WebSocket or terminal path is detected, the middleware logs the connection attempt separately for observability. On successful validation the middleware writes three values into the Gin context for downstream use by handlers and other middleware:

```
userID    string   -- MongoDB ObjectID of the authenticated user
email     string   -- User's email address from JWT claims
userRole  string   -- Role string (e.g., "admin", "user")
```

Requests with a missing, malformed, or expired token receive a `401 Unauthorized` response before reaching any handler.

### AdminMiddleware

`AdminMiddleware` is stacked after `AuthMiddleware` on admin-only route groups. It reads `userRole` from the Gin context (populated by `AuthMiddleware`) and compares it against the expected admin role string. If the role does not match, the middleware returns `403 Forbidden` and logs the non-admin access attempt including the requesting user's identity. This two-middleware design means the admin check never runs without a prior valid authentication check.

### RequireRole

`RequireRole(allowedRoles ...string)` is a flexible, parameterized middleware for routes that need access control beyond the binary admin/non-admin split. It accepts a variadic list of permitted role strings and grants access if the authenticated user's role appears in that list. This allows the creation of role hierarchies or feature-gated route groups without duplicating middleware logic.

### RefreshTokenMiddleware

`RefreshTokenMiddleware` is applied exclusively to the token refresh endpoint. It differs from `AuthMiddleware` in one critical way: it calls `ValidateJWTTokenForRefresh`, which invokes `jwt.WithoutClaimsValidation()` on the underlying JWT parser. This means the middleware accepts tokens that have already passed their `exp` claim, intentionally allowing clients to present an expired token in exchange for a fresh one. Rather than rejecting expired tokens outright, the middleware enforces a separate maximum age window configured via `GetTokenRefreshMaxAgeDays()`. Tokens older than that window are rejected even on the refresh endpoint.

## Authentication & JWT

### Password Hashing

User passwords are hashed with bcrypt at cost factor 12 before being stored in MongoDB. Cost 12 requires approximately 300ms of CPU time per hash on modern hardware, which provides a strong defense against offline brute-force attacks if the database is ever compromised. The plaintext password is never persisted and never appears in logs.

### JWT Structure

Access tokens are signed with HMAC-SHA256 (`HS256`). The signing secret is read from the `JWT_SECRET` configuration key. If `JWT_SECRET` is not set or is empty, token generation will fail with an error at the service layer, preventing the issuance of unsigned tokens. Each token carries the following claims:

```json
{
  "user_id": "<MongoDB ObjectID>",
  "email": "user@example.com",
  "role": "admin",
  "iss": "<issuer>",
  "exp": "<unix timestamp>",
  "iat": "<unix timestamp>"
}
```

The `UserID`, `Email`, and `Role` fields are custom claims. The remaining fields (`iss`, `exp`, `iat`) are standard `RegisteredClaims` from the `golang-jwt/jwt` library.

### Token Lifetime and Refresh

Tokens are issued with a 24-hour expiry. When a token expires, the client presents it to the refresh endpoint, which is protected by `RefreshTokenMiddleware` rather than `AuthMiddleware`. The refresh endpoint accepts expired tokens and issues a new token with a fresh 24-hour window, provided the original token's issue time (`iat`) falls within the maximum refresh age defined by `GetTokenRefreshMaxAgeDays()`. This places a hard ceiling on how long a single authentication session can silently extend itself, requiring full re-authentication after that period.

## Workflow Data Model

Workflows are the central entity of the application. Their data model is defined in `models/workflow.go` and spans multiple MongoDB collections.

### Workflow Statuses

A workflow document carries one of three lifecycle statuses:

| Status      | Meaning                                                                 |
|-------------|-------------------------------------------------------------------------|
| `draft`     | Being edited; cannot be executed                                       |
| `published` | Ready for execution; the executor validates this before creating a run |
| `archived`  | No longer active; resources are cleaned up on archive                  |

The executor's `ExecuteWorkflow()` function explicitly checks that the workflow is in `published` status before proceeding. Attempting to run a `draft` or `archived` workflow returns an error.

### Workflow Run Statuses

Each execution creates a separate run document with its own status:

| Status      | Meaning                                          |
|-------------|--------------------------------------------------|
| `running`   | Execution is in progress                        |
| `completed` | All nodes applied successfully                  |
| `failed`    | One or more nodes encountered an error          |
| `cancelled` | Run was cancelled before completion             |

The workflow document itself tracks aggregate counters: `RunCount`, `SuccessCount`, and `FailureCount` are incremented on each run completion.

### Node and Edge Types

Workflow canvas state is stored as arrays of nodes and edges on the workflow document.

```go
// WorkflowNode represents a single canvas node
type WorkflowNode struct {
    ID       string                 // Unique node ID
    Type     string                 // e.g., "deployment", "service", "ingress"
    Position struct {
        X float64
        Y float64
    }
    Data map[string]interface{}     // Type-specific configuration values
}

// WorkflowEdge represents a directed connection between two nodes
type WorkflowEdge struct {
    ID           string
    Source       string  // Source node ID
    Target       string  // Target node ID
    SourceHandle string  // Which output handle on the source
    TargetHandle string  // Which input handle on the target
    Type         string  // Edge style/type
}
```

The `Data` field on each node holds the user-configured parameters that are merged with template defaults before rendering.

### Version Documents

Workflow versions are stored in a separate MongoDB collection as `WorkflowVersionDoc` documents. Each version is a full snapshot of the nodes and edges at a point in time. Key fields:

```go
type WorkflowVersionDoc struct {
    WorkflowID  string
    Version     int
    Nodes       []WorkflowNode
    Edges       []WorkflowEdge
    IsAutomatic bool        // true = auto-saved on run; false = manual save
    RunID       string      // Associated run ID if auto-saved
    RunStatus   string      // Run status at time of save
    RestoredFrom *int       // Version number this was restored from, if applicable
}
```

`IsAutomatic` distinguishes between versions created automatically when a workflow is executed and those created by an explicit user save action. `RestoredFrom` provides a traceable history when a user rolls back to a prior version.

Version diffs are computed on demand using the `VersionDiff` type, which identifies `AddedNodes`, `RemovedNodes`, `ModifiedNodes` (each a `NodeDiff` with `OldData` and `NewData`), and the corresponding edge changes.
