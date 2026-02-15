---
title: Data Flow
description: End-to-end data flows for key operations in the KubeOrch platform.
---

This page traces the data flow through the entire system for the most important user operations.

## Workflow Creation and Deployment

This is the primary flow -- a user creates a visual workflow and deploys it to Kubernetes.

### Phase 1: Design

```
┌─────────┐     ┌────────────────────┐     ┌──────────────┐
│  User    │     │   UI (Canvas)       │     │   Core API    │
│          │     │                     │     │               │
│ 1. Create│────►│ POST /workflows     │────►│ Save to       │
│ workflow │     │ { name, cluster_id }│     │ MongoDB       │
│          │◄────│ { id, status:draft }│◄────│               │
│          │     │                     │     │               │
│ 2. Drag  │────►│ Add node to React   │     │               │
│ nodes    │     │ Flow canvas (local) │     │               │
│          │     │                     │     │               │
│ 3. Draw  │────►│ Add edge between    │     │               │
│ edges    │     │ nodes (local)       │     │               │
│          │     │                     │     │               │
│ 4. Edit  │────►│ NodeSettingsPanel   │     │               │
│ settings │     │ updates node.data   │     │               │
│          │     │                     │     │               │
│ 5. Save  │────►│ POST /workflows/:id │────►│ Update nodes, │
│          │     │ /save { nodes,edges}│     │ edges in DB   │
└─────────┘     └────────────────────┘     └──────────────┘
```

### Phase 2: Deploy

```
┌─────────┐     ┌──────────────┐     ┌───────────────────┐     ┌──────────┐
│  User    │     │   UI          │     │   Core             │     │ K8s      │
│          │     │               │     │                    │     │ Cluster  │
│ Click    │────►│ POST          │────►│ 1. Create version  │     │          │
│ "Run"    │     │ /workflows/   │     │    snapshot         │     │          │
│          │     │ :id/run       │     │                    │     │          │
│          │     │               │     │ 2. For each node:  │     │          │
│          │     │               │     │    a. Load template │     │          │
│          │     │               │     │    b. Merge data    │     │          │
│          │     │               │     │    c. Render YAML   │     │          │
│          │     │               │     │    d. Apply to K8s ─┼────►│ Create   │
│          │     │               │     │                    │     │ resource │
│          │     │               │     │ 3. Start watchers  │◄────┤ Status   │
│          │     │               │     │    for resources   │     │ events   │
│          │     │               │     │                    │     │          │
│ See live │◄────│ SSE stream    │◄────│ 4. Publish status  │     │          │
│ updates  │     │ node_update   │     │    via SSE         │     │          │
│          │     │ events        │     │    broadcaster     │     │          │
└─────────┘     └──────────────┘     └───────────────────┘     └──────────┘
```

### Node-to-Manifest Transformation

Each visual node is converted to a Kubernetes manifest through the template system:

```
Canvas Node                    Template Engine               Kubernetes
─────────────                  ───────────────               ──────────
{                              templates/core/
  type: "deployment"           deployment/template.yaml
  data: {                         ↓ Go template rendering
    name: "web-app"         →  apiVersion: apps/v1       →  kubectl apply
    image: "nginx:1.25"        kind: Deployment
    replicas: 3                metadata:
    port: 80                     name: web-app
  }                            spec:
}                                replicas: 3
                                 template:
                                   spec:
                                     containers:
                                     - name: web-app
                                       image: nginx:1.25
                                       ports:
                                       - containerPort: 80
```

## Docker Compose Import Flow

Users can import existing Docker Compose files to auto-generate workflow nodes.

```
┌─────────┐     ┌──────────────┐     ┌───────────────────────────────────┐
│  User    │     │   UI          │     │   Core                            │
│          │     │               │     │                                   │
│ Upload   │────►│ POST          │────►│ 1. Parse docker-compose.yml       │
│ file or  │     │ /import/      │     │    (docker_compose_parser.go)     │
│ paste URL│     │ analyze       │     │                                   │
│          │     │               │     │ 2. For each service:              │
│          │     │               │     │    - Create Deployment node       │
│          │     │               │     │    - Create Service node if ports │
│          │     │               │     │    - Create ConfigMap for env     │
│          │     │               │     │    - Create PVC for volumes       │
│          │     │               │     │    (node_converter.go)            │
│          │     │               │     │                                   │
│          │     │               │     │ 3. Auto-layout nodes              │
│          │     │               │     │    (layout_engine.go)             │
│          │     │               │     │                                   │
│          │     │               │     │ 4. Generate edges from            │
│ Preview  │◄────│ Show import   │◄────│    depends_on relationships      │
│ & adjust │     │ preview with  │     │                                   │
│          │     │ suggested     │     │                                   │
│          │     │ nodes/edges   │     │                                   │
│          │     │               │     │                                   │
│ Apply    │────►│ POST          │────►│ 5. Merge nodes into workflow      │
│          │     │ /import/apply │     │    or create new workflow          │
└─────────┘     └──────────────┘     └───────────────────────────────────┘
```

For Git repository imports, the flow includes an async step where the core clones the repo, detects the compose file, and streams progress via SSE.

## Container Build Flow

Users can build container images from Git repositories using Nixpacks.

