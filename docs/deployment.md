# Deployment

## Docker

The Docker assets live under [`src/`](/Users/jonfairbanks/Documents/GitHub/yo/src).

### Compose

[`src/docker-compose.yml`](/Users/jonfairbanks/Documents/GitHub/yo/src/docker-compose.yml) expects an env file named `.env.development` in the same directory as the compose file.

From `src/`:

```sh
docker compose up --build
```

Compose builds the checked-out source instead of trusting a mutable registry tag. For a registry-based deployment, select a reviewed CI image by digest.

### Dockerfile

[`src/Dockerfile`](/Users/jonfairbanks/Documents/GitHub/yo/src/Dockerfile) uses a multi-stage build and relies on Next.js `standalone` output. The final container starts with:

```sh
node server.js
```

Expose port `3000` and provide the same environment variables described in [Configuration](/Users/jonfairbanks/Documents/GitHub/yo/docs/configuration.md).

## Reverse Proxies and TLS

Relative legacy destinations resolve against `SHORT_BASE_URL` (or `APP_BASE_URL`) using its HTTP(S) origin. Request `Host` and forwarding headers do not select the destination origin. Missing or invalid configuration returns HTTP 400 for a relative destination; absolute destinations keep working.

Both redirect routes share a process-wide budget of 10 requests/second, a burst of 20, and at most 10 concurrent resolutions. Excess requests return HTTP 429 with `Retry-After: 1` before database work. This bounds per-process work; configure an ingress rate limit across replicas for deployment-wide protection. One client can consume the shared budget, so the ingress should also apply per-client fairness using a trusted client address.

## MongoDB Indexes

The app expects MongoDB to maintain these operationally important indexes:

- unique `linkName`
- `lastAccess`
- `urlHits`
- `createdAt`
- compound sort helpers involving `linkName` for deterministic ordering

These are declared in the Mongoose schema and will be created according to your MongoDB/Mongoose index policy. In stricter production environments, you may want index creation handled through an explicit migration or rollout process instead of relying on application startup.

## Authentication Boundary

The dashboard and management APIs require Auth0 authentication. Public redirect routes do not.

This means your production deployment must expose:

- Auth0 callback handling
- public unauthenticated access to `/{slug}` and `/api/redirect/{slug}`

## Observability

The app emits:

- OpenTelemetry spans for API and Mongo operations
- JSON logs through Winston

If you deploy into an environment with OTLP collection, set the exporter-related environment variables described in [Configuration](/Users/jonfairbanks/Documents/GitHub/yo/docs/configuration.md).

OpenTelemetry admits at most five new traces per second per process, with a burst of ten. Child spans retain their local sampling decision; remote sampling flags cannot force recording. Each exporter queue holds at most 256 spans, with batches of 64 and a five-second export timeout. Public redirect spans omit aliases. Logs omit destination URLs, and error telemetry uses fixed messages rather than raw exception text or stacks.

## Retired Infrastructure

The legacy Lambda/API Gateway Terraform deployment and its scripts have been removed. Docker is the supported deployment path. Removing the source does not delete existing AWS resources or Terraform state.
