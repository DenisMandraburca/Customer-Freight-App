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
- `DATABASE_URL` (or `SUPABASE_URL` + `SUPABASE_DB_PASSWORD`, or `SUPABASE_DB_URL`)
- `SUPABASE_DB_HOST` (optional)
- `SUPABASE_DB_PORT` (optional)
- `SUPABASE_DB_USER` (optional)
- `SUPABASE_DB_NAME` (optional)
- `PGSSL` (optional: `require` or `disable`)

## Migration Command
- `npm run migrate -w @antigravity/db`
