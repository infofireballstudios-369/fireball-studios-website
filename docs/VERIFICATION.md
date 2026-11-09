# Static build verification — 9 November 2026

## Automated checks

- `npm install`: successful, locked dependencies installed; no backend services are needed.
- `npm run dev`: Vite serves the homepage, projects hub, project detail, spaceship article, contact page, stylesheet and TypeScript module successfully.
- TypeScript: passes.
- `npm test`: 37 tests pass, covering project/industry mappings, schemas, contact validation and encoded drafts, deferred iframe mounting, checked lifecycle cleanup, frame-cache bounds/recovery, all 384decodable frames, provenance, forward/reverse mapping, reduced motion and short viewports.
- `npm run build`: generates 20 page documents and valid static output, approximately 19.8 MB. The build checker verifies 482 local link references, 109 image elements, 20 JSON-LD blocks, complete frames, relative repository-prefix paths and zero initial video/iframe elements.
- An indexable build with `SITE_URL=https://example.github.io/fireball-gh-pages/ NOINDEX=false` passes. Default preview builds remain noindex.
- `npm run check:pages`: HTTP checks pass at `/` and `/test-repository/`, each covering 20 documents, 38 page/link targets, 22 asset references, local font URLs and the genuine 404 response.
- All six supplied Vimeo films returned HTTP 200 oEmbed metadata with the expected video identifiers. This does not prove browser playback or account-specific embed permissions.
- Dependency audit: no known vulnerabilities reported.

The configurator retains the original model data, author/source/licence notices, checked lifecycle bridge and static-host CSP. Its executable inline scripts are checked against the CSP hashes. The gallery contains genuine selected originals or documented WebP derivatives; animation frames are never used as portfolio photographs.

## Project isolation

The Next.js project and original media libraries are read-only references. The final SHA-256/content/modification-time comparison matches all 765 non-cache source/media files (496,221,248 bytes) against the pre-build snapshot, with zero changes. The original Git status is also unchanged: only the pre-existing untracked `.vscode/` folder is present. Dependency/build caches and Git internals were excluded from the file snapshot; no build or write operation was run against that project. Existing static starter files are preserved in `.archive/original-20261109/`, outside the published output and source control.

No existing repository was pushed or merged, no hosting project was changed, and no CNAME or domain/DNS setting was added. The included Pages workflow runs only when manually requested in this separate project's own repository.

## Browser review still required

The browser access host was unavailable. Automated DOM/HTTP tests are not a visual browser review. Before publication, review desktop/mobile appearance, keyboard focus, real forward/reverse scrolling, reduced motion, Vimeo playback and live WebGL controls. Verify Vimeo permits the chosen GitHub Pages hostname if account privacy settings restrict embedding.

The contact form intentionally opens an email draft and does not confirm sending or inbox receipt. Test it with the visitor's intended email application; the copy-brief and direct-email alternatives remain available if a mail handler is absent.

GitHub Pages' hosting restrictions and usage limits still apply; see DEPLOYMENT.md. Technical static compatibility does not establish business-hosting eligibility or unlimited availability.
