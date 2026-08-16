# NammaSpot data reliability notes

The application uses Google Sheets through the Apps Script Web App as its persistent data store.

## Required Apps Script configuration

Set these in Apps Script Project Settings -> Script Properties:

- `SHEET_ID` — the new NammaSpot spreadsheet ID
- `ADMIN_PASSWORD` — admin credential used by the backend authentication flow, if enabled by the current deployment
- `WRITE_TOKEN` — optional shared write token

## Required server configuration

Set `SHEETS_API_BASE` to the deployed Apps Script Web App `/exec` URL.

Never commit `.env` files or secrets to GitHub.

## Persistence rules

- Create operations use stable record IDs.
- Update operations use the record ID and update the existing spreadsheet row.
- Apps Script uses locking for writes.
- The frontend must treat the backend as the persistent source of truth and use local state only as a UI/cache layer.
