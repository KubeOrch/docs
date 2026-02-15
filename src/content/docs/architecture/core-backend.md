---
title: Core Backend Architecture
description: Deep dive into the Go backend - layers, services, and design patterns.
---

The core backend is a Go application built with the Gin web framework. It follows a layered architecture with clear separation between HTTP handlers, business logic services, data repositories, and infrastructure concerns.

## Project Structure

```
core/
├── main.go                    # Entry point - config, DB, router, graceful shutdown
├── config.yaml.example        # Configuration template
├── Dockerfile                 # Multi-stage Docker build
│
├── routes/
│   └── routes.go              # All API route definitions and middleware wiring
│
├── handlers/                  # HTTP request handlers (controllers)
│   ├── auth_handler.go        # Register, login, OAuth, profile
│   ├── workflow_handler.go    # CRUD + run + save workflows
│   ├── workflow_version_handler.go  # Version control operations
│   ├── cluster_handler.go     # Cluster CRUD + status + metrics
│   ├── build_handler.go       # Container image builds
│   ├── import_handler.go      # Docker Compose / Git import
│   ├── resources_handler.go   # K8s resource management + streaming
│   ├── registry_handler.go    # Container registry management
│   ├── plugin_handler.go      # CRD plugin management
│   ├── dashboard_handler.go   # Dashboard stats
│   ├── search_handler.go      # Global search
│   ├── settings_handler.go    # Admin settings (invite codes)
│   ├── diagnostics_handler.go # Node diagnostics and auto-fix
│   └── oauth_handler.go       # OAuth2/OIDC provider handlers
│
├── services/                  # Business logic layer
│   ├── auth_service.go        # Auth logic, JWT, password hashing
│   ├── workflow_service.go    # Workflow CRUD operations
│   ├── workflow_executor.go   # Workflow execution engine (nodes → K8s manifests)
│   ├── workflow_version_service.go  # Version control logic
│   ├── kubernetes_cluster_service.go # Cluster connection management
│   ├── cluster_health_monitor.go    # Background health checks (60s interval)
│   ├── build_service.go       # Nixpacks container image building
│   ├── import_service.go      # Import analysis and conversion
│   ├── docker_compose_parser.go     # Docker Compose file parsing
│   ├── git_service.go         # Git repository operations
│   ├── resource_service.go    # K8s resource tracking
│   ├── resource_watcher.go    # Real-time K8s resource monitoring
│   ├── resource_watcher_manager.go  # Manages multiple watchers
│   ├── resource_sync_monitor.go     # Periodic resource sync
│   ├── sse_broadcaster.go     # Unified SSE pub/sub system
│   ├── pod_log_stream_manager.go    # Pod log streaming
│   ├── registry_service.go    # Container registry operations
│   ├── plugin_service.go      # Plugin management
│   ├── search_service.go      # Cross-entity search
│   ├── user_service.go        # User management
│   ├── oauth_service.go       # OAuth2/OIDC flow handling
│   ├── dashboard_service.go   # Dashboard statistics
│   ├── layout_engine.go       # Auto-layout for imported nodes
│   ├── node_converter.go      # Import → workflow node conversion
│   ├── nixpacks_service.go    # Nixpacks build integration
│   ├── fix_templates.go       # Auto-fix templates for diagnostics
│   └── service_diagnostics.go # Service health diagnostics
│
├── models/                    # Data models (MongoDB documents)
│   ├── auth.go                # User, role definitions
│   ├── workflow.go            # Workflow, nodes, edges, versions, runs
│   ├── cluster.go             # Cluster, credentials, metadata
│   ├── build.go               # Build job definitions
│   ├── import.go              # Import analysis results
│   ├── import_session.go      # Async import session tracking
│   ├── resource.go            # Tracked K8s resources
│   ├── registry.go            # Container registry configs
│   ├── plugin.go              # Plugin definitions
│   ├── dashboard.go           # Dashboard stats snapshots
│   ├── cluster_metrics.go     # Cluster resource metrics
│   ├── oauth.go               # OAuth state and code models
│   └── user.go                # User model
│
├── repositories/              # Data access layer
│   ├── cluster_repository.go
│   ├── resource_repository.go
│   ├── registry_repository.go
│   ├── plugin_repository.go
│   ├── build_repository.go
│   └── import_repository.go
│
├── middleware/                # HTTP middleware
│   ├── auth_middleware.go     # JWT validation + admin check
│   ├── workflow_middleware.go # Workflow ownership verification
│   ├── logs_middleware.go     # Request/response logging
│   └── utils.go              # Middleware utilities
│
├── database/
│   └── mongodb.go             # MongoDB connection, collections, indexes
│
├── pkg/                       # Shared packages
│   ├── applier/
│   │   └── manifest_applier.go    # Applies K8s manifests to clusters
│   ├── encryption/
│   │   └── encryption.go          # AES-256-GCM credential encryption
│   ├── kubernetes/
│   │   ├── auth.go                # K8s auth config builders
│   │   ├── config.go              # K8s client configuration
│   │   └── connection.go          # K8s connection management
│   ├── template/
│   │   ├── engine.go              # Template rendering engine
│   │   └── registry.go            # Template registry (discovery + loading)
│   └── validator/
│       └── resource_validator.go  # Resource validation rules
│
├── templates/                 # Kubernetes resource templates
│   └── core/
│       ├── deployment/        # Deployment template + metadata
│       ├── service/           # Service template
│       ├── ingress/           # Ingress template
│       ├── configmap/         # ConfigMap template
│       ├── secret/            # Secret template
│       ├── statefulset/       # StatefulSet template
│       ├── job/               # Job template
│       ├── cronjob/           # CronJob template
│       ├── daemonset/         # DaemonSet template
│       ├── hpa/               # HPA template
│       ├── networkpolicy/     # NetworkPolicy template
│       └── persistentvolumeclaim/ # PVC template
│
└── utils/
    ├── config/
    │   └── config.go          # Viper-based configuration loading
    └── gravatar.go            # Gravatar URL generation
```

