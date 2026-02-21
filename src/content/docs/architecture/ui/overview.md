---
title: Overview
description: Project structure and page routing for the KubeOrch UI frontend.
---

The UI is a Next.js 15 application using the App Router, React Flow for the visual canvas, Zustand for state management, and shadcn/ui for the component library.

## Project Structure

```
ui/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (theme provider, fonts)
│   ├── page.tsx                  # Landing page (redirects to dashboard)
│   ├── login/page.tsx            # Login page
│   ├── signup/page.tsx           # Registration page
│   ├── auth/callback/page.tsx    # OAuth callback handler
│   ├── not-found.tsx             # 404 page
│   └── dashboard/
│       ├── layout.tsx            # Dashboard layout (sidebar, topbar)
│       ├── page.tsx              # Dashboard overview (stats, recent workflows)
│       ├── workflow/
│       │   ├── page.tsx          # Workflow list
│       │   ├── new/page.tsx      # Create new workflow
│       │   └── [id]/
│       │       ├── page.tsx      # Workflow canvas editor
│       │       └── compare/page.tsx  # Version diff comparison
│       ├── clusters/
│       │   ├── page.tsx          # Cluster list
│       │   ├── new/page.tsx      # Add cluster
│       │   └── [name]/edit/page.tsx  # Edit cluster
│       ├── resources/
│       │   ├── page.tsx          # Resource list
│       │   └── [id]/page.tsx     # Resource detail (logs, terminal, status)
│       ├── build/
│       │   ├── new/page.tsx      # Start new build
│       │   └── [id]/page.tsx     # Build detail with log streaming
│       ├── integrations/
│       │   ├── page.tsx          # Integrations overview
│       │   ├── plugins/page.tsx  # Plugin marketplace
│       │   └── registries/       # Container registry management
│       ├── monitoring/           # Metrics and alerts
│       ├── settings/page.tsx     # Admin settings
│       └── profile/page.tsx      # User profile
│
├── components/
│   ├── auth/                     # Login/register forms, OAuth provider icons
│   ├── layout/                   # AppLayout, Sidebar, TopBar, Breadcrumbs
│   ├── workflow/                 # Canvas and node components (core of the app)
│   │   ├── WorkflowCanvas.tsx    # Main React Flow canvas
│   │   ├── CommandPalette.tsx    # Quick-add resource palette (Cmd+K)
│   │   ├── NodeSettingsPanel.tsx # Side panel for editing node properties
│   │   ├── WorkflowSettingsPanel.tsx # Workflow-level settings
│   │   ├── YAMLEditor.tsx        # Monaco YAML preview
│   │   ├── MiniLogsPanel.tsx     # Inline log viewer
│   │   ├── CompareCanvas.tsx     # Side-by-side version comparison
│   │   ├── ImportDialog.tsx      # Docker Compose / Git import wizard
│   │   ├── ServiceDiagnosticsPanel.tsx  # Node health diagnostics
│   │   │
│   │   ├── DeploymentNode.tsx    # Deployment node component
│   │   ├── ServiceNode.tsx       # Service node component
│   │   ├── IngressNode.tsx       # Ingress node component
│   │   ├── ConfigMapNode.tsx     # ConfigMap node component
│   │   ├── SecretNode.tsx        # Secret node component
│   │   ├── PersistentVolumeClaimNode.tsx
│   │   ├── StatefulSetNode.tsx
│   │   ├── JobNode.tsx
│   │   ├── CronJobNode.tsx
│   │   ├── DaemonSetNode.tsx
│   │   ├── HPANode.tsx
│   │   ├── NetworkPolicyNode.tsx
│   │   ├── GenericPluginNode.tsx  # Dynamic plugin node renderer
│   │   │
│   │   ├── settings/             # Per-resource-type settings editors
│   │   │   ├── DeploymentSettings.tsx
│   │   │   ├── ServiceSettings.tsx
│   │   │   ├── IngressSettings.tsx
│   │   │   ├── ConfigMapSettings.tsx
│   │   │   ├── SecretSettings.tsx
│   │   │   ├── ... (one per resource type)
│   │   │   ├── EnvVarsEditor.tsx  # Reusable env var key-value editor
│   │   │   └── VolumeClaimTemplatesEditor.tsx
│   │   │
│   │   └── version/              # Version control UI
│   │       ├── VersionHistory.tsx
│   │       ├── VersionItem.tsx
│   │       ├── CreateVersionDialog.tsx
│   │       └── RestoreConfirmDialog.tsx
│   │
│   ├── clusters/                 # Cluster auth forms
│   ├── resources/                # Log viewer, terminal (xterm.js)
│   ├── registry/                 # Registry icons
│   ├── protectedroutes/          # Auth guard components
│   ├── providers/                # Theme provider
│   └── ui/                       # shadcn/ui base components (30+ components)
│
├── stores/                       # Zustand state management
│   ├── AuthStore.ts              # Auth state (token, user, persistence)
│   ├── WorkflowStore.ts          # Canvas state (node updates, secrets, env vars)
│   ├── ClusterStore.ts           # Cluster list, selection, status
│   ├── ResourcesStore.ts         # Deployed resource tracking
│   ├── PluginStore.ts            # Plugin catalog and enablement
│   ├── RegistryStore.ts          # Container registry state
│   ├── PanelStore.ts             # UI panel widths
│   └── SidebarStore.ts           # Sidebar folder open/close state
│
├── lib/
│   ├── api.ts                    # Axios instance with JWT interceptors
│   ├── constants.ts              # Shared constants
│   ├── utils.ts                  # Utility functions (cn, etc.)
│   │
│   ├── services/                 # API service functions
│   │   ├── workflow.ts           # Workflow CRUD, versions, runs
│   │   ├── cluster.ts            # Cluster management
│   │   ├── build.ts              # Container image builds
│   │   ├── import.ts             # Import analysis and conversion
│   │   ├── plugins.ts            # Plugin operations
│   │   ├── search.ts             # Global search
│   │   └── templates.ts          # Template metadata
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useBuildStream.ts     # SSE hook for build log streaming
│   │   ├── useImportStream.ts    # SSE hook for import progress
│   │   ├── useLogStream.ts       # SSE hook for pod log streaming
│   │   ├── useResourceStatusStream.ts  # SSE hook for resource status
│   │   ├── useWorkflowStatusStream.ts  # SSE hook for workflow execution
│   │   └── useTerminal.ts        # xterm.js terminal hook
│   │
│   ├── types/
│   │   ├── nodes.ts              # All node data type definitions (15+ types)
│   │   ├── auth.ts               # Auth types
│   │   └── registry.ts           # Registry types
│   │
│   └── utils/
│       └── errorHandling.ts      # Centralized error handling
│
└── hooks/                        # Top-level hooks
    ├── useCluster.ts
    ├── useClusterMetrics.ts
    └── use-mobile.ts
```

