# Project Status (2026-11-21)

Live: https://abrarfaiyaaz89.github.io/hatbodol/  (GitHub Pages, flat files in repo root)
Firebase project: hatbodol-1 (Spark plan). Login: Google (tested working).

## Done
Layout shell, homepage, Google login, profile record, student verification, admin approval (admin.html), 404 and Privacy & Terms pages, cropped logo.

## Tested on the live site (2026-11-21)
Google login, profile record, verification request (pending), admin approval (verified), Firestore rules published.
Not yet tested: reject flow, non-admin access to admin.html, second user account.

## Phase 3 step 1-2 (built, untested)
Also: live Recent listings on homepage, skeleton loaders, sort + sticky filters on Explore, photo remove/progress/counters on Post, avatar on Account.
post.html (create listing, Cloudinary photos, mark sold, delete), explore.html (newest first, category chips, search over loaded items, Load more). Needs: rules republished, listings index, Cloudinary config.

## UX round 2 (built, untested)
Animated login page (contour drawing, sliding tabs, Google button, loading spinners), full profile (avatar, verification badge, stats with count-up, department, masked student ID, bio editing, quick actions), toasts, hero headline reveal, image fade-in, bottom-nav pop. Rules updated: users may edit displayName and bio (republish firestore.rules).

## Account menu (built, untested)
usermenu.js: 32px avatar button, role=menu panel aligned to the avatar's right edge, label not focusable, Profile/Settings/Sign out, Escape returns focus. settings.html has dark mode and sound switches.

## Known gaps
No way to contact a seller yet (messaging is Phase 4). Listing detail page exists (listing.html); no edit page yet; Message seller button is disabled until Phase 4.
Links to pages that do not exist yet. Search boxes not connected. Privacy & Terms page is a draft; review before inviting real students.
Duplicate student IDs cannot be blocked without server code; admin must check manually.

## Next
Phase 3: listings (Cloudinary images, create/edit, explore page).
