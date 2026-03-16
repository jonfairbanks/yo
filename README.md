<h1 align="center">
  Yo - The URL Shortener
</h1>

Yo Dawg, heard you're tired of remembering URLs.

![Yo demo](images/yo.gif)

![Development CI](https://img.shields.io/github/actions/workflow/status/jonfairbanks/yo/docker-build-develop.yml?branch=develop&event=push&label=Development%20CI)
![Audit](https://img.shields.io/github/actions/workflow/status/jonfairbanks/yo/npm-audit.yml?event=pull_request&label=Audit)
![Lint](https://img.shields.io/github/actions/workflow/status/jonfairbanks/yo/npm-lint.yml?event=pull_request&label=Lint)
![Tests](https://img.shields.io/github/actions/workflow/status/jonfairbanks/yo/npm-test.yml?event=pull_request&label=Tests)
![GitHub top language](https://img.shields.io/github/languages/top/jonfairbanks/yo.svg)
![Docker Pulls](https://img.shields.io/docker/pulls/jonfairbanks/yo-client.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/jonfairbanks/yo.svg)
![License](https://img.shields.io/github/license/jonfairbanks/yo.svg?style=flat)

`Yo` is a single Next.js application for creating, managing, and resolving short links backed by MongoDB. Public short URLs resolve without authentication, while the dashboard and link-management APIs are protected with Auth0.

## Features

- Create, update, and delete short links
- Public redirect handling from `/{slug}` and `/api/redirect/{slug}`
- Dashboard views for all links, popular links, latest links, and usage stats
- MongoDB persistence
- Auth0-based login for the management UI
- OpenTelemetry hooks for tracing and logs

## Prerequisites

- Node.js 22
- npm
- MongoDB
- An Auth0 tenant/application for dashboard login

## Local Development

```sh
git clone https://github.com/jonfairbanks/yo.git
cd yo/src
npm install
```

Create `src/.env.local` for local development and add the values your environment needs.

### Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `SHORT_BASE_URL` | Base URL used when creating short-link records |
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Auth0 client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret |
| `AUTH0_SECRET` | Session encryption secret for `@auth0/nextjs-auth0` |

### Optional Environment Variables

| Variable | Purpose |
| --- | --- |
| `APP_BASE_URL` | Public base URL for the app, for example `http://localhost:3000` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry |
| `OTEL_SERVICE_NAME` | Override the OpenTelemetry service name |
| `OTEL_RESOURCE_ATTRIBUTES` | Additional OpenTelemetry resource attributes |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP exporter endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | OTLP exporter headers |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP exporter protocol |
| `OTEL_LOG_LEVEL` | OpenTelemetry log verbosity |

Start the development server:

```sh
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

For local Auth0 development, register:

- `http://localhost:3000/auth/callback` as an allowed callback URL
- `http://localhost:3000` as an allowed logout URL

## Available Scripts

Run these commands from `src/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the production app |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |
| `npm run fmt` | Check formatting with Prettier |
| `npm run fmt-fix` | Apply Prettier formatting |

## Docker

The Docker assets also live under `src/`.

```sh
cd src
docker compose up
```

`docker-compose.yml` reads `src/.env.development`, so create that file before starting the containerized app.

## Authentication and Routing

- `/` loads the authenticated dashboard
- `/{slug}` resolves public short links
- `/api/redirect/{slug}` resolves redirects through the API
- `/api/public/*` serves public assets that would otherwise conflict with slug routing

## Contributors

- [Jon Fairbanks](https://github.com/jonfairbanks/) - Maintainer
- [Brandon Sorgdrager](https://github.com/bsord/) - Contributor
