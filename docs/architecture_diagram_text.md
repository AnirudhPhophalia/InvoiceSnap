InvoiceSnap Architecture Diagram (Text)

Frontend -> API Gateway -> Backend Services
- Client UI (Next.js) makes API calls to the backend via a REST/GraphQL gateway.
- Frontend handles authentication flows, data visualization, and input forms.

AI Extraction Stack
- PDF/Text extraction pipeline: digital text parsing -> Gemini-based extraction -> local OCR fallback.
- Extracted data is composed into an extraction result with confidence metrics and needsReview flag.

Data Layer
- MongoDB stores users, invoices, vendor profiles, extraction results, and analytics data.
- Source documents are stored or linked for inline viewing.

Vendor Brain & Analytics
- Vendor Brain analyzes historical invoice data to produce risk scores and anomaly signals.
- Analytics endpoints provide dashboards for trends, top vendors, and GST summaries.

Security & Deployment
- JWT-based authentication for APIs; cookie-based sessions for front-end access.
- Deployment-ready patterns emphasize modular services, logging, and observability.