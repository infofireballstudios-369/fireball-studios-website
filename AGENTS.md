## Confirmed project direction

Use the existing supported Next.js 16 runtime, as confirmed by the user. Fireball Studios focuses on 3D visualisation for real estate, automotive, furniture, other products and creative concepts. Do not position the studio as a technical design consultancy or invent qualifications, client outcomes or guaranteed start times.

You are an expert Lead Technical Architect and Creative Web Developer. Read `AGENTS.md` thoroughly. We are building the high-performance, secure, SEO/AEO-optimised website for "Fireball Studios" (fireballstudios.co.uk) using the Modern Cinematic "Dark Studio" theme.

email: info@fireballstudios.co.uk
Phone: +447405052555

### STRATEGY: DIVIDE AND CONQUER
Do NOT write the codebase in a single pass. Approach this project by dividing the master objective into distinct, modular tasks. Complete each phase sequentially, verify build validity, and proceed to the next.

# AGENTS.md — Route & Asset Mapping Supplement

## Route Structure
- `/` — Home (Hero, Scroll Storytelling, Services, FAQ, CTA)
- `/projects` — Portfolio Grid (Categorised by Industry & Visualisation Type)
- `/projects/[slug]` — Individual Project Case Study Details
- `/industries` — Real Estate, Architects, Interior Design, Automotive, Product Manufacturers
- `/about` — Studio Background, Visualisation Approach, Workflows
- `/blog` — Insights, Architectural Tech, ArchViz Trends & AEO Search Hub
- `/contact` — Interactive Inquiry Form & Booking Pipeline

## Master Video & Sequence Mapping
- `3.mp4` / Frames `3/3.x.webp` ➔ **Home Hero & Initial Entry Scroll**
- Source 6 / Frames `6/6.x.webp` ➔ **Home Spaceship Concept & Creative Visualisation Transition**
- `5.mp4` / Frames `5/5.x.webp` ➔ **Home Product Visualisation & Final Call-To-Action Scroll**
- Source videos 1–6 use Vimeo for normal playback. Local originals are retained for frame preparation.
- Real Estate portfolio sources: 1, 3, 4. Architecture: 2. Furniture/products: 5. Automotive: the deferred car configurator.
- Source 6 is a studio spaceship concept used in the home story and blog only; keep it out of the Projects portfolio.
- Featured home projects are source assets 3 and 5, independent of portfolio IDs.
- Keep original gallery stills in `public/gallery/`; generated scroll frames belong in `public/frames/`.

---

### PHASE 1: Scaffolding, Global Theme & Fonts
1. Set up Next.js App Router with TypeScript, Tailwind CSS, and ESLint.
2. Configure `tailwind.config.js` with the "Dark Studio" color scheme:
   - Charcoal `#0F1115`, White `#FFFFFF`, Cobalt `#2563EB`, Amber `#D97706`.
3. Configure `next/font/google` in `src/app/layout.tsx` importing `Space Grotesk` (Headings) and `Plus Jakarta Sans` (Body).
4. Create the `.codexrules` or root `AGENTS.md` file enforcing strict UK English.
5. Optimise for both PC and smartphone access.

### PHASE 2: Data Architecture & Preloading Engine
1. Create `src/lib/assetManifest.ts` mapping source assets 1 to 6, Vimeo watch/embed URLs and local WebP sequences (`/public/frames/{id}/{id}.{frame}.webp`).
2. Create `src/lib/schema.ts` providing JSON-LD utilities for `Organization`, `LocalBusiness`, `Service`, and `FAQPage` schemas.
3. Create `src/types/portfolio.ts` defining dynamic types for scalable project entries.

### PHASE 3: GSAP Canvas Scroll Engine (`'use client'`)
1. Create `src/components/scroll/SequencePlayer.tsx` using GSAP ScrollTrigger to scrub WebP frames dynamically on HTML canvas based on viewport scroll position.
2. Include preloading states, viewport aspect-ratio scaling, and reduced-motion accessibility fallbacks.

### PHASE 4: Semantic UI & Text Overlays (SEO/AEO Layer)
1. `src/components/ui/Navbar.tsx`: Editorial branding, navigation, and Amber CTA button.
2. `src/lib/homeStory.ts` and `src/components/scroll/SequenceStory.tsx`: UK SEO heading (`<h1>Photorealistic 3D Visualisation That Brings Your Ideas to Life</h1>`) and immediate AEO direct answer block.
3. `src/components/ui/ServicesOverlay.tsx`: Grid covering Interior/Exterior Rendering, 360° Tours, Automotive & Product Visualisation.
4. `src/components/ui/ProcessOverlay.tsx`: 6-step workflow (Understand ➔ Design & Model ➔ Design Review ➔ Visualise ➔ Review & Refine ➔ Deliver).
5. `src/components/ui/FaqSection.tsx`: Structured Q&A tailored for AI search engines and property client queries.
6. `src/components/ui/ContactForm.tsx`: Compact name, phone, email and project description form with shared Zod validation, a Cobalt submit action and server-side email delivery.

### PHASE 5: Security, API & Integration Layer
1. Configure `next.config.js` with security headers (CSP, HSTS, X-Frame-Options).
2. Create `src/app/api/contact/route.ts` with Zod schema validation, string sanitisation, and rate limiting.

### PHASE 6: Master Assembly & Verification
1. Assemble `src/app/page.tsx` layering `SequencePlayer` behind pinned HTML content overlay sections.
2. Inject JSON-LD structured data into page `<head>`.
3. Run `npm run type-check` and `npm run build` to verify an error-free, production-ready build.

## Review workflow

Use the dedicated website repository and branch `codex/vimeo-portfolio-refresh` for this revision. Keep `main` at the existing baseline until the user approves merging. Do not push, merge or deploy without instruction. Load Vimeo players and the large car configurator only after explicit visitor interaction. Preserve model attribution and the configurator’s isolated lifecycle bridge.


## Maintenance and publishing

Start with `docs/PROJECT_GUIDE.md` for file ownership, `docs/EMAIL_AND_PUBLISHING.md` for email/domain setup, and `docs/SECURITY_AND_SCALE.md` for operational limits. Keep gallery data in one place; source 3 uses only original 3.4/3.5 stills. Use the clean release exporter for GitHub because local history contains archived files above GitHub’s normal file limit. Preserve the existing live site until its replacement is verified.

## Confirmed free hosting policy

Use the existing GitHub repository, Netlify Free, Resend Free and GA4 Standard. The owner has authorised the review-branch push and Netlify preview preparation; merging and production domain cutover still require approval. Keep paid upgrades, add-ons and automatic recharge disabled. The verified Netlify account has 300 shared monthly credits, no payment method and top-ups disabled. A hard cap can pause the website; never promise unlimited capacity or uninterrupted hosting at this allowance.

The default home story uses the generated, content-hashed WebP atlases in `public/atlases/` (24 sampled frames per chapter). Retain the original frame sequences for regeneration. Check the transfer budget before changing media. Keep the configurator deferred and preserve its model credits and scoped WebAssembly permission.

On Netlify, the custom native function owns `/api/contact` and declares the platform rate-limit rule. The generic Next.js handler remains protected for other hosts. Store Resend credentials in server-only environment settings; do not require a separate Redis account on Netlify. Keep analytics disabled until the existing GA4 stream's Enhanced Measurement is off and production activation is approved. Analytics requires visitor consent and must remain disabled on previews.
