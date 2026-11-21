# Project Status (2026-11-21)

Live: https://abrarfaiyaaz89.github.io/hatbodol/  (GitHub Pages, flat files in repo root)
Firebase project: hatbodol-1 (Spark plan). Login: Google (tested working).

## Done
Layout shell, homepage, Google login, profile record, student verification, admin approval (admin.html), 404 and Privacy & Terms pages, cropped logo.

## Tested on the live site (2026-11-21)
Google login, profile record, verification request (pending), admin approval (verified), Firestore rules published.
Not yet tested: reject flow, non-admin access to admin.html, second user account.

## Phase 3 step 1 (built, untested)
post.html (create listing, Cloudinary photos, mark sold, delete), explore.html (newest first, category chips, search over loaded items, Load more). Needs: rules republished, listings index, Cloudinary config.

## Known gaps
No way to contact a seller yet (messaging is Phase 4). No listing detail/edit page yet.
Links to pages that do not exist yet. Search boxes not connected. Privacy & Terms page is a draft; review before inviting real students.
Duplicate student IDs cannot be blocked without server code; admin must check manually.

## Next
Phase 3: listings (Cloudinary images, create/edit, explore page).
