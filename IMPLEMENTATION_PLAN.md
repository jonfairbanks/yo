# Multi-Phase Implementation Plan

## Summary

This roadmap addresses the shortcomings identified in `ARCHITECTURE_REVIEW.md` using an incremental hardening approach. It preserves public short-link routing at `/{slug}`, keeps the current monolith in place, and sequences work so correctness and upgrade risk are resolved before deeper refactors.

Each phase should be treated as independently shippable. Do not start a later phase until the prior phase exit criteria are met.

## Implementation Changes

### Phase 1: Correctness and Build Stability

Objective: remove the two confirmed correctness issues and stabilize the dependency/build baseline.

Changes:

- Refactor redirect resolution so alias lookup and redirect-loop validation happen before any `urlHits` or `lastAccess` mutation.
- Update alias creation to rely on the Mongo unique index for `linkName` and return `409` on duplicate-key conflicts instead of `500`.
- Audit and resolve the current Next.js, React, and Auth0 compatibility warning reported during `npm run build`, preferring supported forward upgrades and avoiding downgrades unless there is no viable supported alternative.
- Add regression tests for blocked redirects and duplicate alias creation conflicts.
- Preserve all existing public routes and payload shapes except the conflict path for duplicate create requests.

Acceptance criteria:

- Blocked redirects do not increment counters or update `lastAccess`.
- Duplicate alias create conflicts return `409` consistently.
- `npm run build` completes without the current Auth0/React warning.

Exit criteria:

- `npm run lint`, `npm test -- --runInBand`, and `npm run build` all pass cleanly.
- New regression tests cover the fixed correctness cases.

### Phase 2: API Layer Consolidation

Objective: remove duplicated backend behavior and introduce clean internal boundaries without changing the public API surface.

Changes:

- Migrate `create`, `update`, and `delete` onto the same API wrapper pattern used by the read endpoints.
- Introduce a thin application layer with explicit use cases:
  - `createAlias`
  - `updateAlias`
  - `deleteAlias`
  - `resolveAlias`
  - `listAliases`
  - `getLatestAliases`
  - `getPopularAliases`
  - `getStats`
- Introduce a repository layer for Mongo queries so route handlers stop owning query logic directly.
- Centralize request validation, alias normalization, and reserved-path checks in shared validation/schema utilities.
- Standardize logging fields and span naming across all API routes.

Internal interface changes:

- Add internal `services`, `repositories`, and validation/schema modules.
- Keep route handlers as HTTP adapters only.
- Do not add new external endpoints in this phase.

Acceptance criteria:

- All API routes use the same method/auth/error wrapper behavior.
- Business rules are testable without Next.js request/response mocks.
- Logs and spans expose stable fields across CRUD and redirect flows.

Exit criteria:

- CRUD and read endpoints all use a shared route pattern.
- Shared business rules are no longer duplicated across handlers.

### Phase 3: Frontend Stabilization

Objective: replace imperative UI control flow with React-native state management while preserving the current dashboard behavior.

Changes:

- Replace Materialize-driven modal lifecycle code with React-native dialog/modal components.
- Remove `document.getElementById`, `querySelectorAll`, and manual instance lifecycle control from create/update flows.
- Replace `window.confirm` delete/update confirmations with controlled React confirmation UI.
- Introduce a shared client data layer for dashboard reads and mutations.
- Standardize loading, error, and mutation-success behavior across all tabs.
- Preserve the current dashboard IA, Materialize-inspired look and feel, existing theme colors, and root-level slug behavior while allowing implementation changes that materially improve maintainability, accessibility, or UX.

Internal interface changes:

- Frontend data access should flow through one shared API/query layer.
- Modal and confirmation behavior should be driven by React state only.

Acceptance criteria:

- Create/update/delete flows work without imperative DOM hooks.
- Dashboard tabs use one consistent fetching and refresh model.
- Accessibility behavior for open, close, focus trap, and confirmation is covered by tests.

Exit criteria:

- No dashboard interaction depends on Materialize instance setup.
- Mutations refresh the UI through shared state/query invalidation instead of bespoke local effects.

