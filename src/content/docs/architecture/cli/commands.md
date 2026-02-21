---
title: Commands
description: Detailed breakdown of every orchcli command and how it works internally.
---

## Command Reference

| Command | Description | Key Flags |
|---------|-------------|-----------|
| `orchcli init` | Initialize environment | `--fork-ui`, `--fork-core`, `--skip-deps` |
| `orchcli start` | Start services | `-d` (detached/background) |
| `orchcli stop` | Stop services | `-v` (remove volumes) |
| `orchcli restart [service]` | Restart services | Target: `ui`, `core`, `mongodb` |
| `orchcli logs [service]` | View logs | `-f` (follow), `--tail N` |
| `orchcli status` | Health check | Shows container + DB status |
| `orchcli exec <service> [cmd]` | Run command in container | Services: `postgres`, `core`, `ui` |
| `orchcli debug` | Debug connectivity | Tests networks, containers, DB |

## Init Command in Depth

`orchcli init` is the entry point for setting up a KubeOrch environment. Its internal logic splits into two completely separate code paths depending on whether any `--fork-*` flags are provided.

### Production Path

When `orchcli init` is called with no flags, `setupProduction()` executes. This path:

1. Validates that Docker Compose is available via `validateDockerCompose()`.
2. Creates the local `docker/` and `scripts/` directories that will hold Compose files and helper scripts.
3. Saves a minimal `ProjectConfig` to the config file with `Mode: "production"` and no `UIPath` or `CorePath` set.
4. Prints the image tags that will be pulled at start time:
   - `ghcr.io/kubeorch/ui:latest`
   - `ghcr.io/kubeorch/core:latest`

No source code is cloned and no language runtimes need to be present on the host. Docker is the only hard requirement.

### Development Path

When any `--fork-ui` or `--fork-core` flag is present, `setupDevelopment(cloneUI, cloneCore)` executes instead. This path is more complex and involves several sequential phases before any concurrent work begins.

**Phase 1 - Prerequisite checks:** `checkPrerequisites()` verifies that both `git` and Docker Compose are available. Unlike the production path, git is mandatory because source code must be cloned.

**Phase 2 - Directory validation:** `validateAndCheckDirs()` checks that the target clone directories do not already exist. This prevents accidentally overwriting an existing workspace.

**Phase 3 - Concurrent repo cloning:** The actual clone operations are assembled as a list of `Task` structs and dispatched to `RunConcurrent(cloneTasks)`. If both `--fork-ui` and `--fork-core` are provided, the two `git clone` operations run in parallel goroutines with a shared progress display.

**Phase 4 - Fork and upstream configuration:** After each clone, `determineRepoURL()` is called for each repository. The logic is:

- If the provided repo identifier matches the default (`KubeOrch/ui` or `KubeOrch/core`) or is empty, the clone is treated as a direct clone of the official repo. No upstream remote is added.
- If the identifier is different (e.g., `my-org/ui`), the clone is treated as a personal fork. `setupUpstream()` is then called, which runs `git remote add upstream <official-repo-url>` followed by `git fetch upstream`. If an upstream remote already exists in the cloned repository, `setupUpstream()` uses `git remote set-url upstream` instead of `add` to avoid an error.

The `--fork-ui` and `--fork-core` flags use `NoOptDefVal`, which means passing the flag alone (e.g., `--fork-ui` with no value) defaults to `KubeOrch/ui`. Passing a value (e.g., `--fork-ui=my-org/ui`) uses that value as the repo identifier.

Repository identifiers are validated by `validateRepoFormat()` against the regex pattern `^[a-zA-Z0-9]([a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?/[a-zA-Z0-9]...` to enforce valid GitHub `owner/repo` format.

**Phase 5 - Concurrent dependency installation:** Unless `--skip-deps` is set, dependency tasks are assembled and dispatched to `RunConcurrent(depTasks)`:

- `installUIDependencies()`: checks for `npm`, auto-installs Node.js via `installNode()` if `--auto-install` is true (default), then runs `npm install` in the cloned UI directory.
- `installCoreDependencies()`: checks for `go`, auto-installs Go if `--auto-install` is true, then runs `go mod download` in the cloned Core directory.

Both tasks run concurrently when both repos are cloned.

### Init Flags Summary

| Flag | Default | Behavior |
|------|---------|----------|
| `--fork-ui` | `KubeOrch/ui` (when flag is present) | Clone UI repo; value sets fork owner/repo |
| `--fork-core` | `KubeOrch/core` (when flag is present) | Clone Core repo; value sets fork owner/repo |
| `--skip-deps` | false | Skip npm install and go mod download |
| `--auto-install` | true | Auto-install Node.js or Go if missing |

## Start Command in Depth

`orchcli start` does not accept flags that select the operating mode. The mode is determined entirely from the saved project configuration, not from command-line input.

### Mode Auto-Detection

On startup, `start.go` calls `getCurrentProjectConfig()` to load the config entry that matches the current working directory. It then evaluates two boolean conditions:

- `uiLocal`: `UIPath` is set in config AND that directory exists on disk.
- `coreLocal`: `CorePath` is set in config AND that directory exists on disk.

These two booleans form a 2x2 matrix that maps directly to a Compose file:

| `uiLocal` | `coreLocal` | Compose File | Mode Label |
|-----------|-------------|--------------|------------|
| false | false | `docker-compose.prod.yml` | production |
| true | true | `docker-compose.dev.yml` | development (both local) |
| true | false | `docker-compose.hybrid-ui.yml` | ui development |
| false | true | `docker-compose.hybrid-core.yml` | core development |

