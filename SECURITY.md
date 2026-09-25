# Security

## Current safeguards

- The server rebuilds every order from catalog product IDs and integer quantities. Client prices and totals are ignored.
- Checkout requires an exact configured browser origin, JSON input, bounded request bodies and per-client/global rate limits.
- Delivery quotes use fixed server-side Mapbox endpoints, validate an exact Amsterdam address, bind the distance to an address hash with an HMAC signature and expire after 15 minutes. Checkout recalculates the route and refuses a changed price until the customer reviews it.
- Stripe webhooks require a valid signature and a bounded body. Fulfillment verifies the session ID, order ID, currency and amount and records event IDs transactionally.
- Order status URLs use high-entropy Stripe session IDs and return only a short order number, state and total.
- SQLite statements are parameterized. The database file is created with owner-only permissions and is excluded from Git.
- HTML responses use a fresh CSP nonce, strict dynamic script loading, frame restrictions, HSTS in production and browser capability restrictions.
- Secrets are read from environment variables. `.env*`, databases, build artifacts and local skills are excluded from Git.

## Audit record

The application was reviewed on 2026-09-14 against the installed OWASP API, business-logic, Host header, CORS, sensitive-data and XSS testing workflows.

- `npm audit` reported zero known vulnerabilities across production and development dependencies.
- Automated tests cover price and quantity manipulation, the two-roll rule, delivery-address binding, payment mismatch, duplicate webhooks, request deduplication, hostile origins, oversized bodies and rate limiting.
- A production browser smoke test covered all 83 products, three languages, basket persistence, pickup checkout, search and mobile overflow with no page errors.
- The production response was checked for CSP nonces and security headers.

## Deployment requirements

- Terminate HTTPS before the app and set an exact HTTPS `APP_URL`.
- Keep the Node service private behind a proxy that overwrites client-IP headers. Add edge rate limits for checkout and delivery quotes; the in-process limiter protects one instance only.
- Store Stripe, Mapbox, the quote signing secret and SMTP credentials in the host's secret manager. Do not expose them through NEXT_PUBLIC variables.
- Use one persistent instance with SQLite. For multiple replicas or serverless hosting, move orders and rate limits to shared services such as PostgreSQL and Redis.
- Back up the database, monitor failed Stripe webhooks and email jobs, and define a customer-data retention and deletion schedule before launch.

Report security issues privately to `Info@wattaholding.nl`. Do not include customer data, payment credentials or live secrets in a report.
