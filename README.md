# KubeOrch Docs

[![Apache 2.0 License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Cloud Native](https://img.shields.io/badge/Cloud%20Native-orange.svg)](https://landscape.cncf.io/)
[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

Documentation site for the [KubeOrch](https://github.com/KubeOrch) platform — a visual drag-and-drop tool for designing and deploying Kubernetes workflows.

**Live site:** [docs.kubeorch.dev](https://docs.kubeorch.dev)

## What's Inside

- **Getting Started** — Introduction and quickstart guide
- **Architecture** — Ecosystem overview, core backend, UI frontend, CLI, and data flow
- **Guides** — Cluster authentication, workflow lifecycle, importing projects
- **API Reference** — REST API, data models, and configuration

## Related Repositories

| Repository | Description |
|-----------|-------------|
| [core](https://github.com/KubeOrch/core) | Go backend — REST API, K8s integration, workflow execution |
| [ui](https://github.com/KubeOrch/ui) | Next.js frontend — visual canvas, dashboard, real-time streaming |
| [cli](https://github.com/KubeOrch/cli) | Developer CLI — local environment orchestration via Docker Compose |

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:4321/`.

## License

[Apache 2.0](LICENSE)
