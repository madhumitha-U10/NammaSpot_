# NammaSpot Pre-Launch Baseline — 2026-08-16

This branch is the isolated pre-launch hardening branch created from `main`.

## Release rule
Do not merge to `main` until the application has passed the full pre-launch audit, production build, functional tests, and final diff review.

## Baseline
- Base branch: `main`
- Working branch: `prelaunch-hardening-2026-08-16`
- Production deployment remains unchanged during hardening.

## Planned checks
- Data persistence and Google Sheets integration
- Admin and seller authentication/security
- Seller profile and profile-image persistence
- Catalogue CRUD and full-image rendering
- Customer/enquiry/review flows
- Duplicate prevention and error handling
- Mobile/public pages
- Secrets/environment configuration
- Production build
- Final diff/deletion review

## Catalogue image requirement
Catalogue images must display the complete uploaded image without cropping or stretching. Target presentation ratio: 4:5 with `object-fit: contain`.
