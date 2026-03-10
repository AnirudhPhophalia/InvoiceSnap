# InvoiceSnap

InvoiceSnap is a full-stack invoice management platform for uploading invoices, extracting structured data, managing invoice lifecycle, generating GST reports, and visualizing analytics.

## Key Features

- Authentication: signup, login, logout, password change, profile fetch
- Invoice management: create, list, filter, search, update, delete
- Invoice exports: CSV and PDF-like downloadable output endpoints
- GST reports: month-wise report and export endpoints
- Analytics: summary, trends, status distribution, top vendors
- AI extraction simulation endpoint for uploaded invoice files
- Cookie-based auth session support for frontend/backend deployment

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind, shadcn/ui
- Backend: Express, TypeScript, Zod, JWT, Multer
- Database: MongoDB
- Auth transport: HTTP-only cookie (and Bearer fallback support)

## Repository Structure

```text
InvoiceSnap/
   backend/
      src/
         middleware/
         routes/
         utils/
         auth.ts
         config.ts
         db.ts
         server.ts
      .env.example
      package.json
   frontend/
      app/
      components/
      context/
      lib/
      .env.example
      package.json
   LICENSE
   CONTRIBUTING.md
   CODE_OF_CONDUCT.md
   SECURITY.md
   SUPPORT.md
   README.md
```

## Project Governance Files

- License: `LICENSE`
- Contributing guide: `CONTRIBUTING.md`
- Code of Conduct: `CODE_OF_CONDUCT.md`
- Security policy: `SECURITY.md`
- Support guide: `SUPPORT.md`

## Architecture Overview

Frontend:
- Calls backend REST APIs using `NEXT_PUBLIC_API_BASE_URL`
- Sends credentials with `fetch(..., { credentials: "include" })`
- Does not store auth token in `localStorage`

Backend:
- Exposes API routes under `/api/*`
- Connects to MongoDB on startup
- Uses collections:
   - `users`
   - `invoices`
- Sets/reads auth cookie for session-like behavior

## Environment Variables

Both `.env` files are already created from `.env.example`.

Backend (`backend/.env`):

```env
PORT=4000
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=invoicesnap
AUTH_COOKIE_NAME=invoicesnap_auth
AUTH_COOKIE_SAME_SITE=lax
```

Frontend (`frontend/.env`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

## Local Development

Prerequisites:
- Node.js 18+
- MongoDB running locally or accessible remotely

### 1. Run backend

```bash
cd backend
npm install
npm run dev
```

Backend default URL: `http://localhost:4000`

### 2. Run frontend

Use either npm or pnpm:

```bash
cd frontend
npm install
npm run dev
```

or

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend default URL: `http://localhost:3000`

## Available Scripts

Backend (`backend/package.json`):
- `npm run dev` - Start backend in watch mode
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run compiled backend
- `npm run lint` - Type-check (`tsc --noEmit`)

Frontend (from `frontend/package.json`):
- `npm run dev` / `pnpm dev` - Start Next.js dev server
- `npm run build` / `pnpm build` - Production build
- `npm run start` / `pnpm start` - Start production server

## API Overview

Base URL: `http://localhost:4000/api`

Auth routes:
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `PATCH /auth/password`

Invoice routes:
- `GET /invoices`
- `POST /invoices`
- `GET /invoices/:id`
- `PATCH /invoices/:id`
- `DELETE /invoices/:id`
- `GET /invoices/:id/export/pdf`
- `GET /invoices/:id/export/excel`

Analytics routes:
- `GET /analytics/summary`
- `GET /analytics/trends`
- `GET /analytics/status-distribution`
- `GET /analytics/top-vendors`

GST routes:
- `GET /gst-reports/:month`
- `GET /gst-reports/:month/export/excel`
- `GET /gst-reports/:month/export/pdf`

Other routes:
- `GET /settings`
- `PATCH /settings`
- `POST /extract`
- `GET /health` (outside `/api`, at backend root)

## Data and Persistence

- All application data is persisted in MongoDB.
- The old local JSON database approach has been removed from runtime source code.
- Frontend does not persist auth token in local storage.

## Deployment Notes

1. Deploy backend with environment variables from `backend/.env`.
2. Deploy frontend with `NEXT_PUBLIC_API_BASE_URL` pointing to deployed backend API.
3. Ensure CORS is set correctly (`CORS_ORIGIN` on backend).
4. For cross-site frontend/backend domains, typically use:
    - `AUTH_COOKIE_SAME_SITE=none`
    - `NODE_ENV=production` (secure cookies)
5. Use a managed MongoDB URI in production.

## Troubleshooting

- Backend fails to start:
   - Check `MONGODB_URI` and MongoDB network access.
   - Check `JWT_SECRET` is set.
- Login succeeds but protected APIs fail:
   - Confirm frontend sends credentials (`credentials: include` already configured).
   - Verify `CORS_ORIGIN` exactly matches frontend origin.
   - Verify cookie `sameSite`/`secure` settings for your deployment topology.
- Frontend cannot reach backend:
   - Verify `NEXT_PUBLIC_API_BASE_URL` and backend port/domain.

## Security Notes

- Keep `JWT_SECRET` long and private.
- Use HTTPS in production.
- Use restrictive CORS values (avoid wildcard for credentialed requests).
- Rotate secrets periodically.

## Future Improvements

- Integrate real OCR/AI extraction provider
- Add role-based access control and audit logs
- Add automated tests and CI pipelines
- Add object storage for uploaded documents

## License

This project is licensed under the MIT License. See `LICENSE`.
