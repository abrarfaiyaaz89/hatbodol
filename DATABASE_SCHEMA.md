# Database Schema (Firestore, Spark plan)

Plan only; nothing is created yet. Every campus-owned document carries `campusId` so more universities can be added later. Images live on Cloudinary; Firestore keeps only the URL.

| Collection | Key fields | Access (target rules) |
|---|---|---|
| users | role (student/vendor), verificationStatus (unverified/pending/verified), campusId, displayName, createdAt | Owner reads/writes own non-role fields; admin reads all. Role/status changed by admin only. |
| admins | doc id = uid | Created manually in console; rules check existence. No client writes. |
| studentProfiles | uid, studentId, department, universityEmail | Owner and admin only. |
| vendorProfiles | uid, businessName, items, contact, verified | Public read when verified; owner edits; admin verifies. |
| campuses | name, slug, active | Public read; admin write. |
| categories | name, slug, type | Public read; admin write. |
| listings | ownerId, campusId, type (sell/exchange/rent/borrow/service/lostfound), title, titleKeywords[], price, condition, categoryId, images[], status, rental fields | Public read of active; verified owner creates/edits own; admin moderates. |
| conversations | participantIds[], listingId, lastMessageAt, unread map | Participants only. |
| messages | conversationId, senderId, text, createdAt | Participants only. |
| transactions | listingId, buyerId, sellerId, status, confirmations | Two parties and admin. |
| reviews | transactionId, reviewerId, targetId, rating, text | Public read; created only after a completed transaction. |
| reports | reporterId, targetType, targetId, reason, status | Reporter creates; admin reads/updates. |
| blocks | blockerId, blockedId | Blocker only. |
| notifications | userId, type, read, createdAt | Owner only. |

## Free-plan notes
- Search: `titleKeywords` array + `array-contains`; no full-text search.
- Paginate lists; avoid wide real-time listeners (daily read quota).
- Student ID photos are not stored. Verify by ID number + CU email, approved manually.
