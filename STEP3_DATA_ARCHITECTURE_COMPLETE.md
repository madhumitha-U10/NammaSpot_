# Step 3 — Data Architecture

Status: IMPLEMENTED on `prelaunch-hardening-2026-08-16`.

## Changes
- Google Sheets is the persistence source for seller/product/customer/enquiry/review writes.
- Added table-aware server CRUD functions with explicit stable ID keys.
- Seller registration uses `create` against `sellers`.
- Product creation uses `create` against `products`.
- Enquiries/customers use persistent `create` operations.
- Seller approval/rejection uses persistent `update` by `sellerId`.
- Review approval uses persistent `update` by `reviewId`.
- Product image URL updates use persistent `update` by `productId`.
- Frontend read merging is ID-deduplicated instead of concatenating remote/local copies.
- Write failures are captured and optimistic local records are rolled back.
- Removed the customer-avatar overlay from the data layer.
- Production Apps Script `/exec` endpoint is configured as the fallback.

## Backend contract
- `create` and `update` are handled by `backend/Code.gs`.
- Stable IDs are mapped explicitly: sellerId, productId, categoryId, customerId, enquiryId, reviewId.
- Apps Script uses `LockService` and idempotent create behavior.

## Not claimed here
This step does not claim production build/test/deployment success. Those are release gates in later steps.
