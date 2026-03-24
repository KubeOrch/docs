---
title: Changelog
description: Release history and notable changes for KubeOrch.
---

All notable changes to KubeOrch are documented here. This project follows [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format.

## [0.0.3] - 2026-02-16

### Changed
- Renamed organization from KubeOrchestra to KubeOrch across all repositories
- Updated CLI package name to `@kubeorch/cli`
- Updated all internal references and documentation

### Fixed
- CLI linting issues: created constants for repeated strings

## [0.0.2] - 2026-02-16

### Added
- **MongoDB migration**: Migrated from PostgreSQL to MongoDB for all data storage
- MongoDB health checks in CLI status command
- Updated Docker Compose files for MongoDB

### Changed
- Database layer rewritten from PostgreSQL to MongoDB driver
- Configuration updated: `POSTGRES_*` env vars replaced with `MONGO_URI`

### Removed
- PostgreSQL dependency and all related configuration

## [0.0.1] - 2025-09-06

### Added
- **Core Backend**
  - Workflow management with visual nodes and edges
  - Workflow versioning and history
  - Workflow execution with Kubernetes deployment
  - Node diagnostics and auto-fix templates
  - Real-time status streaming via SSE
  - Multi-cluster Kubernetes management (5 auth methods)
  - Cluster health monitoring (60-second intervals)
  - 13+ Kubernetes resource templates
  - Built-in email/password authentication with bcrypt
  - OAuth2/OIDC support (GitHub, GitLab, Okta, Keycloak, Authentik)
  - JWT token-based auth with refresh tokens
  - Nixpacks container builds with ECR support
  - Docker Compose import and conversion
  - Plugin system with 13+ categories
  - Dashboard statistics API
  - AES-GCM encryption for sensitive data

- **UI Frontend**
  - Dashboard with stats and recent workflows
  - Visual workflow canvas with React Flow
  - 13 Kubernetes node types with settings panels
  - Workflow versioning and comparison
  - Docker Compose import wizard
  - Cluster management with token auth
  - Plugin marketplace
  - Registry management
  - Build monitoring with log streaming
  - Resource viewer with real-time logs and terminal (xterm.js)
  - OAuth login flow
  - Dark/light theme support

- **CLI (orchcli)**
  - `orchcli init` with 4 development modes
  - `orchcli start/stop/restart/logs/status/exec/debug` commands
  - Auto-dependency installation (Docker, Go, Node.js)
  - Concurrent operations with progress tracking
  - File locking for safe config access
  - Cross-platform binaries (darwin/linux/windows, amd64/arm64)
  - Published as `@kubeorch/cli` on npm

- **Documentation**
  - Astro + Starlight documentation site at docs.kubeorch.dev
  - Architecture documentation for all components
  - Getting started and quickstart guides
  - API reference
  - Cluster authentication guide

- **Community & Governance**
  - Apache 2.0 license
  - GOVERNANCE.md with maintainer selection and voting
  - CONTRIBUTING.md with DCO requirement
  - SECURITY.md with vulnerability disclosure policy
  - CODE_OF_CONDUCT.md (CNCF-based)
  - Issue and PR templates
  - CI/CD pipelines for all repositories

---

## Release Links

- [Core releases](https://github.com/KubeOrch/core/releases)
- [UI releases](https://github.com/KubeOrch/ui/releases)
- [CLI releases](https://github.com/KubeOrch/cli/releases)
