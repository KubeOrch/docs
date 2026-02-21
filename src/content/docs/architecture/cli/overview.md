---
title: Overview
description: Tech stack, project structure, installation, and configuration for OrchCLI.
---

OrchCLI is a Go-based command-line tool that streamlines local development, testing, and contribution workflows for the KubeOrch platform. It manages Docker Compose environments, repository cloning, dependency installation, and service orchestration.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.22+ |
| CLI Framework | Cobra |
| Config Locking | gofrs/flock |
| Distribution | NPM (`@kubeorch/cli`), Go install, shell script |
| Orchestration | Docker Compose |
| Database | MongoDB 8.0 (via Docker) |

## Project Structure

```
cli/
├── main.go                  # Entry point
├── cmd/                     # Cobra command definitions
│   ├── root.go              # Root command + version info
│   ├── init.go              # Initialize environment (clone repos, install deps)
│   ├── start.go             # Start services (auto-detects mode)
│   ├── stop.go              # Stop services
│   ├── restart.go           # Restart services
│   ├── logs.go              # View service logs
│   ├── status.go            # Check service health
│   ├── exec.go              # Execute commands in containers
│   ├── debug.go             # Debug network connectivity
│   ├── config.go            # Configuration management (file-locked JSON)
│   ├── concurrent.go        # Parallel task execution engine
│   ├── utils.go             # Docker Compose detection, helpers
│   └── testing.go           # Test utilities
│
├── docker/                  # Docker Compose files for each mode
│   ├── docker-compose.prod.yml         # All services in Docker
│   ├── docker-compose.dev.yml          # Only MongoDB in Docker
│   ├── docker-compose.hybrid-ui.yml    # MongoDB + Core in Docker
│   └── docker-compose.hybrid-core.yml  # All in Docker (Core with mounted code)
│
├── tests/                   # Test suites
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── mocks/               # Mock implementations
│
├── npm/                     # NPM distribution wrapper
│   └── scripts/
│       ├── postinstall.js   # Downloads Go binary on npm install
│       └── prepack.js       # Prepares npm package
│
├── install.sh               # Universal shell installer
├── package.json             # NPM package config (@kubeorch/cli)
├── go.mod                   # Go module definition
├── Makefile                 # Build targets
└── docs/                    # Internal architecture docs
```

## Installation

```bash
# Via shell script (recommended)
curl -sfL https://raw.githubusercontent.com/KubeOrch/cli/main/install.sh | sh

# Via NPM
npm install -g @kubeorch/cli

# Via Go
go install github.com/kubeorch/cli@latest

# From source
git clone https://github.com/KubeOrch/cli && cd cli && make install
```

## Configuration System

OrchCLI persists project state in a JSON config file managed by `cmd/config.go`. The configuration is intentionally minimal and is designed to support multiple simultaneous projects on the same machine.

### File Location

The config file is located using a two-step fallback:

1. Attempt to write to the same directory as the `orchcli` binary itself.
2. If that directory is not writable (common when installed to a system path like `/usr/local/bin`), fall back to `~/.orchcli/orchcli-config.json`.

### File Locking

All reads and writes to the config file go through `github.com/gofrs/flock`. An exclusive file lock is acquired before any write operation and a shared lock before reads. This prevents data corruption if multiple `orchcli` processes run simultaneously (for example, if a user runs `orchcli start` in two terminals at the same time).

### Data Structures

The top-level structure is `OrchConfig`:

```go
type OrchConfig struct {
    Projects       map[string]*ProjectConfig
    CurrentProject string
}
```

Each entry in `Projects` is keyed by the absolute path of the project root and contains a `ProjectConfig`:

```go
type ProjectConfig struct {
    Path      string
    UIPath    string
    CorePath  string
    Mode      string
}
```

The `Mode` field stores one of four string values: `"production"`, `"development"`, `"ui-dev"`, or `"core-dev"`. This value is written by `orchcli init` and is used for display purposes. The actual runtime mode for `orchcli start` is re-derived from the filesystem state of `UIPath` and `CorePath`, not from this stored `Mode` string.

### Project Matching

`getCurrentProjectConfig()` iterates over the `Projects` map and compares each key against the current working directory. This means `orchcli` commands must be run from the project root directory (or a path that matches a stored project key) to locate the correct configuration. Commands run from an unrecognized directory will not find a project config and will fail or fall back to production mode.

The serialized config looks like this:

```json
{
  "projects": {
    "/path/to/project": {
      "path": "/path/to/project",
      "ui_path": "/path/to/project/ui",
      "core_path": "/path/to/project/core",
      "mode": "development"
    }
  },
  "current_project": "/path/to/project"
}
```
