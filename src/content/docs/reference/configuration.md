---
title: Configuration Reference
description: All configuration options for the KubeOrch Core backend and UI frontend.
---

## Core Backend Configuration

The core backend is configured via a `config.yaml` file and/or environment variables. Viper is used for configuration loading with environment variable overrides.

### Core Settings

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `PORT` | `PORT` | `3000` | HTTP server port |
| `GIN_MODE` | `GIN_MODE` | `debug` | Gin mode (`debug`, `release`, `test`) |
| `LOG_LEVEL` | `LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |

### Database

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `MONGO_URI` | `MONGO_URI` | -- | MongoDB connection URI (required) |

The database name is extracted from the URI path. Defaults to `kubeorch` if not specified.

### Security

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `JWT_SECRET` | `JWT_SECRET` | -- | Secret key for JWT token signing (required) |
| `ENCRYPTION_KEY` | `ENCRYPTION_KEY` | -- | AES-256-GCM key for encrypting cluster credentials (required) |
| `TOKEN_REFRESH_MAX_AGE_DAYS` | `TOKEN_REFRESH_MAX_AGE_DAYS` | `7` | Max age for token refresh in days |

### URLs

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `BASE_URL` | `BASE_URL` | `http://localhost:3000` | Backend external URL (for OAuth callbacks) |
| `FRONTEND_URL` | `FRONTEND_URL` | `http://localhost:3001` | Frontend URL (for OAuth redirects) |

### Invite System

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `INVITE_CODE` | `INVITE_CODE` | -- | Registration invite code |
| `REGENERATE_INVITE_AFTER_SIGNUP` | `REGENERATE_INVITE_AFTER_SIGNUP` | `true` | Auto-regenerate invite code after each signup |

### Miscellaneous

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `TEMPLATES_DIR` | `TEMPLATES_DIR` | `./templates` | Path to K8s resource templates directory |
| `CLUSTER_LOG_TTL_HOURS` | `CLUSTER_LOG_TTL_HOURS` | `24` | How long to keep cluster connection logs |

### Authentication Configuration

Authentication is configured under the `AUTH` key in `config.yaml`.

#### Built-in Auth

```yaml
AUTH:
  BUILTIN:
    ENABLED: true               # Enable email/password login
    SIGNUP_ENABLED: true        # Enable registration form
    ALLOWED_DOMAINS:            # Restrict signup to specific email domains
      - "company.com"
```

#### OAuth/OIDC Providers

```yaml
AUTH:
  PROVIDERS:
    # OIDC provider (auto-discovers endpoints)
    - NAME: "authentik"                    # URL-safe slug
      DISPLAY_NAME: "Authentik SSO"        # Login button label
      TYPE: "oidc"
      ENABLED: true
      CLIENT_ID: "your-client-id"
      CLIENT_SECRET: "your-client-secret"
      ISSUER_URL: "https://auth.example.com/application/o/kubeorch/"
      SCOPES: ["openid", "profile", "email"]
      ICON: "lock"                         # Lucide icon name
      ALLOWED_DOMAINS: ["company.com"]     # (Optional) email domain filter
      CLAIM_MAPPINGS:                      # (Optional) non-standard claim names
        EMAIL: "email"
        NAME: "preferred_username"

    # OAuth2 provider (explicit endpoint URLs)
    - NAME: "github"
      DISPLAY_NAME: "GitHub"
      TYPE: "oauth2"
      ENABLED: true
      CLIENT_ID: "your-github-client-id"
      CLIENT_SECRET: "your-github-client-secret"
      AUTHORIZATION_URL: "https://github.com/login/oauth/authorize"
      TOKEN_URL: "https://github.com/login/oauth/access_token"
      USERINFO_URL: "https://api.github.com/user"
      SCOPES: ["user:email"]
      ICON: "github"
```

If the `AUTH` section is omitted entirely, only built-in email/password auth is enabled (default behavior).

At least one authentication method must be enabled -- the server will refuse to start if both built-in auth is disabled and no OAuth providers are configured.

## UI Frontend Configuration

The UI is configured via environment variables (`.env.local` file for local development).

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | -- | Core backend API URL (e.g., `http://localhost:3000/v1/api`) |

### Build Configuration

The UI uses:
- **Next.js 15** with Turbopack for development
- **Tailwind CSS v4** with PostCSS
- **Vitest** for testing
- **ESLint + Prettier** for linting and formatting

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 3001 (with Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server on port 3001 |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run tests with Vitest |
| `npm run test:coverage` | Run tests with coverage report |

## MongoDB Collections

The following collections are created automatically on startup:

| Collection | Indexes |
|-----------|---------|
| `users` | Unique on `email`; sparse compound on `auth_provider` + `provider_user_id` |
| `workflows` | -- |
| `workflow_versions` | Unique compound on `workflow_id` + `version`; compound on `workflow_id` + `created_at` |
| `workflow_runs` | -- |
| `oauth_states` | TTL index (10 min) on `created_at` |
| `oauth_codes` | TTL index (30 sec) on `created_at` |
| `dashboard_stats` | -- |

Additional collections (clusters, resources, registries, plugins, builds, import_sessions) are created by their respective repositories with indexes as needed.
