InvoiceSnap Architecture Summary

Overview
- A high-level blueprint of the system outlining major components, responsibilities, and data flows to support governance, security, and scalability considerations.

Key Components
- Frontend: Next.js/React-based user interface for customer interaction, dashboards, and data entry.
- API Gateway / Backend: Node.js + Express services, implementing business logic, validation (Zod), and file upload handling (Multer).
- AI/Extraction Layer: OCR and NLP stack (e.g., PDF text parsing, Gemini-based extraction, local OCR fallback) to derive structured invoice data.
- Data Store: MongoDB for persistence of users, invoices, analytics, and configuration data.
- Vendor Brain and Analytics: Modules for anomaly detection, risk scoring, and dashboard analytics endpoints.
- Security & Compliance: JWT-based APIs, cookie-based sessions, role-based access control, and secure storage for sensitive configuration.

Data Flows (High-Level)
- Ingestion: Invoice documents uploaded via frontend -> stored as source documents -> extraction pipeline runs -> draft extraction results returned to UI.
- Validation: Extracted data validated server-side; user reviews edits; finalized invoices persisted to database.
- Analytics: Aggregated data consumed by dashboards and reporting modules.

Non-Functional Considerations
- Scalability: Stateless API with modular microservices patterns and scalable data layer.
- Observability: Logging, metrics, and tracing hooks to support monitoring and debugging.
- Security: Strict access controls, data-at-rest and in-transit protections, and secure secret management.
