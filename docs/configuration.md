# Configuration

## Environment Variables

The app reads environment variables from standard Next.js env files such as `.env.local`, `.env.production`, or the process environment in your deployment platform.

### Required Variables

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `SHORT_BASE_URL` | Base URL stored in generated short-link records, for example `https://go.example.com` |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `AUTH0_SECRET` | Session encryption secret used by Auth0 middleware |
| `APP_BASE_URL` | Public base URL of this application, for example `https://go.example.com` |

### Optional Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry |
| `OTEL_SERVICE_NAME` | Override the OpenTelemetry service name |
| `OTEL_RESOURCE_ATTRIBUTES` | Additional OpenTelemetry resource attributes |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP exporter endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | OTLP exporter headers |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP exporter protocol |
| `OTEL_LOG_LEVEL` | OpenTelemetry log verbosity |

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
