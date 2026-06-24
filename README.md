# Submission & Approval Workflow

A two-sided request workflow with strict server-side state transitions and an immutable audit trail. Applicants create, edit, and submit requests; reviewers start reviews, approve, reject, or return applications for changes.

## Test credentials

| Role | Email | Password |
|---|---|---|
| Applicant | `applicant@test.com` | `password123` |
| Reviewer | `reviewer@test.com` | `password123` |

## Local setup

Prerequisites: Docker with Compose, Node.js 22+, Yarn 1.x, and Go 1.22+.

Start PostgreSQL and the API:

```bash
docker compose up --build
```

Migrations and idempotent seed data run automatically. The API is available at `http://localhost:8080`; health check: `GET /health`.

Start the frontend in a second terminal:

```bash
cd frontend
yarn install --frozen-lockfile
yarn dev
```

Open `http://localhost:5173`. Override the API with `VITE_API_URL`; configure the API's permitted browser origins with the comma-separated `FRONTEND_ORIGINS`. The singular `FRONTEND_ORIGIN` remains supported for local and legacy configuration.

Run checks:

```bash
cd backend && go test ./...
cd frontend && yarn lint && yarn typecheck && yarn build
```

## Data model

`users` stores authenticated identities and an enum-constrained role. `applications` stores request content and its current enum-constrained state. `audit_logs` stores one row per successful transition, including actor, previous/new state, comment, and UTC timestamp. UUID keys avoid exposing sequential identifiers. A normalized audit table is queryable and independently constrained, unlike a JSON history column. Audit rows cascade only when a permitted draft deletion removes the parent application.

## State machine design

The backend owns a declarative transition table containing source, destination, allowed role, and comment requirement. This makes all allowed movement visible, table-testable, and easier to extend than distributed conditionals. The transition handler locks the application row, validates the transition, changes status, and inserts the audit row within one database transaction.

## API

All successful JSON responses use `{ "data": ... }`; failures use `{ "error": "...", "code": "..." }`. Protected routes require `Authorization: Bearer <JWT>`.

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST /api/applications/`
- `GET|PUT|DELETE /api/applications/:id`
- `POST /api/applications/:id/transition`

## Deployment

Production uses Railway for the API and PostgreSQL, and Vercel for the static frontend. Pull requests run validation only. A push to `main` is validated again, Railway deploys the connected backend service, and GitHub Actions deploys the frontend to Vercel.

### 1. Deploy the backend to Railway

1. Create a Railway project and add a PostgreSQL service.
2. Add a service from this GitHub repository and set its root directory to `/backend`.
3. If Railway does not detect it automatically, set the config file path to `/backend/railway.json`.
4. Configure these Railway variables:

   - `DATABASE_URL`: reference the PostgreSQL service's `DATABASE_URL`.
   - `JWT_SECRET`: a strong, randomly generated secret.
   - `FRONTEND_ORIGINS`: the exact Vercel production URL and any custom domains, separated by commas.
   - `PORT`: leave this to Railway; the platform injects it automatically.

5. Generate a public Railway domain. The health check at `/health` must return HTTP 200 before Railway activates a deployment.

Migrations and the requested idempotent demo seed run when the API starts. Keep the Railway service at one replica so startup migrations and seeding do not run concurrently.

### 2. Configure Vercel

1. Create a Vercel project for this repository and set its root directory to `frontend`.
2. Disable Vercel's Git-based automatic deployments so the GitHub workflow is the only deployment path.
3. Add the production environment variable:

   - `VITE_API_URL=https://YOUR-RAILWAY-DOMAIN/api`

4. Add the production Vercel URL to Railway's `FRONTEND_ORIGINS`, for example `https://YOUR-PROJECT.vercel.app`. Add custom domains to the same comma-separated value.

The checked-in `frontend/vercel.json` builds the Vite application and rewrites unknown paths to `index.html`, allowing direct navigation to React Router routes.

### 3. Configure GitHub Actions

Create these repository secrets:

- `VERCEL_TOKEN`: a Vercel access token.
- `VERCEL_ORG_ID`: the team or account ID from `.vercel/project.json` after running `vercel link` locally.
- `VERCEL_PROJECT_ID`: the project ID from the same file.

The pull-request workflow runs backend tests and frontend lint, type, and build checks. The production workflow repeats those checks on `main`, pulls Vercel's production environment, builds, and deploys the prebuilt output. Railway deploys the backend independently through its GitHub connection.

### Verification

After deployment:

```bash
curl --fail https://YOUR-RAILWAY-DOMAIN/health
```

Open the Vercel application, sign in with both demo roles, and verify applicant submission and reviewer transitions. Refresh a nested route such as `/applications/<id>` to verify the SPA rewrite. Browser requests from origins not listed in `FRONTEND_ORIGINS` will not receive CORS authorization headers.

### Rollback

- Railway: open the service deployment history and redeploy the last healthy deployment.
- Vercel: open the project deployment history and promote the previous production deployment.

Live URLs and provider credentials are intentionally omitted from the repository.

## Trade-offs and next steps

- Add refresh-token rotation and frontend session-expiry messaging.
- Add reviewer queue pagination and server-side filters.
- Add S3-compatible attachments, notifications, and auth rate limiting.
- Add PostgreSQL integration tests in CI alongside the isolated HTTP tests.

## AI tools used

Codex was used to break down the supplied specification, scaffold the application, and generate initial tests. The resulting implementation was verified with Go tests, TypeScript compilation, and production frontend build commands; workflow rules and security boundaries remain explicit in source and tests.