### Phase 4: Routing and Asset Complexity Reduction

Objective: reduce framework friction caused by the root catch-all route while keeping `/{slug}` as the public short-link format.

Changes:

- Keep public short links at `/{slug}`.
- Rework asset delivery so static/public assets return to framework-native handling where possible.
- Narrow and document the reserved-path policy for framework, auth, and application routes.
- Review middleware matching and auth interactions to ensure root slug resolution does not interfere with app infrastructure routes.
- Add integration coverage for public assets, auth paths, reserved paths, and root alias resolution.

Internal/public interface changes:

- Public short-link routing remains unchanged.
- Asset handling should move away from the general-purpose `/api/public/*` shim wherever technically feasible.
- Reserved-route rules become a documented policy, not just a helper implementation.

Acceptance criteria:

- Static assets no longer depend on a generic API proxy unless a documented constraint requires it.
- Reserved-path behavior is explicit and tested.
- New app routes can be added without ad hoc alias-collision fixes.

Exit criteria:

- Asset and route handling are simpler than the current catch-all plus proxy arrangement.
- Middleware matching is documented and covered by tests.

### Phase 5: Scalability and Operational Maturity

Objective: remove the clearest growth bottlenecks and make the app easier to observe and support.

Changes:

- Move stats generation from in-memory aggregation to Mongo aggregation pipelines.
- Re-evaluate `/api` search semantics and explicitly choose between regex, prefix, or indexed full-text behavior.
- Ensure `latest`, `popular`, and list operations use explicit indexed access patterns.
- Standardize observability events for:
  - alias create
  - alias update
  - alias delete
  - redirect success
  - redirect blocked
  - redirect missing
  - auth failure
- Add a small end-to-end suite for the main operator workflow and the public redirect path.

Internal/public interface changes:

- No immediate public API expansion is required.
- Data access patterns and index expectations become part of the implementation contract.

Acceptance criteria:

- Stats do not require loading the full collection into application memory.
- Search behavior is explicitly defined and supported by indexes.
- Operational signals are consistent enough to support debugging and traffic analysis.

Exit criteria:

- Read paths are materially more efficient under larger datasets.
- The app can be monitored and debugged without relying on ad hoc log interpretation.

## Test Plan

Required coverage additions:

- Unit tests for normalization, reserved paths, redirect loop detection, duplicate conflict handling, and stats aggregation logic.
- Route-level tests for method enforcement, auth enforcement, and stable JSON error behavior.
- Regression test proving blocked redirects do not mutate counters.
- Integration test proving duplicate alias creation returns `409` under unique-index enforcement.
- Frontend component tests for dialogs, confirmations, focus management, and shared loading/error states.
- End-to-end tests for login, list, create, update, delete, and public redirect flows.
- Keep Jest where it remains effective, but add stronger integration or E2E tooling if Jest is not sufficient to provide release confidence for the changed behavior.

Required verification for every phase:

- `npm run lint`
- `npm test -- --runInBand`
- `npm run build`

## Assumptions and Defaults

- The implementation plan file should be created at the repo root as `IMPLEMENTATION_PLAN.md`.
- The roadmap is optimized for incremental hardening rather than a strategic rewrite.
- Public short-link routing remains `/{slug}` throughout this roadmap.
- The application remains a single Next.js monolith in this version of the plan.
- No public route or payload changes should be introduced unless explicitly called out in a future revision.
- TypeScript expansion is not a standalone goal in this roadmap; it should only be introduced where it directly supports the service/repository refactor.
- Dependency changes should prefer supported upgrades or same-major fixes; downgrades are a last resort and require a concrete compatibility justification.
- UI changes should preserve the current Materialize visual identity and theme colors unless a deliberate UX improvement requires a controlled deviation.
- Test strategy should prioritize production confidence over tool consistency; introducing a better-suited integration or E2E framework is acceptable if it reduces release risk.
- No known operational constraints currently block Mongo index additions, Auth0 integration changes, or deployment/runtime adjustments needed to complete the roadmap.
