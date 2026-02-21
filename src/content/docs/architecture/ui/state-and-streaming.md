---
title: State Management & Streaming
description: Zustand stores, API client pattern, and real-time streaming hooks for the KubeOrch UI.
---

## State Management Architecture

The app uses Zustand with a store-per-domain pattern. Some stores use `persist` middleware to survive page reloads via `localStorage`.

| Store | Persistence | State |
|-------|-------------|-------|
| **AuthStore** | persisted | `token`, `user`, `expiresAt` |
| **WorkflowStore** | runtime | `nodeUpdateHandler`, `secretValues`, `envValues` |
| **ClusterStore** | partial | `clusters[]`, `selectedCluster`, `clusterStatuses`, `defaultClusterId` |
| **ResourceStore** | persisted | `viewMode`, `filters` |
| **PluginStore** | runtime | `plugins[]`, `categories` |
| **RegistryStore** | runtime | `registries[]`, `defaultRegistry` |
| **PanelStore** | persisted | `widths` |
| **SidebarStore** | persisted | `folderState` |

### AuthStore

`AuthStore` uses the Zustand `persist` middleware backed by `createJSONStorage(() => localStorage)` with the storage key `"auth-storage"`. The persisted state includes `isAuthenticated`, `token`, `expiresAt`, and the `user` object.

The `user` object has the following shape:

```ts
{
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  avatarUrl: string;
  authProvider: string; // "email" | "github" | "authentik" | ...
}
```

The `authProvider` field records which authentication method the user used to log in. This is used by the UI to display the correct provider icon on the profile page and to suppress the password-change form for OAuth-authenticated users.

**Client-side token expiry tracking.** On login, `expiresAt` is set to `Date.now() + 24 * 60 * 60 * 1000` (24 hours from the current time). This is a client-side convenience value — it allows the API interceptor to detect expiry locally without issuing a request. `isTokenExpired()` compares `Date.now()` against `expiresAt`. `validateAndGetToken()` returns `null` and calls `removeAuthDetails()` if the token is expired, rather than returning a stale token to callers.

**Cascade clear on logout.** `removeAuthDetails()` does not only clear the auth store. It explicitly calls:

- `PanelStore.clearPanelState()`
- `SidebarStore.clearSidebarState()`
- `ResourcesStore.clearResourcesState()`
- `NotificationStore.clearNotificationState()`

This means a full logout resets all four persisted stores simultaneously, preventing stale UI state from leaking between user sessions on a shared machine.

## API Client Pattern

All API calls go through a centralized Axios instance (`lib/api.ts`) that handles:

1. **Base URL** -- Reads `NEXT_PUBLIC_API_URL` from environment
2. **JWT injection** -- Automatically attaches `Authorization: Bearer` header
3. **Token refresh** -- If token is expired, automatically calls `/auth/refresh` before retrying
4. **401 handling** -- On unauthorized response, clears auth state and redirects to `/login`
5. **Request queuing** -- Multiple requests during token refresh wait for the single refresh to complete

Service functions in `lib/services/` provide typed wrappers around the raw Axios calls.

**Timeout.** The Axios instance is configured with a 30-second request timeout.

**Auth endpoint bypass.** The request interceptor skips token injection entirely for requests whose URL contains `/auth/`. This prevents the interceptor from attaching an expired token to the very refresh request that is trying to obtain a new one.

**Shared promise refresh pattern.** To prevent concurrent token refresh races under React's concurrent rendering and StrictMode double-invocation, the interceptor uses an `isRefreshing` boolean flag and a `refreshSubscribers` queue:

1. The first interceptor call that detects an expired token sets `isRefreshing = true` and initiates a single `POST /auth/refresh` request.
2. Any subsequent interceptor calls that arrive while `isRefreshing` is `true` do not issue their own refresh. Instead, they push a callback onto the `refreshSubscribers` array and return a promise that resolves only when the refresh completes.
3. When the refresh response arrives, the interceptor iterates the queue, resolves each subscriber with the new token, then clears `isRefreshing` and empties the queue.

This guarantees that exactly one refresh call is made regardless of how many requests were in-flight simultaneously.

**401 redirect guard.** The response interceptor listens for 401 responses. On receiving one, it calls `removeAuthDetails()` (triggering the cascade clear described above), shows a toast notification, and redirects to `/login`. To prevent a redirect loop when the login page itself returns a 401, the interceptor checks `window.location.pathname` and skips the redirect if the user is already on `/login`.

## Real-Time Streaming Hooks

Custom hooks manage persistent SSE connections to the Core. They use `fetch()` with `Authorization: Bearer` rather than native `EventSource` — this is required because `EventSource` does not support custom headers, and the Core rejects unauthenticated SSE connections.

| Hook | Purpose | Stream Key |
|------|---------|------------|
| `useWorkflowStatusStream` | Node status during deployment | `workflow:<id>` |
| `useLogStream` | Live container log streaming | `pod-logs:<id>` |
| `useResourceStatusStream` | Resource health changes | `resource:<id>` |
| `useBuildStream` | Build progress and logs | `build:<id>` |
| `useImportStream` | Import analysis progress | `import:<id>` |