## Layered Architecture

```
┌──────────────────────────────────────────────────┐
│                   HTTP Layer                      │
│   routes/routes.go  →  handlers/*_handler.go      │
│   (Gin router)         (request/response)         │
├──────────────────────────────────────────────────┤
│                 Middleware Layer                   │
│   auth_middleware.go   workflow_middleware.go      │
│   (JWT validation)     (ownership checks)         │
├──────────────────────────────────────────────────┤
│                 Service Layer                     │
│   services/*_service.go                           │
│   (Business logic, orchestration)                 │
├──────────────────────────────────────────────────┤
│                Repository Layer                   │
│   repositories/*_repository.go                    │
│   (MongoDB CRUD operations)                       │
├──────────────────────────────────────────────────┤
│              Infrastructure Layer                 │
│   database/mongodb.go    pkg/kubernetes/*         │
│   pkg/encryption/*       pkg/template/*           │
│   (DB, K8s, crypto)      (Template engine)        │
└──────────────────────────────────────────────────┘
```

## Key Design Patterns

### Singleton Services

Several services use singleton patterns with `sync.Once` for thread-safe initialization:

- `SSEBroadcaster` -- Single pub/sub hub for all real-time streams
- `ResourceWatcherManager` -- Centralized K8s watcher lifecycle management
- `ClusterHealthMonitor` -- Background health check loop

### Template System

Resource templates are stored as YAML files in `templates/core/`. Each resource type has:
- `metadata.yaml` -- Display name, description, category, default parameters
- `template.yaml` -- Go template that renders to a Kubernetes manifest

The `TemplateRegistry` loads all templates at startup and the `TemplateEngine` renders them with user-provided parameters.

### Workflow Execution Pipeline

When a workflow is "run", the executor processes each node:

1. **Load workflow** from MongoDB with all nodes and edges
2. **Resolve connections** -- determine dependency order from edges
3. **For each node**, based on its type:
   - Merge node data with template defaults
   - Render the Kubernetes manifest YAML using the template engine
   - Apply the manifest to the target cluster via `ManifestApplier`
4. **Start resource watchers** for deployed resources
5. **Stream status updates** via SSE as each resource becomes ready

### Credential Security

All cluster credentials are encrypted before storage:

```
User Input → AES-256-GCM Encrypt → MongoDB
MongoDB → AES-256-GCM Decrypt → client-go Config
```

Credentials are **never** returned in API responses after creation.

## Startup Sequence

```
main.go
  ├── config.Load()                    # Load config.yaml + env vars via Viper
  ├── Validate auth configuration      # At least one auth method must be enabled
  ├── database.Connect()               # Connect to MongoDB, create indexes
  ├── template.InitializeGlobalRegistry()  # Load K8s resource templates
  ├── routes.SetupRouter()             # Configure Gin routes + middleware
  ├── ClusterHealthMonitor.Start()     # Start background health checks
  ├── GetSSEBroadcaster()              # Initialize SSE pub/sub system
  ├── srv.ListenAndServe()             # Start HTTP server
  └── Graceful Shutdown                # Stop watchers, SSE, health monitor, DB
```

## Graceful Shutdown

The server handles `SIGINT` and `SIGTERM` signals with ordered cleanup:

1. Stop all resource watchers
2. Close SSE broadcaster (disconnect all clients)
3. Stop health monitor
4. Shutdown HTTP server (10s deadline)
5. Close MongoDB connection
