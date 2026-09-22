# Deployment

## Current Hosted Service

As verified on September 21, 2026, `fbnks.dev` points to the public AWS App Runner service `Yo-URL` in `us-east-1`. It builds `src/` from `develop` and deploys automatically after changes to that branch. Its build/start commands and environment are configured through the App Runner API, so repository configuration files do not update those settings automatically.

The service already runs `npm start`. That command now selects `start:apprunner`, which sets `YO_CLIENT_IP_SOURCE=apprunner` before starting Next.js. The next deployment of this source therefore enables App Runner identity without changing AWS environment variables or configuring internal proxy CIDRs.

App Runner mode is for this public endpoint with DNS pointing directly to App Runner. It uses the rightmost `X-Forwarded-For` address and never falls back to a shared internal socket address. Missing or malformed identity returns HTTP 400 before database work. AWS documents source-IP preservation in this header, but does not specify its treatment of pre-existing header values. The adapter assumes the managed ingress replaces the header with the source address or appends that address. Unit tests verify the adapter's policy; the live forwarding behavior must still be checked after deployment. Reassess the policy before introducing CloudFront, another proxy, or a private App Runner endpoint.

For direct Node hosting, use `npm run start:direct`. Local development and the standalone Docker entrypoint default to socket identity. Do not use `npm start` or `start:apprunner` on a directly exposed server, where forwarding headers are client-controlled.

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

`YO_CLIENT_IP_SOURCE` accepts `socket` (default) or `apprunner`. Socket mode ignores forwarding headers. App Runner mode validates the forwarded IP list, normalizes IPv4/IPv6, and uses its final address. The source mode is chosen by server startup configuration, never a request header. An invalid mode fails requests rather than silently changing the trust policy. `TRUSTED_PROXY_CIDRS` is not used.

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
