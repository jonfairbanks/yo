# Runtime Behavior

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Authenticated management dashboard |
| `/{slug}` | Public short-link redirect |
| `/api` | Authenticated paginated list API |
| `/api/create` | Authenticated create API |
| `/api/update` | Authenticated update API |
| `/api/delete` | Authenticated delete API |
| `/api/latest` | Authenticated latest-links API |
| `/api/popular` | Authenticated popular-links API |
| `/api/stats` | Authenticated stats API |
| `/api/redirect/{slug}` | Public API redirect path |

## Reserved Paths

Short links cannot use application or framework paths. The reserved-route policy currently protects:

- exact paths: `api`, `auth`, `_next`, `browserconfig.xml`, `favicon.ico`, `manifest.json`, `robots.txt`, `sitemap.xml`
- prefixes: `api/`, `auth/`, `_next/`, `images/`, `vendor/`

Avoid importing or creating slugs that collide with those paths.

## Redirect Semantics

The app supports both:

- public redirects at `/{slug}`
- API redirects at `/api/redirect/{slug}`

Redirect resolution:

- normalizes the incoming slug
- loads the alias from MongoDB
- blocks self-referential redirect loops
- increments `urlHits` and updates `lastAccess` only after the redirect target is validated

## Search Semantics

The dashboard list API currently uses:

- case-insensitive substring search
- regex matching across `linkName` and `originalUrl`
