# Deployment

## Current Hosted Service

As verified on September 21, 2026, `fbnks.dev` points to the public AWS App Runner service `Yo-URL` in `us-east-1`. It builds `src/` from `develop` and deploys automatically after changes to that branch. Its build/start commands and environment are configured through the App Runner API, so repository configuration files do not update those settings automatically.

Before deploying per-IP limits, verify the immediate proxy address and forwarded-address chain, then configure `TRUSTED_PROXY_CIDRS` for only those proxy addresses. Without this setting, the socket peer is the identity, which groups visitors behind a proxy. App Runner documents source IPs in `X-Forwarded-For` for public endpoints; its private endpoints do not preserve the original address in that header. The exact running proxy chain remains to be verified.

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

Both redirect routes share a separate budget for each client IP: 10 requests/second, a burst of 20, and at most 10 concurrent resolutions per IP. One IP reaching its limit does not deny another IP. Requests over that IP's budget return HTTP 429 with `Retry-After: 1` before database work. The browser displays a rate-limit page with a retry button; the API retains its JSON error response. Neither 429 response may be cached.

By default, the client IP comes from the socket. `TRUSTED_PROXY_CIDRS` accepts comma-separated proxy IPs or CIDRs, for example `10.0.1.4/32`. Only an allowlisted socket peer can supply `X-Forwarded-For`. The app walks that chain from right to left through trusted proxies and stops at the first untrusted address. Forwarding headers from direct clients are ignored. Configure only actual proxy ranges, ensure those proxies append or replace the client address, and prevent direct access that bypasses the intended ingress. Invalid proxy configuration fails requests rather than silently trusting arbitrary headers.

IP budgets are local to each process. Visitors sharing a public IP share a budget; separate replicas do not share budgets. Up to 10,000 idle IP entries are retained, expiring after a minute or evicted oldest first. Active entries remain until their requests complete. Eviction and process restarts reset rate history. Use a trusted ingress or shared store if strict per-IP enforcement across replicas is required. This is not a platform-wide database-work cap.

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

App Runner IP forwarding reference: [AWS incoming networking documentation](https://docs.aws.amazon.com/apprunner/latest/dg/network-incoming.html#network-incoming.headers).
