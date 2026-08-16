# Step 4 — Security & Authentication

## Completed
- Admin password is no longer present in frontend source.
- Admin password is read from Apps Script Script Properties via `ADMIN_PASSWORD`.
- Admin sessions use a signed, expiring backend token (8 hours).
- Admin status is verified by the backend rather than a client-side boolean.
- Seller/review moderation updates require a valid admin token.
- Environment files are ignored by Git and the committed `.env` was removed from the hardening branch.
- No production credentials are added to source code.

## Required deployment configuration
Apps Script Project Settings → Script Properties:
- `SHEET_ID` = the production spreadsheet ID
- `ADMIN_PASSWORD` = the admin password chosen by the owner
- `AUTH_SECRET` = a long random secret used to sign admin sessions
- `WRITE_TOKEN` = optional additional write protection if desired

## Important
The repository did not contain a separate password-based seller login flow during this audit; seller authentication/session work will be handled with the seller dashboard workflow if/when that login route is present. Do not claim seller authentication is production-grade until that flow is implemented and tested.

## Release rule
Do not merge/deploy until the Apps Script deployment contains the authentication changes and the required Script Properties are configured.
