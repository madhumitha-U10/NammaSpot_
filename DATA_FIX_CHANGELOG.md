# NammaSpot data reliability update

This package updates the existing application without redesigning it.

## Fixed
- Google Sheets remains the persistent source of truth; localStorage is treated as cache/optimistic UI state.
- Remote/local records are merged by stable IDs instead of concatenated, preventing duplicate rows in the UI.
- Seller approval and review approval now call backend update operations.
- Seller profile images and product images are uploaded through Apps Script to Google Drive and the resulting URL is saved in Sheets.
- Customer profile pictures were removed from the data model and UI.
- Enquiries create and mirror a customer record when a new phone number is seen.
- Backend write failures are logged rather than silently discarded.
- Admin password is no longer hard-coded in the React route; admin verification is performed through the Apps Script backend.
- Google Sheet ID, admin password and image folder configuration are expected in Apps Script Script Properties.
- Hard-coded Apps Script URL fallback was removed; set SHEETS_API_BASE in the server environment.
- Apps Script uses LockService and idempotent ID-based create/update operations.

## Required deployment configuration

Apps Script properties:
- SHEET_ID
- ADMIN_PASSWORD
- IMAGE_FOLDER_ID (optional)
- WRITE_TOKEN (optional)

Server environment:
- SHEETS_API_BASE

The Google Apps Script Web App must be redeployed after Code.gs changes.
