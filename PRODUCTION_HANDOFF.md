# Customer Freight Production Handoff

## Module Identity
- Frontend base path: `/apps/customer-freight/`
- Backend API base path: `/api/customer-freight`

## Required Permission Strings
- `customer-freight:access`
- `customer-freight:admin`

## Auth Integration Contract
- The integration layer must inject `req.userSession` on incoming API requests.
- Expected `req.userSession` shape:
  - `id: string`
  - `email: string`
  - `name: string | null`
  - `isSuperAdmin: boolean`
  - `permissions: string[]`

## Health Endpoint
- `GET /api/customer-freight/health`
- Response: `{ "status": "ok" }`

## Key API Routes
- `GET /api/customer-freight/me`
- `GET /api/customer-freight/initial-data`
- `GET|POST|PATCH|DELETE /api/customer-freight/loads...`
- `GET|POST|PATCH|DELETE /api/customer-freight/greenbush...`
- `GET|POST|PATCH|DELETE /api/customer-freight/admin/...`

## Environment Variables
- `PORT`
- `NODE_ENV`
- `API_BASE_PATH` (default: `/api/customer-freight`)
- `LOG_LEVEL`
- `APP_URL`
- `API_URL`
- `COMPANY_DOMAINS`
- `DB_PROVIDER` (`postgres` in production; `sqlite` supported for dev only)
- `SQLITE_URL` (optional; `file:` URL for dev SQLite)
- `DATABASE_URL` (or `SUPABASE_URL` + `SUPABASE_DB_PASSWORD`, or `SUPABASE_DB_URL`)
- `SUPABASE_DB_HOST` (optional)
- `SUPABASE_DB_PORT` (optional)
- `SUPABASE_DB_USER` (optional)
- `SUPABASE_DB_NAME` (optional)
- `PGSSL` (optional: `require` or `disable`)
- `DEV_AUTH_ENABLED` (development only; defaults to `true`)
- `DEV_SESSION_ID` (development only)
- `DEV_SESSION_EMAIL` (development only)
- `DEV_SESSION_NAME` (development only)
- `DEV_SESSION_PERMISSIONS` (development only; comma-separated)
- `DEV_SESSION_SUPER_ADMIN` (development only; `true|false`)
- `VITE_PORTAL_LOGIN_URL` (optional frontend override for login redirect target)

## Migration Command
- `npm run migrate -w @antigravity/db`

## Local Standalone (SQLite)
1. Ensure no stale listeners are occupying dev ports.
   - `lsof -nP -iTCP:5174 -sTCP:LISTEN`
   - `lsof -nP -iTCP:8787 -sTCP:LISTEN`
   - `kill <pid>` for stale Node listeners if needed.
2. Configure `.env` for local SQLite:
   - `DB_PROVIDER=sqlite`
   - `SQLITE_URL=file:./data/dev.db`
   - `DEV_AUTH_ENABLED=true`
3. Run database setup:
   - `npm run migrate -w @antigravity/db`
4. Start the app:
   - `npm run dev`
5. Open:
   - `http://localhost:5174/`

Optional: send `x-dev-session` with JSON or base64url-encoded JSON to override the fallback development session per request.
