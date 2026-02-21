---
title: Workflow Engine
description: Execution pipeline, template system, and credential security for the KubeOrch workflow engine.
---

## Workflow Execution Pipeline

When a workflow is "run", the executor processes each node:

1. **Load workflow** from MongoDB with all nodes and edges
2. **Validate status** -- `ExecuteWorkflow()` rejects any workflow not in `published` status before creating a run record
3. **Resolve execution order** -- `getExecutionOrder()` performs a topological sort of nodes using the edge graph so that dependencies are applied before dependents
4. **Build connection graph** -- `buildConnectionGraph()` analyzes edges to extract wiring relationships. `getConnectedSourceData()` resolves concrete cross-node dependencies: Service-to-Deployment port mappings, Ingress-to-Service backend references, and HPA-to-Deployment scaling targets. These resolved values are injected into the template rendering context so that dependent resources are automatically configured to reference their actual counterparts by name
5. **Execute each node** via its type-specific handler:
   - `executeDeploymentNode`
   - `executeServiceNodeWithConnections`
   - `executeIngressNodeWithConnections`
   - `executeConfigMapNode`
   - `executeSecretNode`
   - `executePersistentVolumeClaimNode`
   - `executeStatefulSetNodeWithConnections`
   - `executeJobNode`
   - `executeCronJobNode`
   - `executeDaemonSetNode`
   - `executeHPANodeWithConnections`
   - `executeNetworkPolicyNodeWithConnections`
   - `executePluginNode`
6. **Per-node execution** -- each handler merges node `Data` with template `DefaultValues`, renders the YAML manifest through `TemplateEngine`, applies the manifest to the target cluster via `ManifestApplier`, then calls `updateNodeStatus` and `broadcastNodeUpdate` to stream the result to connected clients in real time
7. **Start resource watchers** for all deployed resources
8. **Stream status updates** via SSE as each resource becomes ready in the cluster

The executor also provides two maintenance operations:

- `CleanupWorkflowResources()` -- called when a workflow is archived; deletes all Kubernetes resources that were created by any run of that workflow
- `CleanupDeletedNodes()` -- called when a workflow canvas is saved; compares the current node set against the previous version and deletes Kubernetes resources for any nodes that were removed from the canvas

A background reconciliation function `SyncWorkflowStatuses()` periodically queries actual Kubernetes state and updates the MongoDB run status to match, handling cases where the API server state diverges from what the executor last recorded.

## Template System

Resource templates are stored as YAML files in `templates/core/`. Each resource type has:
- `metadata.yaml` -- Display name, description, category, default parameters
- `template.yaml` -- Go template that renders to a Kubernetes manifest

The `TemplateRegistry` (`pkg/template/registry.go`) loads all templates at startup and the `TemplateEngine` (`pkg/template/engine.go`) renders them with user-provided parameters.

The `TemplateMetadata` struct defines the full shape of a template's metadata:

```go
type TemplateMetadata struct {
    ID           string
    Name         string
    Description  string
    Category     string
    Tags         []string
    Parameters   []TemplateParameter
    DefaultValues map[string]interface{}
}

type TemplateParameter struct {
    Name        string
    Type        string
    Required    bool
    Default     interface{}
    Description string
    Options     []string  // For enum-type parameters
}
```

The registry is initialized once at startup via `InitializeGlobalRegistry()` and exposes filter methods `GetTemplatesByCategory` and `GetTemplatesByTag` for discovery endpoints.

When rendering, `RenderTemplate(templateID, values)` resolves the template file through three candidate paths in order:

1. `templateID/template.yaml` -- standard layout
2. `templateID/deployment.yaml` -- legacy layout for older templates
3. `templateID + ".yaml"` -- flat file layout

The template engine processes the resolved file using Go's `text/template` package with a custom `FuncMap` containing three functions:

- `default` -- returns a fallback value if the primary value is empty, enabling optional parameters with sensible defaults in templates
- `quote` -- wraps a string in double quotes, useful for YAML values that must be explicitly typed as strings
- `base64encode` -- base64-encodes a string value, used in Secret templates where Kubernetes expects base64-encoded data fields

## Credential Security

All cluster credentials are encrypted before storage:

```
User Input → AES-256-GCM Encrypt → MongoDB
MongoDB → AES-256-GCM Decrypt → client-go Config
```

Credentials are **never** returned in API responses after creation.
