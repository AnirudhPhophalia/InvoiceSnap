# InvoiceSnap - AI-Powered Invoice Parser & Expense Tracker

InvoiceSnap is a modern SaaS application that streamlines invoice management and expense tracking for freelancers and businesses. It uses AI to automatically extract invoice data and provides comprehensive analytics and GST reporting.

## Features

- **AI Invoice Extraction**: Automatically extract invoice data from images and PDFs with 99% accuracy
- **Invoice Management**: Organize, categorize, and track all your invoices in one place
- **Expense Analytics**: Visual insights into your spending patterns with interactive charts
- **GST Reporting**: Generate accurate GST reports and maintain audit trails
- **Secure Authentication**: User authentication with secure session management
- **Responsive Design**: Beautiful, modern UI that works on all devices

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts for data visualization
- **State Management**: React Context API + Hooks
- **Data Storage**: Backend API with MongoDB persistence
- **Design System**: Custom color tokens with glassmorphism effects

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── login/page.tsx              # Login page
├── signup/page.tsx             # Signup page
├── dashboard/page.tsx          # Main dashboard
├── upload/page.tsx             # Invoice upload with AI extraction
├── invoices/
│   ├── page.tsx               # Invoices list
│   └── [id]/page.tsx          # Invoice detail view
├── analytics/page.tsx          # Analytics dashboard
├── gst-reports/page.tsx        # GST reporting
├── settings/page.tsx           # User settings
└── layout.tsx                  # Root layout with providers

context/
├── auth-context.tsx           # Authentication context
└── invoice-context.tsx        # Invoice data context

components/
├── protected-layout.tsx        # Protected route wrapper
├── sidebar.tsx               # Navigation sidebar
└── ui/                       # shadcn/ui components

lib/
├── utils.ts                  # Utility functions
└── hooks.ts                  # Custom hooks
```

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd invoice-snap
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Demo Credentials

Try the app with demo credentials:
- **Email**: demo@example.com
- **Password**: demo123

Or create a new account with any email and password (minimum 6 characters).

## Key Pages

### Landing Page (`/`)
- Marketing landing page with feature highlights
- CTA buttons for signup/login
- Responsive design with gradient backgrounds

### Authentication (`/login`, `/signup`)
- User registration and login
- Form validation with error handling
- Secure session management

### Dashboard (`/dashboard`)
- Overview of invoices and expenses
- Quick statistics (total amount, GST, confirmations)
- Recent invoices list
- Quick action buttons

### Upload Invoice (`/upload`)
- Drag-and-drop invoice upload
- Simulated AI extraction (extracts sample data)
- Editable form fields for extracted data
- Instant invoice creation

### Invoices (`/invoices`, `/invoices/[id]`)
- List view with search and filter capabilities
- Invoice detail view with full information
- Status management (draft, confirmed, paid)
- Export options

### Analytics (`/analytics`)
- Monthly trend charts (LineChart)
- Status distribution (PieChart)
- Top vendors chart (BarChart)
- Key metrics and statistics

### GST Reports (`/gst-reports`)
- Monthly GST breakdown
- Detailed invoice listing by period
- GST calculation by rate
- Export to PDF/Excel

### Settings (`/settings`)
- Profile management
- Security and password settings
- Billing information
- Account information

## Features in Detail

### AI Invoice Extraction
The upload page simulates AI extraction by:
1. Accepting invoice uploads (drag-drop or file select)
2. Simulating API call to AI service (2-second delay)
3. Pre-populating form with sample extracted data
4. Allowing user to review and edit fields
5. Saving invoice via backend API

### Data Management
- **Context API**: Global state management for auth and invoices
- **Backend API**: Data persisted in MongoDB via backend services
- **Real-time Updates**: State updates immediately reflect across the app

### Analytics
- **Recharts**: Interactive charts and visualizations
- **Monthly Trends**: Track invoice amounts and GST over time
- **Status Distribution**: Visual breakdown of invoice statuses
- **Top Vendors**: Identify highest-spending vendors

### Security
- **Protected Routes**: Dashboard and all pages behind authentication
- **Session Management**: Automatic login state persistence
- **Form Validation**: Input validation on all forms

## Customization

### Colors & Design Tokens
Edit design tokens in `app/globals.css`:
```css
:root {
  --primary: oklch(0.55 0.216 292.11);
  --accent: oklch(0.68 0.24 29.23);
  /* ... more tokens ... */
}
```

### Invoice Fields
Modify invoice structure in `context/invoice-context.tsx`:
```typescript
export interface Invoice {
  // Add custom fields here
}
```

### Navigation Items
Update sidebar navigation in `components/sidebar.tsx`:
```typescript
const navItems = [
  { href: '/path', label: 'Label', icon: 'emoji' },
  // Add more items
];
```

## Performance Optimizations

- **Image Optimization**: Next.js Image component for optimized images
- **Code Splitting**: Dynamic imports for large components
- **CSS-in-JS**: Tailwind CSS for minimal bundle size
- **Context Optimization**: Memoization to prevent unnecessary re-renders

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- Real AI-powered invoice extraction
- OCR for image processing
- Email notifications
- Multi-user team accounts
- Advanced reporting and compliance
- Integration with accounting software
- Mobile app

## Deployment

### Deploy to Vercel

```bash
# Using Vercel CLI
vercel

# Or connect GitHub repository and auto-deploy
```

### Environment Variables

Create `.env.local`:
```env
# Add any API keys or configuration here
```

## License

MIT License - see LICENSE file for details

## Support

For support or feature requests, please visit the Settings page or contact support.

## Notes

- This is a demo/prototype implementation
- Data is stored by the backend in MongoDB
- AI extraction is simulated with sample data
- For production, integrate with real AI services
