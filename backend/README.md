# InvoiceSnap Backend

Node.js + TypeScript backend for InvoiceSnap.

## Features
- Auth: signup, login, me, password change, logout
- Invoice CRUD
- OCR/text-based extraction endpoint for uploaded invoice files
- Analytics summary/trends/distribution/top vendors
- GST month reports + CSV export
- Settings profile update
- Invoice export endpoints

## Quick Start
1. Install dependencies:
   - `pnpm install`
2. Copy env:
   - `copy .env.example .env`
3. Start dev server:
   - `pnpm dev`

Backend runs on `http://localhost:4000` by default.

## API Base
- `http://localhost:4000/api`

## Persistence
Data is stored in MongoDB using the configured `MONGODB_URI` and `MONGODB_DB_NAME` values.

## Invoice Extraction
- Digital PDFs are parsed locally with `pdf-parse`
- Scanned PDFs and images can be extracted with Gemini when `GEMINI_API_KEY` is configured
- Local heuristics still validate and normalize GSTIN, dates, totals, and fallback extraction behavior
- If Gemini is unavailable or rate-limited, the backend falls back to the local extractor
