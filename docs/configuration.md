# Configuration

## Environment Variables

The app reads environment variables from standard Next.js env files such as `.env.local`, `.env.production`, or the process environment in your deployment platform.

### Required Variables

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `SHORT_BASE_URL` | Canonical HTTP(S) origin for relative redirects and base URL stored in generated short-link records, for example `https://go.example.com` |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `AUTH0_SECRET` | Session encryption secret used by Auth0 middleware |
| `APP_BASE_URL` | Public base URL of this application, for example `https://go.example.com` |

### Optional Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry |
| `NEXT_PUBLIC_DASHBOARD_TIME_ZONE` | Time zone for statistics highlight dates, for example `America/New_York`. Defaults to `America/Los_Angeles`; invalid values use the default. |
| `OTEL_SERVICE_NAME` | Override the OpenTelemetry service name |
| `OTEL_RESOURCE_ATTRIBUTES` | Hosting and deployment attributes; `service.version` is read from the build artifact |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP exporter endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | OTLP exporter headers |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP exporter protocol |
| `OTEL_LOG_LEVEL` | OpenTelemetry log verbosity |
| `YO_BUILD_REVISION` | Optional full Git commit SHA supplied during the build, including Docker builds |

### Dashboard Time Zone

Statistics highlight dates use `en-US`, 12-hour time, and a short time zone label such as `PDT`. Set `NEXT_PUBLIC_DASHBOARD_TIME_ZONE` to a time zone supported by `Intl.DateTimeFormat` to change the zone. Next.js embeds this public variable in the browser bundle at build time, so changing it requires rebuilding and deploying the app. For Docker builds, pass `--build-arg NEXT_PUBLIC_DASHBOARD_TIME_ZONE=America/New_York`; a runtime-only environment value does not change the built dates.

### Telemetry Identity

For the production App Runner service, configure:

```env
OTEL_RESOURCE_ATTRIBUTES=cloud.provider=aws,cloud.platform=aws_app_runner,cloud.region=us-east-1,deployment.environment=production
```

Apply this through the service's deployment configuration. The current App Runner service uses API-managed settings, so adding `apprunner.yaml` would not change its environment. This repository has no AWS deployment workflow; the hosting setting needs a separate configuration update before rollout verification.

Hosting defaults to `unknown` unless `cloud.provider` is configured or the runtime identifies itself as Vercel. Local production builds do not imply AWS hosting.

`service.version` comes from `.next/BUILD_ID`, including standalone containers. Builds use `YO_BUILD_REVISION`, `GITHUB_SHA`, `VERCEL_GIT_COMMIT_SHA`, or the source checkout's Git commit when available. CI passes the commit to Docker as a build argument. Without a commit, Next generates an artifact ID; it identifies the build but does not identify its source commit. Runtime environment attributes cannot replace this value with a stale package version.

## Local Example

```env
MONGO_URI=mongodb://localhost:27017/yo
SHORT_BASE_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=replace-with-a-long-random-secret
```

## Auth0 Setup

The dashboard is protected. Public short-link resolution is not.

For local development, configure the Auth0 application with:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

For production, use the public base URL of the deployed app instead.
