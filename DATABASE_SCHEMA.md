# Database Schema (Firestore, Spark plan)

Images live on Cloudinary (cloud name in cloudinary-config.js); Firestore stores only image URLs. Every campus-owned document carries campusId ('cu') so more universities can be added later.

## Built
| Collection | Fields | Access |
|---|---|---|
| users/{uid} | displayName, email, campusId, role ('student'), verificationStatus (unverified/pending/verified/rejected), createdAt, bio (optional, max 160) | Owner and admin read. Owner edits displayName and bio only, and may move unverified/rejected to pending. Admin sets verified/rejected. |
| admins/{uid} | any field | Created by hand in the Firebase console. Owner can read own doc; no client writes. |
| studentProfiles/{uid} | studentId, department, universityEmail, submittedAt | Owner and admin read. Owner writes only while unverified/rejected. |
| listings/{id} | type (sell/exchange), title, description, category, condition, price, images[] (max 3, Cloudinary URLs), titleKeywords[], ownerId, ownerName, campusId, status (active/sold/hidden), createdAt | Anyone reads active listings; owner/admin read all of theirs. Verified students create. Owner toggles active/sold; admin may hide. Owner or admin deletes. |

| publicProfiles/{uid} | displayName, photo (Cloudinary URL), bio, department, session, hometown (one of the 64 districts), verified (bool) | Any signed-in user reads. Owner writes; owner can only set verified to match the real account status. Admin writes. |
| addresses/{uid} | permanent, present, visible (bool) | Owner and admins read. Anyone signed-in reads only when visible = true. Owner writes. |
| studentIds/{uid} | studentId | Owner, admins and verified students read. Value must equal the admin-reviewed ID in studentProfiles. |
| reviews/{reviewerId_targetId} | reviewerId, reviewerName, targetId, as (seller/buyer), rating (1-5), text, createdAt | Signed-in read. Verified students create (not for themselves, not for admins). Reviewer edits or deletes own; admin deletes. |

Admin badge: admins/{uid} is readable by signed-in users, so a profile shows the Admin badge when that document exists. Ratings are computed in the browser from reviews.
Limitation until Phase 4: a rating is not tied to a completed deal (no transactions yet).

## Planned (not built)
conversations, messages, transactions, reports, blocks, notifications, vendorProfiles, campuses, categories.

## Needed index
listings: status (Ascending) + createdAt (Descending). Explore shows a link to create it if missing.

## Free-plan notes
- Search is client-side over loaded listings (no full-text search on Spark).
- Paginate lists; avoid wide real-time listeners (daily read quota).
- Student ID photos are not stored. Verification is by ID number, reviewed manually.
- Duplicate student IDs cannot be blocked without server code; admin checks manually.
