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

Redirects use the final `X-Forwarded-For` address when present, otherwise the socket address. The ingress must replace this header or append the source IP as its final value. IPv4 and IPv6 addresses are normalized so equivalent forms share a rate limit; malformed client addresses return HTTP 400 before database work.

Relative legacy destinations resolve against `SHORT_BASE_URL` (or `APP_BASE_URL`) using its HTTP(S) origin. Request `Host` and forwarding headers do not select the destination origin. Missing or invalid configuration returns HTTP 400 for a relative destination; absolute destinations keep working.

Both redirect routes share a separate budget for each client IP: 10 requests/second, a burst of 20, and at most 10 concurrent resolutions per IP. One IP reaching its limit does not deny another IP. Requests over that IP's budget return HTTP 429 with `Retry-After: 1` before database work. The browser displays a rate-limit page with a retry button; the API retains its JSON error response. Neither 429 response may be cached.

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

The legacy Lambda/API Gateway Terraform deployment and its scripts have been removed. Docker is available for self-hosting. Removing the source does not delete existing AWS resources or Terraform state.
