# Storefront and language verification — 18 October 2026

## Changes

- Completed Dutch and Ukrainian display names for catalog items and translated remaining set/drink descriptions. Brands remain unchanged; recipes and prices were not changed or invented.
- Localized homepage slogans, address labels, accessibility labels, phone-country headings, browser titles, and the 404 page.
- Corrected the phone example to show the national number to enter beside the selected international prefix.
- Made the phone-country popup close explicitly on Escape.

## Checks

- Production build, including TypeScript, passed.
- 22 server tests passed: order pricing, minimum rolls, quantity limits, request validation, delivery signatures, rate limits, and mocked payment/webhook handling.
- Browser coverage includes all 83 products added/removed, favourites persistence, search/navigation, and mocked checkout.
- Language tests switch English, Dutch and Ukrainian on eight routes at 1280px and 390px: home, menu, delivery, contacts, privacy, checkout, success and 404. They check translated content, reload persistence, page errors and horizontal overflow.
- The full-cart test performs 166 real UI actions; its timeout was raised from 30 to 90 seconds after completing the cart operations but hitting the original time limit.
- Live production delivery: Museumstraat 1 returned 5750.811 metres and EUR 4.60; Grote Markt 2 in Haarlem returned `outsideDeliveryArea`.

## Limits

These checks do not guarantee absence of all defects. Stripe/browser checkout responses in automated checkout tests are mocked. Actual payment acceptance remains disabled by the existing Vercel/local-SQLite readiness guard. No production database changes or real payment activation were performed.
