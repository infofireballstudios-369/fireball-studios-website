# Native media quality and scroll loading

The home story retains sources **3 → 6 → 5**, with 96 frames per chapter. All 384 original 1280px frame files for sources 3, 4, 5 and 6 remain unchanged. Gallery stills remain separate from animation frames.

Higher-resolution frames are extracted directly from the genuine films, not enlarged from the older WebPs. No AI generation, invented geometry, sharpening or synthetic detail is used. Source interfaces, branding and intentional depth of field remain visible where present in the recordings. The product film retains its original camera and material changes.

## Sources and exact timing

| Source | Genuine source | Native size | Extraction |
| --- | --- | --- | --- |
| 3 | `website-FB/public/videos/3.mp4` | 3840 × 2160, 30fps | Start 3s, duration 8s, 12fps, 96 frames |
| 6 | `Projects/Edited-2/6.mp4.mov` | 3840 × 2160, 30fps | Start 7.6s, duration 96/18s, 18fps, 96 frames |
| 5 | `website-FB/public/videos/5.mp4` | 1920 × 1080, approximately 60fps | Start 15s, duration 8s, 12fps, 96 frames; crop to 1920 × 1000 at x=0, y=32 |

These preserve the existing sequence timings. The source 5 crop removes desktop recording chrome; it does not remove the application's interface. Sources 3 and 5 were verified byte-identical to their `Projects/Edited/` originals.

New frames use WebP quality 88 and FFmpeg compression level 5. They live at `public/frames/quality/{id}/{width}/{id}.{frame}.webp`. Source 5 stops at its genuine 1920px width. Source 4 remains available at the existing 1280px resolution.

## Automatic selection

The player chooses one resolution for the current chapter and can replace it after a viewport or connection-preference change:

| Condition, evaluated in this order | Selected frame width |
| --- | --- |
| Save-Data, reported 2g/slow-2g connection, or viewport ≤900 CSS pixels | 1280px |
| Source 5 on a larger screen | 1920px |
| Sources 3/6: viewport ≥2400 CSS pixels and viewport × capped pixel ratio ≥3200 | 3840px |
| Sources 3/6: viewport ≥1800 CSS pixels and pixel ratio >1 | 2560px |
| Other desktop screens | 1920px |

The pixel ratio is capped at 1.5, matching the canvas drawing limit. If a browser does not expose connection information, selection uses the screen dimensions. Reduced motion, viewports ≤680px tall, or story copy that cannot fit below the header use the static semantic layout and request no animation frames.

Frames load progressively around the requested position; there is no whole-sequence preload. Only the current chapter has a store. Normal decoding runs at most two requests at once. The approximate RGBA cache budget is 24 MiB at viewport widths ≤900px and 48 MiB otherwise, enforced using decoded dimensions. Known frame dimensions reserve memory before decoding. At 3840px, only one frame fits: decoding is serial, neighbouring frames are not requested, and the old bitmap is released before decoding the next one. These are decoded-frame cache budgets, not limits on total browser memory; the canvas backing store, compressed responses, JavaScript and GPU copies also use memory.

Requests have an 8-second deadline and one retry when they become the requested frame. Reverse scrolling uses the same frame mapping. Unavailable media restores the static content and a link to the original Vimeo film. Header changes, font loading and layout resizing recheck that every chapter's text fits.

## Measured transfer sizes

These are decimal bytes for one complete, uncached traversal of all 288 home frames, measured from the shipped files. The 2560px and 3840px totals include the product chapter at its native 1920px maximum.

| Tier | Source 3 | Source 6 | Source 5 | Total | 5,000 complete uncached traversals |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1280px original | 4,303,794 | 4,201,768 | 2,438,336 | **10,943,898 bytes (10.94 MB)** | 54.72 GB |
| 1920px | 12,218,018 | 10,045,276 | 6,112,834 | **28,376,128 bytes (28.38 MB)** | 141.88 GB |
| 2560px | 17,854,318 | 14,132,232 | 6,112,834 | **38,099,384 bytes (38.10 MB)** | 190.50 GB |
| 3840px | 30,572,728 | 22,808,536 | 6,112,834 | **59,494,098 bytes (59.49 MB)** | 297.47 GB |

A traversal can request up to 288 distinct animation URLs. Fast scrolling may skip frames, and browser caching may reuse downloaded files; neither is a guaranteed bandwidth reduction. Switching tiers, repeated uncached visits, galleries, posters, other page resources, bots and configurator launches add traffic. The higher tiers therefore do **not** promise 5,000 full visits within a 100 GB allowance. Use the host's actual traffic reporting and the separate deployment guidance when judging capacity.

All seven new frame sets together occupy 113,743,942 bytes on disk. This is a deployment library size, not a mandatory per-visitor download. The eight responsive poster variants occupy another 1,570,930 bytes collectively; the browser chooses a candidate for each image.

## Clean responsive posters

`getSequencePoster(id, base)` returns `src`, `srcset`, `sizes`, `width` and `height`. The stage poster and static chapter image share the same candidate URLs so their requests can be reused.

- Source 3 uses the genuine clean `Projects/Images/3.5.webp`: 1280px derivative and the **byte-identical native 1920px original**, without enlargement.
- Source 5 uses the clean `Projects/Images/5.2.png`: 1280px and 1920px WebPs, preserving the established chair composition.
- Source 6 uses the original film at 2s: 1280px, 1920px, 2560px and native 3840px WebPs.

The residence's clean still has less native resolution than its 4K recorded demonstration. Keeping the clean still is deliberate; it avoids substituting a HUD-filled frame or inventing detail. All source stills and the original poster library remain intact.

## Reproduce the optional extraction

Normal builds and tests use the shipped files. They do not require the original media archive, the previous website, or FFmpeg. To regenerate the quality variants deliberately, supply read-only source locations and an installed FFmpeg binary:

```sh
node scripts/prepare-quality-assets.mjs \
  --projects=/path/to/Projects \
  --live=/path/to/website-FB \
  --ffmpeg=/path/to/ffmpeg
```

The script writes only this standalone project's `public/` derivatives and `public/media-manifest.json`. Provenance records relative source identifiers, source hashes, timing, dimensions, per-file sizes and hashes. The base `prepare-assets` importer preserves the separately generated quality provenance. Neither preparation command runs automatically during a build.

Tests verify every derivative's presence, size and hash, decode the first and last frame of each resolution set, check genuine resolution limits and poster sources, and exercise cache eviction, cancellation, deadlines, quality selection and static fallbacks. Endpoint/contact-sheet inspection confirms the expected source content. A browser host was unavailable during this revision: real-device visual sharpness, rapid scrolling, touch behaviour, font enlargement and GPU memory still require an interactive browser review.
