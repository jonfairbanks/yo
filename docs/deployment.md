# Deployment

## Docker

The Docker assets live under [`src/`](/Users/jonfairbanks/Documents/GitHub/yo/src).

### Compose

[`src/docker-compose.yml`](/Users/jonfairbanks/Documents/GitHub/yo/src/docker-compose.yml) expects an env file named `.env.development` in the same directory as the compose file.

From `src/`:

```sh
docker compose up
```

Notes:

- the compose file currently uses the published image `jonfairbanks/yo-api`
- the local `build:` block is commented out
- if you want to build from this checkout instead of pulling the published image, uncomment the `build` section and remove or override `image`

### Dockerfile

[`src/Dockerfile`](/Users/jonfairbanks/Documents/GitHub/yo/src/Dockerfile) uses a multi-stage build and relies on Next.js `standalone` output. The final container starts with:

```sh
node server.js
```

Expose port `3000` and provide the same environment variables described in [Configuration](/Users/jonfairbanks/Documents/GitHub/yo/docs/configuration.md).

## Reverse Proxies and TLS

Redirect URL construction uses request headers to determine protocol for relative destinations. In production, your proxy or ingress should forward the correct scheme, especially:

- `X-Forwarded-Proto: https`

If this header is missing in a TLS-terminated deployment, relative redirect targets may be reconstructed with `http` instead of `https`.

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
