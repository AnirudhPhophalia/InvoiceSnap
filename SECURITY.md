# Security Policy

## Supported Versions

This project currently supports the latest code on the default branch.

## Reporting a Vulnerability

If you discover a security vulnerability, do not open a public issue.

Please report it privately by contacting the maintainers through your preferred secure channel and include:

- Description of the vulnerability
- Reproduction steps or proof of concept
- Potential impact
- Suggested remediation (if available)

## Response Process

1. Acknowledge receipt within a reasonable timeframe.
2. Validate and triage the report.
3. Prepare and test a fix.
4. Coordinate disclosure and release notes.

## Security Best Practices

- Never commit secrets to the repository.
- Use strong values for `JWT_SECRET` in production.
- Use HTTPS and secure cookie settings in production.
- Restrict CORS to trusted frontend origins.
- Keep dependencies up to date.
