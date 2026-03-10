# Contributing to InvoiceSnap

Thank you for your interest in contributing.

## Development Setup

1. Fork and clone the repository.
2. Create a feature branch from `main`.
3. Install dependencies:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && pnpm install` (or `npm install`)
4. Ensure environment files are present:
   - `backend/.env`
   - `frontend/.env`
5. Start services:
   - Backend: `npm run dev`
   - Frontend: `pnpm dev` or `npm run dev`

## Code Guidelines

- Use TypeScript for all new app logic.
- Keep changes focused and small.
- Prefer clear naming over abbreviated names.
- Update docs when behavior or configuration changes.

## Before Opening a Pull Request

- Run backend type checks:
  - `cd backend && npm run lint`
- Run frontend build and checks as applicable.
- Verify core flows manually:
  - Login/signup
  - Invoice CRUD
  - Analytics and GST pages

## Pull Request Checklist

- [ ] Description explains what changed and why
- [ ] No secrets or credentials included
- [ ] Relevant docs updated
- [ ] Local validation done

## Commit Messages

Use concise, descriptive commit messages. Example:

- `feat: add mongodb indexes for invoices`
- `fix: include credentials in frontend api calls`

## Reporting Issues

Please include:

- Expected behavior
- Actual behavior
- Steps to reproduce
- Screenshots or logs where useful