Each hook returns reactive state, guards against duplicate connections (React StrictMode), and schedules a reconnect after 3 seconds on any connection loss.

### useLogStream

`useLogStream` streams container logs for a given resource via SSE.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `resourceId` | `string` | required | The resource ID to stream logs for |
| `enabled` | `boolean` | required | Whether the stream should be active |
| `follow` | `boolean` | `true` | Keep the stream open for new log lines |
| `tailLines` | `number` | `100` | Number of historical lines to fetch on connect |

**Stream URL:** `${baseUrl}/resources/${resourceId}/logs/stream?follow=${follow}&tail=${tailLines}`

The request is issued with `fetch()` and an `Authorization: Bearer` header.

**Backpressure and memory cap.** `MAX_LOG_LINES = 5000`. When the in-memory log array exceeds this limit, older entries are dropped from the front of the array. This prevents unbounded memory growth for long-running or very verbose pods.

**Event types:**

| Event | Payload | Description |
|-------|---------|-------------|
| `metadata` | `{ pod, container, namespace, cluster }` | Delivered once on connect with context about the log source |
| `log` | `ParsedLog` | A single parsed log line |
| `error` | `string` | An error message from the server |
| `complete` | — | Stream has ended (container exited or log rotation) |

**ParsedLog structure.** Each `log` event carries a `ParsedLog` object:

```ts
{
  id: string;        // unique identifier for React key prop
  timestamp: string; // extracted from raw line via regex, or empty string
  message: string;   // log text with timestamp stripped
  raw: string;       // original unmodified log line
}
```

Timestamps are extracted by applying a regex against the raw log line. If no timestamp pattern is matched, the `timestamp` field is an empty string and `message` equals `raw`.

**Reconnect behavior.** If the stream errors and `follow === true && enabled === true`, the hook schedules a reconnect after `RECONNECT_DELAY_MS = 3000` milliseconds. Reconnections do not occur if `follow` is false (tail-only mode) or if the hook has been disabled. `clearLogs()` and `reconnect()` are exposed in the hook's return value to allow manual control from the parent component.

### useWorkflowStatusStream

`useWorkflowStatusStream` subscribes to real-time node status updates during a workflow deployment run.

**Duplicate connection guard.** A module-level `activeConnections` `Set<string>` tracks which workflow IDs currently have an open SSE connection. Before opening a new connection, the hook checks this set. If the workflow ID is already present, the hook skips creating a second connection. This guards against React StrictMode's double-invocation of `useEffect`, which would otherwise create two simultaneous streams for the same workflow.

**Event types:**

| Event | Description |
|-------|-------------|
| `metadata` | Workflow-level context delivered on connect |
| `node_update` | Status update for a single node; triggers a map update |
| `workflow_sync` | Full snapshot of all node statuses; used for initial hydration and reconciliation |
| `error` | Error message from the server |
| `complete` | Workflow run has finished |

**NodeStatus interface.** Each `node_update` and `workflow_sync` event carries `NodeStatus` objects:

```ts
{
  state: string;           // e.g. "Running", "Pending", "Failed", "Succeeded"
  message: string;         // human-readable status detail
  replicas: number;
  readyReplicas: number;
  clusterIP: string;
  externalIP: string;
  nodePort: number;
}
```

**Return values.** The hook returns `nodeStatuses: Map<string, NodeStatus>`, `isConnected: boolean`, `error: string | null`, and a `reconnect()` function.

**Reconnect.** `RECONNECT_DELAY_MS = 3000`. Reconnection follows the same pattern as `useLogStream`.

### useTerminal

`useTerminal` provides an interactive terminal session using a WebSocket connection rather than SSE. This is the only streaming hook that uses WebSocket, because the terminal requires bidirectional communication (sending keystrokes to the server, receiving output back).

**Connection URL:** `GET /v1/api/resources/:id/exec/terminal?shell=bash&token=<jwt>`

The JWT is passed as a URL query parameter rather than a header. This is a browser limitation: the native `WebSocket` API does not allow setting custom headers, so the token must be embedded in the URL. The Core validates the token from the query string and immediately drops the connection if it is absent or invalid.

**Message types:**

| Type | Direction | Description |
|------|-----------|-------------|
| `metadata` | server → client | Session context (pod, container, namespace) delivered on connect |
| `output` | server → client | Terminal output to be written to the xterm.js instance |
| `error` | server → client | Error from the server, displayed in the terminal |
| `close` | server → client | Session has ended; the WebSocket is closed cleanly |

**Auto-reconnect.** The hook auto-reconnects on unexpected connection loss using the same 3-second delay as the SSE hooks, unless the connection was closed intentionally by the user (e.g., the terminal panel was unmounted or the user typed `exit`). An `intentionallyClosed` flag is set before calling `ws.close()` in the cleanup path to suppress reconnect attempts.