## Page Structure and Routing

The application uses the Next.js App Router. Routes are organized into public routes that do not require authentication and protected routes that are wrapped in the dashboard layout with an auth guard.

### Public Routes

| Route | Description |
|-------|-------------|
| `/login` | Email and OAuth login form |
| `/signup` | New account registration |
| `/auth/callback` | OAuth provider callback handler; exchanges the authorization code for a session token and redirects to the dashboard |

These routes are accessible without a valid session. The auth guard in `components/protectedroutes/` redirects authenticated users away from `/login` and `/signup` to prevent redundant sessions.

### Protected Routes

All routes under `/dashboard/*` are wrapped in `app/dashboard/layout.tsx`, which renders the sidebar, top bar, and breadcrumb components. The layout also applies the auth guard — unauthenticated requests are redirected to `/login`.

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview page with aggregate stats and recent workflow activity |
| `/dashboard/workflow` | Paginated list of all workflows with status badges |
| `/dashboard/workflow/new` | Wizard for creating a new workflow (blank or from template) |
| `/dashboard/workflow/[id]` | Full-screen workflow canvas editor; mounts `WorkflowCanvas.tsx` |
| `/dashboard/workflow/[id]/compare` | Side-by-side version diff using `CompareCanvas.tsx`; accepts `?from=<versionId>&to=<versionId>` query params |
| `/dashboard/resources/[id]` | Resource detail view with live log streaming (`useLogStream`) and an interactive terminal (`useTerminal`) in tabbed panels |
| `/dashboard/build/[id]` | Build detail page with real-time build log streaming via `useBuildStream` |
| `/dashboard/clusters` | Cluster list with connection status |
| `/dashboard/clusters/new` | Form to register a new cluster (kubeconfig or in-cluster) |
| `/dashboard/clusters/[name]/edit` | Edit an existing cluster's credentials or settings |
| `/dashboard/integrations/plugins` | Plugin marketplace with enable/disable controls |
| `/dashboard/integrations/registries` | Container registry management |
| `/dashboard/monitoring` | Cluster metrics and alert rules |
| `/dashboard/settings` | Admin-level application settings |
| `/dashboard/profile` | User profile, avatar, and password or OAuth provider details |
