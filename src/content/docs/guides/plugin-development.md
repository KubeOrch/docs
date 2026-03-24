---
title: Plugin Development
description: How to create custom plugins for KubeOrch using CRD extensions.
---

KubeOrch supports a plugin system based on Kubernetes Custom Resource Definitions (CRDs). Plugins extend the platform with additional node types, integrations, and capabilities.

## Plugin Architecture

Plugins in KubeOrch are registered as CRD extensions. Each plugin:

- Defines a new node type that appears in the workflow canvas
- Specifies the Kubernetes resources it creates
- Provides configuration fields for the settings panel
- Belongs to a category for organization in the plugin marketplace

### Plugin Categories

KubeOrch supports 13+ plugin categories:

| Category | Description | Examples |
|----------|-------------|---------|
| `virtualization` | VM and container runtime | KubeVirt |
| `networking` | Network configuration | Cilium, Calico |
| `storage` | Storage provisioning | Rook-Ceph, Longhorn |
| `monitoring` | Observability and metrics | Prometheus, Grafana |
| `security` | Security and policy | Falco, OPA |
| `workflow` | Workflow orchestration | Argo Workflows |
| `database` | Database operators | CloudNativePG, MongoDB Operator |
| `messaging` | Message queues | RabbitMQ, Kafka |
| `backup` | Backup and recovery | Velero |
| `ci-cd` | CI/CD pipelines | Tekton |
| `ml` | Machine learning | Kubeflow |
| `policy` | Policy engines | Kyverno |
| `scaling` | Auto-scaling | KEDA |

## Plugin Structure

A plugin is defined as a JSON object with the following structure:

```json
{
  "name": "my-plugin",
  "display_name": "My Custom Plugin",
  "description": "Description of what this plugin does",
  "version": "1.0.0",
  "category": "monitoring",
  "icon": "chart-bar",
  "crd": {
    "group": "example.com",
    "version": "v1",
    "kind": "MyResource",
    "plural": "myresources"
  },
  "config_fields": [
    {
      "name": "replicas",
      "label": "Replicas",
      "type": "number",
      "default": 1,
      "required": true
    },
    {
      "name": "image",
      "label": "Container Image",
      "type": "string",
      "default": "myregistry/myimage:latest",
      "required": true
    },
    {
      "name": "enable_metrics",
      "label": "Enable Metrics",
      "type": "boolean",
      "default": true,
      "required": false
    }
  ],
  "template": "apiVersion: example.com/v1\nkind: MyResource\nmetadata:\n  name: {{.name}}\nspec:\n  replicas: {{.replicas}}\n  image: {{.image}}"
}
```

### Field Types

Plugin configuration fields support these types:

| Type | Description | UI Component |
|------|-------------|-------------|
| `string` | Text input | Text field |
| `number` | Numeric input | Number field |
| `boolean` | Toggle | Switch |
| `select` | Dropdown selection | Select with options |
| `textarea` | Multi-line text | Text area |
| `secret` | Sensitive value | Password field |

For `select` fields, add an `options` array:
```json
{
  "name": "storage_class",
  "label": "Storage Class",
  "type": "select",
  "options": ["standard", "premium-rwo", "premium-rwx"],
  "default": "standard"
}
```

## Creating a Plugin

### Step 1: Define the Plugin

Create a plugin definition JSON file:

```json
{
  "name": "redis-cluster",
  "display_name": "Redis Cluster",
  "description": "Deploy a Redis cluster using the Redis Operator",
  "version": "1.0.0",
  "category": "database",
  "icon": "database",
  "crd": {
    "group": "redis.redis.opstreelabs.in",
    "version": "v1beta2",
    "kind": "RedisCluster",
    "plural": "redisclusters"
  },
  "config_fields": [
    {
      "name": "cluster_size",
      "label": "Cluster Size",
      "type": "select",
      "options": ["3", "5", "7"],
      "default": "3",
      "required": true
    },
    {
      "name": "storage_size",
      "label": "Storage Size",
      "type": "string",
      "default": "1Gi",
      "required": true
    },
    {
      "name": "password",
      "label": "Redis Password",
      "type": "secret",
      "required": false
    }
  ],
  "template": "apiVersion: redis.redis.opstreelabs.in/v1beta2\nkind: RedisCluster\nmetadata:\n  name: {{.name}}\nspec:\n  clusterSize: {{.cluster_size}}\n  kubernetesConfig:\n    image: quay.io/opstree/redis:v7.0.12\n  storage:\n    volumeClaimTemplate:\n      spec:\n        accessModes: [\"ReadWriteOnce\"]\n        resources:\n          requests:\n            storage: {{.storage_size}}"
}
```

### Step 2: Register the Plugin

Use the KubeOrch API to register your plugin:

```bash
curl -X POST http://localhost:8080/v1/api/plugins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @redis-cluster-plugin.json
```

### Step 3: Enable the Plugin

Users can enable the plugin from the Integrations page or via API:

```bash
curl -X POST http://localhost:8080/v1/api/plugins/<plugin-id>/enable \
  -H "Authorization: Bearer <token>"
```

### Step 4: Use in Workflows

Once enabled, the plugin appears as a new node type in the workflow canvas. Users can drag it onto the canvas, configure it in the settings panel, and connect it to other nodes.

## Template Syntax

Plugin templates use Go template syntax. Available variables:

| Variable | Description |
|----------|-------------|
| `{{.name}}` | The node name from the workflow canvas |
| `{{.namespace}}` | Target deployment namespace |
| `{{.<field_name>}}` | Any config field defined in `config_fields` |

### Conditional Logic

```yaml
spec:
  {{if .enable_metrics}}
  metrics:
    enabled: true
  {{end}}
```

### Default Values

```yaml
spec:
  replicas: {{or .replicas 1}}
```

## Prerequisites

For a plugin's CRD to work, the corresponding operator must be installed on the target cluster. Document this in your plugin's description so users know what to install.

## Testing Plugins

1. Register the plugin on a development instance
2. Enable it and add to a workflow
3. Verify the settings panel shows all config fields correctly
4. Deploy to a test cluster and verify the generated Kubernetes resource
5. Check that the resource appears in KubeOrch's resource monitoring

## Best Practices

- **Version your plugins** — increment the version when changing config fields or templates
- **Validate inputs** — use `required: true` for essential fields and provide sensible defaults
- **Document prerequisites** — list any operators or CRDs that must be installed
- **Use meaningful categories** — helps users discover your plugin in the marketplace
- **Keep templates minimal** — only include fields that users need to configure; let the operator handle defaults
