# Installer indexing pilot — October 27, 2026

The pilot improves ten existing pages and measures whether Google recrawls and indexes them. It does not restrict the rest of the directory to ten URLs or promise indexing.

## Pages and evidence

| Page | Reason for inclusion | Evidence and boundary |
| --- | --- | --- |
| [Homepage](https://installers.vicrez.com/) | Search entry point; links directly to the other nine pages | Live directory records; featured profiles pass the same identity and service checks as their editorial briefs |
| [Fitchburg, MA](https://installers.vicrez.com/installers/fitchburg-ma) | Distinguishes purchased-kit installation from custom fabrication | Kustom Kreations' own website; the supporting record must remain unchanged |
| [Chicago, IL](https://installers.vicrez.com/installers/chicago-il) | Helps distinguish fleet graphics from color-change requests | SpeedPro's approved application and branch website; automotive scope must be confirmed |
| [B wraps, Las Vegas](https://installers.vicrez.com/installer/b-wraps-las-vegas-nv) | Charger/Challenger project preparation | Business submission held by Vicrez; current availability and exact-kit experience are unconfirmed |
| [Central Auto Customs, Sacramento](https://installers.vicrez.com/installer/central-auto-customs-inc-sacramento-ca) | Mopar widebody planning | Business submission; panel modifications, fitting, paint and related work require an agreed estimate |
| [Atomic Wraps, Olympia](https://installers.vicrez.com/installer/atomic-wraps-olympia-wa) | Wrap coverage and aero-part preparation | Business submission; acceptance of a particular vehicle, film or supplied part must be confirmed |
| [Kustom Kreations, Fitchburg](https://installers.vicrez.com/installer/kustom-kreations-inc-fitchburg-ma) | Separates installation from design/fabrication | [Shop website](https://kustombodyworks.com/), reviewed October 27; no claim of a completed Vicrez project |
| [SpeedPro Chicago Loop](https://installers.vicrez.com/installer/speedpro-chicago-loop-chicago-il-66fd2024) | Commercial graphics request brief | [Branch website](https://www.speedpro.com/chicago-loop/) emphasizes printing/signage; vehicle-wrap scope comes from the application |
| [Customer-supplied parts guide](https://installers.vicrez.com/guides/customer-supplied-parts-installation) | Helps customers confirm scope before buying or shipping | Original project checklist with a downloadable editable worksheet |
| [Quote comparison guide](https://installers.vicrez.com/guides/compare-installation-quotes) | Helps customers compare the same work | Original comparison worksheet; no assumed local prices |

The five profile reviews were checked against current records on October 27. An editorial review is separate from owner reconfirmation, inquiry permission and evidence of completed work. No photographs, projects, certifications or shop permissions were invented or added.

## Content changes

- The city/state template no longer renders the legacy `city_seo` intro, local-scene, questions or cost-context fields. The database contains 498 city rows. Existing records are retained; their presence alone is not evidence of content quality.
- Generic lists claiming what local shops install, and the unsupported “popular parts installed” section, were replaced by a concise estimate-preparation checklist.
- Chicago and Fitchburg gain attributed local project briefs. A changed, removed or geographically mismatched supporting business suppresses the corresponding brief and homepage promotion.
- Five profiles gain distinct project-preparation notes and request templates. Editorial dates now come from the actual review record.
- Two guides gain editable text worksheets, a working worksheet anchor, a route back to search, and accurate modification dates.
- The homepage links all nine supporting pages. The sitemap includes the ten canonical URLs and truthful October 27 modification dates. Fitchburg is added through its evidence guard; the existing sitemap cohort is preserved.

## Baseline and measurement

Search Console's aggregate indexing report last updated October 22 showed zero indexed pages and 1,003 submitted pages excluded. October 18–24 Web performance showed zero clicks and zero impressions. The homepage inspection on October 27 showed a successful October 25 crawl, indexing allowed and the correct user canonical, but “Crawled — currently not indexed.” These are pre-release observations, not results of this pilot.

Keep an exact-page filter for these ten paths when reviewing Search Console. Record the inspection state, last crawl, fetch result, indexing allowance and Google-selected canonical separately. HTTP 200, a sitemap entry and correct metadata establish technical eligibility; they do not establish inclusion in Google's index.

Suggested review dates after deployment are October 30, November 3, November 10 and November 24. No new recurring automation is created by this document. Compare recrawl dates to the deployment timestamp, then check indexed pages, non-brand impressions/clicks, landing sessions and saved inquiries. Do not repeatedly request unchanged URLs. If Google recrawls the changes but continues to exclude the pages, inspect the remaining content and source evidence before expanding the cohort.

GA4's October 19–25 baseline was 121 sessions and 45 engaged sessions. Bing, ChatGPT, Vicrez Driver, YouTube, Yahoo and DuckDuckGo contributed some attributed traffic; Google organic growth has not been demonstrated. One lead event, two saved applications and one saved claim were recorded. Those events are not proof of booked installations or a person-level analytics-to-record match.

## Validation and rollback

The release must pass the test suite, production build, ten-page HTTP/metadata/link/sitemap checks, worksheet downloads, two non-pilot city checks, pagination/noindex checks and withdrawn/invalid-route checks. Check the city quote opener without submitting a test lead. Check mobile wrapping and the desktop profile brief.

The content is version-controlled. Reverting the release restores the prior template and sitemap behavior without a database migration. The removed Premier Auto Solutions record remains excluded. The daily application agent, inquiry permissions and owner access are outside this change.
