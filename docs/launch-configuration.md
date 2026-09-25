# Launch configuration — 2026-09-25

## Verified status

The public checkout on https://watta-sushi-k95z.vercel.app/ reported
`checkoutReady: false` and `deliveryReady: false` before these changes.
No Mapbox/Stripe keys or Vercel API access were present in the local environment.
This does not prove which individual secrets are missing in Vercel; its environment
settings must be inspected by the project owner.

Favourites work without any external configuration.

## Mapbox delivery

In **Vercel → watta-sushi-k95z → Settings → Environment Variables**, add:

- `MAPBOX_ACCESS_TOKEN`: a token usable by server requests to Geocoding v6 and Directions.
- `DELIVERY_QUOTE_SECRET`: generate with `openssl rand -hex 32`; use one stable private
  value across instances. Do not use a NEXT_PUBLIC prefix.
- `APP_URL=https://watta-sushi-k95z.vercel.app` for this production deployment.
  Preview deployments need an exact matching preview origin.

Redeploy after changing variables. These settings are enough for the delivery
quote endpoint; it no longer writes quote records to local SQLite.
Use a consistent street/house number/postcode. A mismatched postcode must not
silently calculate delivery to a different address.

## Stripe and order storage — launch blocker

This version's order store remains local SQLite. Vercel functions cannot share
a durable local SQLite file; using /tmp would lose orders and break fulfillment.
Consequently, checkout stays unavailable on Vercel until a shared order store
is integrated. Setting Stripe keys alone does not resolve this.

Choose/connect the project's shared database (for example PostgreSQL or Turso),
then migrate order creation, status lookup, webhook transactions and email jobs.
Alternatively run the current SQLite backend on one persistent Node server.
Do not remove the storage check merely to enable the button.

For the supported persistent-server deployment, set:

- `STRIPE_SECRET_KEY` (`sk_test_…` initially).
- `STRIPE_WEBHOOK_SECRET` for `/api/stripe/webhook`.
- Exact HTTPS `APP_URL`.
- A persistent `DATABASE_PATH`.

For live payments also set `STRIPE_LIVE_APPROVED=true` after owner approval.
SMTP no longer blocks creation of a Stripe session. Configure SMTP before
promising email confirmations; queued email jobs can be retried after setup.

## Verification still required with real credentials

The tests use mocked Mapbox responses and a mocked Stripe redirect. They verify
calculation, tamper protection and UI behavior, not account permissions or billing.
Before launch:

1. Calculate a real Amsterdam route and check the €0.80/km fee.
2. Pay with a Stripe sandbox test card and verify the signed webhook, durable order
   and confirmation page.
3. Verify cancelled/failed payments do not mark an order paid.
4. Verify customer confirmation email delivery.

Never paste secret keys into Git or chat.
