# Profile clarity and crawlable navigation — 2026-09-11

## Evidence and limits
Ten profiles were selected from existing `[New Dealer Form]` directory records in the authorized installer mirror (snapshot 2026-09-11 11:30 UTC). Each live profile returned HTTP 200 with a self-canonical URL, was in the 1,002-URL sitemap, and had no noindex before this change. This was a review of existing records, not fresh confirmation with the businesses or independent certification. No shop data was changed and no new images or completed-project claims were added.

| Profile slug | Existing record basis for tailored quote questions |
|---|---|
| b-wraps-las-vegas-nv | Aero/body kits and paint/bodywork; specialty mentions Chargers and Challengers |
| performance-off-road-automotive-bakersfield-ca | Aero/body kits and paint/bodywork; accessories, vehicle service and repair |
| central-auto-customs-inc-sacramento-ca | Widebody and aero/body kits, paint/bodywork; Mopar/Hellcat widebody specialty |
| atomic-wraps-olympia-wa | Aero/body kits and vinyl wrap; broad vehicle types including boats, motorcycles and RVs |
| jc-emergency-lighting-llc-forked-river-nj | Wheels/tires, paint/bodywork and aero/body kits; police, fire and EMS vehicles and everyday vehicles |
| rubio-premier-motors-westhampton-ny | Aero/body kits and paint/bodywork; motorcycles, ATVs and exotics mentioned |
| dent-pro-usa-of-lafayette-lafayette-la | Aero/body kits and paint/bodywork; custom aftermarket specialty |
| curley-reds-auto-body-half-moon-bay-ca | Aero/body kits and paint/bodywork; collision repair and paint |
| wrap-elements-llc-san-antonio-tx | Aero/body kits, widebody, wheels/tires, suspension, vinyl wrap, paint/bodywork and performance mods |
| cuztom-graphics-llc-muskogee-ok | Aero/body kits, widebody, wheels/tires, suspension, vinyl wrap, paint/bodywork and performance mods |

The quote-preparation notes are questions and customer preparation guidance, not promises that the shops currently accept a particular job. They fail closed for removed/excluded records, non-pilot slugs, and records without the dealer-form source. The homepage query independently applies those eligibility limits.

## Shared accuracy fixes
- Profile titles/descriptions and LocalBusiness descriptions no longer assert every installation service for every business.
- Recorded business contact fields take precedence over Google-enriched fallback fields consistently in visible contact details and schema.
- Do not create a one-review aggregate rating from internal notes, assume a price range, or present the Vicrez logo as a shop image.
- Google-sourced ratings stay visible with a source label, but are not republished as review-rich-result markup. Google's review guidelines prohibit aggregating ratings from other websites.
- Keep opening hours visible as recorded; do not create malformed openingHoursSpecification values from unvalidated human-formatted hours.
- Escape `<` when serializing profile JSON-LD.

## Trust and navigation
About, Contact and How Verification Works explain directory ownership, source-based labels and their limits, and existing support contact routes. Contact links do not automatically edit/remove records. No email delivery test was sent. The footer links to the trust pages and /start; the homepage links to the ten eligible profiles; those profiles link to relevant existing guides.

## Regression tests
Run `node --test tests/profile-content.test.cjs` and `node node_modules/typescript/bin/tsc --noEmit`.

Local route/build validation can use an isolated copy with explicit mirror-backed test data. That does not prove live database execution; verify the real production build and rendered URLs separately.
