# Repository Guidelines

## Project Structure & Module Organization
- The active code lives in `src/`. `pages/` holds the Next.js Pages router views and API routes (e.g., `pages/api/create.js`, `[...slug].js`). UI building blocks sit in `components/`, while `lib/` contains shared utilities (Mongo connection, logging) and `models/` defines the Mongoose schema for Yo links. Static assets are under `public/`; Docker files at the repo root support local stacks. Coverage output lands in `src/coverage/`.

## Build, Test, and Development Commands
- From `src/`: `npm install` to fetch dependencies.  
- `npm run dev` starts the Next dev server at `http://localhost:3000`.  
- `npm run build` produces a production bundle; `npm start` serves it.  
- `npm run lint` runs Next.js/ESLint rules; `npm run fmt` checks Prettier formatting and `npm run fmt-fix` auto-fixes.  
- `npm test` executes the Jest suite with coverage (outputs to `src/coverage/`).

## Coding Style & Naming Conventions
- Codebase is primarily JavaScript with some TypeScript support; prefer the existing module style in `pages` and reuse shared helpers from `lib/`.  
- Use camelCase for variables/functions, PascalCase for React components, and kebab-case for API route filenames.  
- Keep UI logic in `components/` and data access in `lib/`/`models/`. Run `npm run fmt-fix` before pushing to ensure Prettier 3 formatting and consistent spacing.

## Testing Guidelines
- Jest is configured with `babel-jest`; tests live next to their targets and end with `.test.js` (e.g., `pages/api/create.test.js`, `lib/mongoose.test.js`).  
- Coverage collection is on by default; review `src/coverage/lcov-report` after runs.  
- Mock external services (Mongo, Auth0, URL validation) using existing patterns in `pages/api` tests to keep suites deterministic.

## Commit & Pull Request Guidelines
- Follow the existing short, imperative commit style seen in history (`Fix redirect loops`, `Add Stats view`).  
- PRs should include: concise summary, testing notes/commands run, screenshots for UI changes, and any new env vars or migration steps.  
- Link related issues and keep diffs focused; prefer smaller PRs that touch a single feature or fix.

## Security & Configuration Tips
- Copy `.env.sample` values to `.env` before local runs; set Mongo connection, base URLs, and Auth0 keys as needed.  
- Keep secrets out of commits; use local env files or CI secrets. Verify redirected URLs via the validators already used in `pages/api/create`.