```
┌─────────┐     ┌──────────────┐     ┌────────────────────┐     ┌──────────┐
│  User    │     │   UI          │     │   Core              │     │ Registry │
│          │     │               │     │                     │     │          │
│ Start    │────►│ POST          │────►│ 1. Clone repo       │     │          │
│ build    │     │ /builds/start │     │    (git_service)     │     │          │
│          │     │               │     │                     │     │          │
│          │     │ SSE stream    │◄────│ 2. Build with        │     │          │
│ See live │◄────│ useBuildStream│     │    Nixpacks           │     │          │
│ logs     │     │ hook          │     │    (nixpacks_service) │     │          │
│          │     │               │     │                     │     │          │
│          │     │               │◄────│ 3. Push image       ─┼────►│ Store    │
│ Done     │◄────│ Build complete│     │    to registry       │     │ image    │
└─────────┘     └──────────────┘     └────────────────────┘     └──────────┘
```

Build status progresses: `pending → cloning → building → pushing → completed/failed`

## Authentication Flow

### Built-in Email/Password

```
┌─────────┐     ┌──────────────┐     ┌────────────────────┐     ┌──────────┐
│  User    │     │   UI          │     │   Core              │     │ MongoDB  │
│          │     │               │     │                     │     │          │
│ Register │────►│ POST          │────►│ 1. Validate input   │     │          │
│          │     │ /auth/register│     │ 2. Hash password    │     │          │
│          │     │               │     │    (bcrypt cost 12) │     │          │
│          │     │               │     │ 3. Check if first   │────►│ Count    │
│          │     │               │     │    user (→ admin)   │◄────│ users    │
│          │     │               │     │ 4. Save user        │────►│ Insert   │
│          │     │               │     │ 5. Generate JWT     │     │          │
│ Logged   │◄────│ Store token   │◄────│    (24h expiry)     │     │          │
│ in       │     │ in AuthStore  │     │                     │     │          │
└─────────┘     └──────────────┘     └────────────────────┘     └──────────┘
```

### OAuth2/OIDC Flow

```
┌─────────┐     ┌──────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  User    │     │  UI   │     │  Core     │     │ Provider   │     │ MongoDB  │
│          │     │       │     │           │     │ (GitHub,   │     │          │
│ Click    │────►│       │────►│ Generate  │     │  Authentik)│     │          │
│ "Login   │     │       │     │ state +   │────►│            │     │          │
│ with X"  │     │       │     │ redirect  │     │            │     │          │
│          │     │       │     │           │     │            │     │          │
│ Consent  │◄───────────────────────────────────│ Auth page  │     │          │
│          │────►│       │     │           │◄────│ Callback   │     │          │
│          │     │       │     │           │     │ with code  │     │          │
│          │     │       │     │ Exchange  │────►│ Token      │     │          │
│          │     │       │     │ code for  │◄────│ endpoint   │     │          │
│          │     │       │     │ user info │────►│ Userinfo   │     │          │
│          │     │       │     │           │◄────│ endpoint   │     │          │
│          │     │       │     │ Create/   │────►│            │     │ Upsert   │
│          │     │       │     │ link user │     │            │     │ user     │
│          │     │       │◄────│ Redirect  │     │            │     │          │
│ Logged   │◄────│ Token │     │ with code │     │            │     │          │
│ in       │     │       │────►│ Exchange  │     │            │     │          │
│          │     │ Store │◄────│ → JWT     │     │            │     │          │
└─────────┘     └──────┘     └──────────┘     └───────────┘     └──────────┘
```

## Real-Time Resource Monitoring

After deployment, the core maintains active watchers on Kubernetes resources:

```
┌────────────────┐     ┌──────────────────────┐     ┌───────────────┐
│ K8s API Server │     │ Core                  │     │ UI             │
│                │     │                       │     │                │
│   Watch API    │────►│ ResourceWatcher       │     │                │
│   (streaming)  │     │   ├── Deployment watch│     │                │
│                │     │   ├── Pod watch       │     │                │
│                │     │   └── Service watch   │     │                │
│                │     │         │              │     │                │
│   Event:       │────►│   Parse event         │     │                │
│   Pod Ready    │     │         │              │     │                │
│                │     │   ResourceWatcher     │     │                │
│                │     │   Manager             │     │                │
│                │     │         │              │     │                │
│                │     │   SSEBroadcaster      │     │                │
│                │     │   .Publish({          │────►│ EventSource    │
│                │     │     type: "resource"  │     │ onmessage      │
│                │     │     data: { status,   │     │   → update     │
│                │     │       replicas, ... } │     │     node state │
│                │     │   })                  │     │     on canvas  │
└────────────────┘     └──────────────────────┘     └───────────────┘
```

## Version Control Flow

Workflows support git-like versioning:

```
Save Workflow → Auto-increment version → Store snapshot in workflow_versions collection
                                          │
                                          ├── Compare: GET /versions/compare?v1=1&v2=3
                                          │   → Returns NodeDiff[] and EdgeDiff[]
                                          │   → UI shows side-by-side CompareCanvas
                                          │
                                          └── Restore: POST /versions/:v/restore
                                              → Creates new version with old content
                                              → Updates workflow.nodes and workflow.edges
```

Each version stores a complete snapshot of nodes and edges, enabling full rollback and diff comparison.
