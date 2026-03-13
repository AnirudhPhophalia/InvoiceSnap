# InvoiceSnap Backend

TypeScript + Express backend for InvoiceSnap SaaS.

## Features

- Cookie-based authentication with JWT
- Local signup/login plus Google OAuth token verification
- Invoice CRUD with validation (Zod)
- Duplicate invoice detection on create
- Extraction confidence and review flags (`extractionNeedsReview`)
- Source document storage and preview support
- Correction-learning pipeline for user edits
- AI-driven expense categorization and item categorization
- Vendor anomaly scoring (Vendor Brain)
- Analytics endpoints (summary, trends, status, vendors, monthly categories)
- GST monthly report and exports (CSV/PDF)
- Invoice exports (CSV/PDF)

## Tech Stack

- Node.js + Express
- TypeScript
- MongoDB (official driver)
- Multer for multipart upload
- Zod for payload validation
- `pdf-parse`, Gemini (optional), `tesseract.js` for extraction

## Quick Start

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Default URL: `http://localhost:4000`

## Environment Variables

```env
PORT=4000
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=invoicesnap
AUTH_COOKIE_NAME=invoicesnap_auth
AUTH_COOKIE_SAME_SITE=lax
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
```

## Scripts

- `npm run dev` - watch mode server (`tsx watch`)
- `npm run build` - compile TS to `dist/`
- `npm run start` - start compiled server
- `npm run lint` - TypeScript no-emit check
- `npm test` - run Node test suite

## API Base

- `http://localhost:4000/api`

## Main Route Groups

- `/auth` - signup, login, google auth, me, logout, password change
- `/extract` - single and batch invoice extraction
- `/invoices` - CRUD, source preview, and per-invoice exports
- `/analytics` - dashboard and monthly category summaries
- `/gst-reports` - GST summaries and exports
- `/settings` - profile updates

## Extraction Pipeline

1. Accept file upload (PDF/PNG/JPG/JPEG/WebP).
2. Persist source file in MongoDB.
3. Extract fields using best available strategy:
   - digital PDF text parse,
   - Gemini extraction for scanned content,
   - local OCR fallback.
4. Apply learned corrections for repeat vendors.
5. Suggest category from heuristics + history.
6. Return extracted draft with metadata and sourceDocumentId.

## Notes

- `/export/excel` endpoints currently return CSV content with Excel-friendly formatting.
- Keep `JWT_SECRET` strong in production.
