# HATBODOL - Permanent Instructions

Student marketplace, University of Chittagong (CU) first, expandable to other universities.

## Hard constraints
- 100% free. Owner has no card and no money. Never require Firebase Blaze, a card, a domain or any paid tool.
- Allowed: Firebase Spark (Auth email/password, Firestore, Hosting), Cloudinary free tier (images), GitHub, GSAP (free).
- NOT allowed: Cloud Functions, Firebase Storage, phone/SMS auth, paid APIs.
- Free address: hatbodol.web.app (if available).

## Stack
HTML5, CSS3, vanilla JS. No frameworks unless clearly justified and approved.

## Branding
- Use supplied assets only. Do not invent or replace logo, fonts or colours.
- Logo: trolley with HB monogram; wordmark "Hat Bodol" (charcoal + orange Bodol). Orange is a logo accent unless owner confirms wider use.
- Look: black/white, strong contrast, flowing thin contour-line patterns, rounded cards, black curved header shapes.
- Reference images: take only the named visual features, never their text or layouts.

## Working rules
- Small phases, one task at a time. Never generate the whole site at once.
- Short explanations. Inspect only relevant files. Reuse code. No duplicate docs.
- Security and correctness come before saving tokens.
- Ask before major architecture or branding changes.
- Never claim something works, is tested or deployed unless verified.
- No fake users, vendors or listings. No dead buttons in "finished" features.
- Keep keys, admin secrets and student IDs out of the repo and frontend.
- Commit before overwriting any working version.

## Security
Firestore rules enforce all permissions. Roles live in Firestore; admins are set manually in the console. Validate inputs and uploads. Support report and block.

## Motion
CSS/SVG first, GSAP only where useful. Transform/opacity only, 60 FPS target, low-end Android first, respect prefers-reduced-motion. No forced intro.

## Completion report
Completed / Files / Tests / Next. Concise.