The mode is therefore a runtime consequence of which directories exist, not an explicit choice at start time. Moving or deleting a local repo directory will change which Compose file is selected on the next `orchcli start`.

### Docker Compose Command Detection

Before launching any Compose file, `getDockerComposeCommand()` determines the correct binary. It tries `docker compose` (the Docker CLI plugin syntax) first and falls back to the standalone `docker-compose` binary if the plugin is unavailable. The returned value is a string slice (`[]string{"docker", "compose"}` or `[]string{"docker-compose"}`) that is used to construct all subsequent subprocess calls.

### Detached Mode and Health Checking

The `-d` / `--detach` flag runs Docker Compose in the background. When this flag is set, after launching the Compose stack, `orchcli start` calls `waitForPostgres()` which polls for database readiness. It performs up to 30 retries and checks each of the following container names in sequence:

- `kubeorchestra-postgres`
- `kubeorchestra-postgres-dev`
- `kubeorchestra-postgres-hybrid`

Note: The container name references in `waitForPostgres` reflect legacy or planned naming from earlier development. The current stack uses MongoDB, not PostgreSQL, and the database container is accessed accordingly. The health check mechanism itself is unchanged.

## Debug Command

`orchcli debug` is a diagnostic tool for investigating connectivity problems in the local Docker environment. It does not modify any configuration or start any services. It performs the following checks in order:

1. **Network listing:** Queries Docker for all networks whose name contains `kubeorchestra`. This confirms that the Compose-created network exists and is named correctly.

2. **Container listing:** Lists all running containers whose name contains `kubeorchestra`. This gives a snapshot of which services are currently up without requiring `docker ps` knowledge.

3. **In-container DB connectivity test:** Executes a command inside the `core` container to test whether it can reach the `mongodb` service on port `27017`. The check uses `nc` (netcat) if available, falling back to `telnet`. This validates that the Docker internal DNS is resolving `mongodb` and that the port is reachable from the application container's network namespace.

4. **Direct mongosh ping:** Runs `mongosh --eval "db.adminCommand('ping')"` against the `mongodb` container directly. This confirms that the MongoDB process is healthy and accepting connections, independent of whether the Core service can reach it.

5. **Connection string hints:** Prints the connection strings that can be used for manual `mongosh` or driver-level debugging, so developers can connect directly without needing to know the exact container name or port mapping.

The debug command is intended to be run when `orchcli start` succeeds but the application is not behaving correctly, particularly for diagnosing MongoDB connectivity issues between containers.

## Concurrent Operations

OrchCLI uses a purpose-built concurrency engine in `cmd/concurrent.go` to run independent operations in parallel and display their progress.

### RunConcurrent

The core primitive is `RunConcurrent(tasks []Task)`. Each `Task` is a struct with a name and an `Action` field that holds a `func() error`. `RunConcurrent` launches each `Action` in its own goroutine, displays a progress indicator per task, waits for all goroutines to complete, and then calls `AggregateErrors(results)` to collect any non-nil errors into a combined error value that is returned to the caller.

This design means that if one task fails (for example, a network error during `git clone`), the other tasks in the batch still run to completion before the error is surfaced. The caller sees all errors at once rather than stopping at the first failure.

### What Gets Parallelized

`RunConcurrent` is used in two places within `orchcli init`:

**Repo cloning:** When both `--fork-ui` and `--fork-core` are provided, both `git clone` operations are dispatched as tasks. Since each clone hits a different remote repository and writes to a different local directory, there is no contention and both operations proceed fully in parallel. For a typical KubeOrch repo size, this roughly halves the time spent waiting for clones.

**Dependency installation:** After cloning, if `--skip-deps` is not set, `npm install` (for the UI) and `go mod download` (for Core) are dispatched as concurrent tasks. These operations are I/O-bound and independent, so running them in parallel reduces total setup time.

### Progress Display

Each task gets its own progress indicator that updates in real time. This gives users visibility into which operations are still running and which have completed, which is important given that clone and dependency install operations can take tens of seconds each.

## Auto-Installation

When `--auto-install` is enabled (the default), OrchCLI automatically installs missing language prerequisites before running dependency installation steps.

### How It Works

Before running `npm install`, `installUIDependencies()` checks whether `npm` is on the PATH. If it is not found and `--auto-install` is true, it calls `installNode()`. Similarly, before running `go mod download`, `installCoreDependencies()` checks for the `go` binary and calls `installGo()` if it is missing.

The auto-install functions use platform detection to choose the correct package manager:

- On Linux (Debian/Ubuntu): uses `apt-get`
- On macOS: uses `brew`

Docker and Docker Compose are explicitly excluded from auto-installation. Both tools require system-level permissions and daemon setup that cannot be reliably automated across all host configurations. If Docker is not present, `orchcli` will print an error and exit with instructions to install Docker manually.

The `startDockerDaemon()` utility in `utils.go` can attempt to start an already-installed but non-running Docker daemon by trying `systemctl start docker`, `service docker start`, and on macOS, `open -a Docker`. This covers the case where Docker is installed but not yet running, which is common on Linux hosts where the daemon is not set to start automatically.

### Auto-Installation Reference

| Dependency | Linux (Debian) | macOS |
|-----------|----------------|-------|
| Git | `apt-get install git` | `brew install git` |
| Node.js/npm | NodeSource LTS | `brew install node` |
| Go | `apt-get install golang-go` | `brew install go` |

Docker/Docker Compose must be installed manually as they require system-level setup.
