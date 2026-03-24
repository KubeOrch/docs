---
title: REST API Reference
description: Complete API endpoint reference for the KubeOrch Core backend.
---

All API endpoints are under the `/v1` prefix. Protected endpoints require a valid JWT token in the `Authorization: Bearer <token>` header.

## Common Patterns

### Authentication Header

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

### Error Response Format

All errors follow this structure:
```json
{
  "error": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (invalid input, missing fields) |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource) |
| `500` | Internal server error |

### Pagination

List endpoints support pagination via query parameters:
```
GET /v1/api/workflows?page=1&limit=20&sort=created_at&order=desc
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Items per page |
| `sort` | `created_at` | Sort field |
| `order` | `desc` | Sort order (`asc` or `desc`) |
| `search` | — | Search query string |

## Authentication

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/api/auth/register` | Register a new user |
| `POST` | `/v1/api/auth/login` | Login with email/password |
| `POST` | `/v1/api/auth/refresh` | Refresh an expired JWT token |
| `GET` | `/v1/api/auth/methods` | Get available auth methods |
| `GET` | `/v1/api/auth/oauth/:provider/authorize` | Start OAuth flow for a provider |
| `GET` | `/v1/api/auth/oauth/:provider/callback` | OAuth callback handler |
| `POST` | `/v1/api/auth/oauth/exchange` | Exchange OAuth code for JWT |

### Request/Response Examples

**Register:**
```bash
curl -X POST http://localhost:8080/v1/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "name": "John Doe"}'
```
```json
// 201 Created
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Login:**
```bash
curl -X POST http://localhost:8080/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```
```json
// 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "John Doe", "email": "user@example.com", "role": "user" }
}
```

**Error (invalid credentials):**
```json
// 401 Unauthorized
{ "error": "Invalid email or password" }
```

## User Profile

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/profile` | Get current user profile |
| `PUT` | `/v1/api/profile` | Update user profile |

## Workflows

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/api/workflows` | Create a new workflow |
| `GET` | `/v1/api/workflows` | List all workflows for the user |
| `GET` | `/v1/api/workflows/:id` | Get a specific workflow |
| `PUT` | `/v1/api/workflows/:id` | Update workflow metadata |
| `DELETE` | `/v1/api/workflows/:id` | Delete a workflow |
| `POST` | `/v1/api/workflows/:id/clone` | Clone a workflow |
| `PUT` | `/v1/api/workflows/:id/status` | Update workflow status (draft/published/archived) |
| `POST` | `/v1/api/workflows/:id/save` | Save nodes and edges without versioning |
| `POST` | `/v1/api/workflows/:id/run` | Execute the workflow (creates version + deploys) |
| `GET` | `/v1/api/workflows/:id/runs` | Get workflow execution history |
| `GET` | `/v1/api/workflows/:id/status/stream` | SSE stream for workflow execution status |

**Create a workflow:**
```bash
curl -X POST http://localhost:8080/v1/api/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "description": "Web application stack"}'
```
```json
// 201 Created
{
  "id": "65f1a2b3c4d5e6f7a8b9c0d1",
  "name": "My App",
  "description": "Web application stack",
  "status": "draft",
  "nodes": [],
  "edges": [],
  "created_at": "2026-03-24T10:00:00Z",
  "updated_at": "2026-03-24T10:00:00Z"
}
```

**Run a workflow:**
```bash
curl -X POST http://localhost:8080/v1/api/workflows/<id>/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"cluster": "my-cluster", "namespace": "default"}'
```
```json
// 200 OK
{
  "run_id": "run_abc123",
  "status": "deploying",
  "version": 1
}
```

### Workflow Node Diagnostics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/workflows/:id/nodes/:nodeId/diagnostics` | Get diagnostics for a node |
| `GET` | `/v1/api/workflows/:id/nodes/:nodeId/fix-template/:fixType` | Get auto-fix template |
| `POST` | `/v1/api/workflows/:id/nodes/:nodeId/fix` | Apply auto-fix to a node |

### Workflow Versions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/workflows/:id/versions` | List versions (paginated) |
| `GET` | `/v1/api/workflows/:id/versions/:version` | Get a specific version |
| `POST` | `/v1/api/workflows/:id/versions` | Create a manual version |
| `PUT` | `/v1/api/workflows/:id/versions/:version` | Update version metadata |
| `POST` | `/v1/api/workflows/:id/versions/:version/restore` | Restore a previous version |
| `GET` | `/v1/api/workflows/:id/versions/compare?v1=X&v2=Y` | Compare two versions |

