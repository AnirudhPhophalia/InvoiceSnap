# InvoiceSnap

InvoiceSnap is a full-stack AI invoice management system with OCR extraction, anomaly-aware review, GST reporting, and analytics.

## Features

- Hybrid extraction pipeline: digital PDF text parsing, Gemini extraction, and local OCR fallback
- Self-Learning Vendor Brain: vendor profiles, anomaly scoring, and explainable risk reasons
- Human-in-the-loop review flow: confidence + risk driven `needsReview` pipeline
- Source document intelligence: original invoice storage, inline preview, and download
- Duplicate detection before save
- Batch extraction + bulk draft save

## Product Modules

### Authentication & User

- Email/password signup and login
- Google auth integration
- Cookie-based auth sessions
- Profile/settings update and password change

### Invoice Operations

- Create, read, update, delete invoices
- Server-side filtering, sorting, and pagination
- Category tagging and editable line items
- Invoice export to PDF and CSV

### AI Extraction Pipeline

- Upload supports PDF, PNG, JPG, JPEG, WebP
- `POST /api/extract` for single-file extraction
- `POST /api/extract/batch` for multi-file extraction
- Extraction metadata:
  - `extractionSource`
  - `extractionConfidence`
  - `extractionNeedsReview`

### Self-Learning Vendor Brain

- Vendor profile modeling from historical invoices
- Invoice risk score (`vendorRiskScore`) and explainable reasons (`vendorRiskReasons`)
- Anomaly signals include:
  - duplicate invoice number patterns
  - unusual amount deviation
  - unseen GST rates
  - category drift
- Vendor Brain analytics endpoint: `GET /api/analytics/vendor-brain`

### Review & Quality Controls

- Auto review flagging from extraction confidence and data completeness
- Additional review escalation from vendor anomaly risk
- Duplicate detection at invoice create

### Analytics & GST

- Summary, trends, status distribution, top vendors
- Monthly category analysis
- Vendor Brain profiles and anomaly feed in analytics UI
- GST monthly reports with CSV/PDF export

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind, shadcn/ui
- Backend: Node.js, Express, TypeScript, Zod, Multer
- Database: MongoDB
- AI/OCR: Gemini API, pdf-parse, tesseract.js

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### backend/.env

```env
PORT=4000
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=invoicesnap
AUTH_COOKIE_NAME=invoicesnap_auth
AUTH_COOKIE_SAME_SITE=lax
GOOGLE_CLIENT_ID=your_google_client_id
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
```

### frontend/.env

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## Useful Scripts

### Backend

- `npm run dev`
- `npm run lint`
- `npm test`

### Frontend

- `npm run dev`
- `npm run build`

## License

MIT