## Clusters

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/api/clusters` | Add a new cluster |
| `GET` | `/v1/api/clusters` | List all clusters |
| `GET` | `/v1/api/clusters/default` | Get the default cluster |
| `GET` | `/v1/api/clusters/:name` | Get a specific cluster |
| `PUT` | `/v1/api/clusters/:name` | Update a cluster |
| `DELETE` | `/v1/api/clusters/:name` | Remove a cluster |
| `PUT` | `/v1/api/clusters/:name/default` | Set as default cluster |
| `POST` | `/v1/api/clusters/:name/test` | Test cluster connection |
| `POST` | `/v1/api/clusters/:name/refresh` | Refresh cluster metadata |
| `GET` | `/v1/api/clusters/:name/status` | Get cluster status |
| `GET` | `/v1/api/clusters/:name/metrics` | Get cluster resource metrics |
| `GET` | `/v1/api/clusters/:name/logs` | Get cluster connection logs |
| `PUT` | `/v1/api/clusters/:name/credentials` | Update cluster credentials |
| `POST` | `/v1/api/clusters/:name/share` | Share cluster with another user |

**Add a cluster:**
```bash
curl -X POST http://localhost:8080/v1/api/clusters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production",
    "server": "https://k8s-api.example.com:6443",
    "auth_type": "bearer_token",
    "token": "eyJhbGciOi..."
  }'
```
```json
// 201 Created
{
  "name": "production",
  "server": "https://k8s-api.example.com:6443",
  "status": "connected",
  "version": "v1.28.0"
}
```

**Test cluster connection:**
```bash
curl -X POST http://localhost:8080/v1/api/clusters/production/test \
  -H "Authorization: Bearer <token>"
```
```json
// 200 OK
{ "status": "healthy", "version": "v1.28.0", "nodes": 3 }
```

## Resources

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/resources` | List tracked Kubernetes resources |
| `POST` | `/v1/api/resources/sync` | Sync resources from Kubernetes |
| `GET` | `/v1/api/resources/:id` | Get a specific resource |
| `PATCH` | `/v1/api/resources/:id` | Update resource user fields |
| `GET` | `/v1/api/resources/:id/stream` | SSE stream for resource status |
| `GET` | `/v1/api/resources/:id/logs/stream` | SSE stream for pod logs |
| `GET` | `/v1/api/resources/:id/exec/terminal` | WebSocket terminal session |
| `GET` | `/v1/api/resources/:id/pods` | Get pods for a deployment |

## Builds

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/api/builds/start` | Start a container image build |
| `GET` | `/v1/api/builds` | List builds for current user |
| `GET` | `/v1/api/builds/:id` | Get build details |
| `GET` | `/v1/api/builds/:id/stream` | SSE stream for build logs |
| `POST` | `/v1/api/builds/:id/cancel` | Cancel an in-progress build |

## Import

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/api/import/analyze` | Analyze an import source |
| `POST` | `/v1/api/import/upload` | Upload a Docker Compose file |
| `POST` | `/v1/api/import/apply` | Apply import to existing workflow |
| `POST` | `/v1/api/import/create-workflow` | Create new workflow from import |
| `GET` | `/v1/api/import/:id` | Get import session status |
| `GET` | `/v1/api/import/:id/stream` | SSE stream for import progress |

## Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/templates` | Get available resource templates |

## Plugins

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/plugins` | List all plugins |
| `GET` | `/v1/api/plugins/enabled` | Get enabled plugins |
| `GET` | `/v1/api/plugins/categories` | Get plugin categories |
| `GET` | `/v1/api/plugins/:id` | Get plugin details |
| `POST` | `/v1/api/plugins/:id/enable` | Enable a plugin |
| `POST` | `/v1/api/plugins/:id/disable` | Disable a plugin |

## Registries

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/registries` | List container registries |
| `GET` | `/v1/api/registries/lookup?image=...` | Find registry for an image |
| `GET` | `/v1/api/registries/:id` | Get registry details |

### Admin-Only Registry Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/api/admin/registries` | Create a registry |
| `PUT` | `/v1/api/admin/registries/:id` | Update a registry |
| `DELETE` | `/v1/api/admin/registries/:id` | Delete a registry |
| `POST` | `/v1/api/admin/registries/:id/test` | Test registry connection |
| `PUT` | `/v1/api/admin/registries/:id/default` | Set default registry |

## Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/dashboard/recent-workflows` | Get recent workflows |
| `GET` | `/v1/api/dashboard/stats` | Get dashboard statistics |

## Search

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/search?q=...` | Global search across entities |

## Settings (Admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/api/settings/invite-code` | Get current invite code |
| `POST` | `/v1/api/settings/generate-invite-code` | Generate new invite code |
| `GET` | `/v1/api/settings/regenerate-setting` | Get auto-regenerate setting |
| `PUT` | `/v1/api/settings/regenerate-setting` | Update auto-regenerate setting |
