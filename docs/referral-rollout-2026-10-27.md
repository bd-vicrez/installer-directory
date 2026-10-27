# Installer referral rollout — prepared October 27, 2026

Status: ready for review; external placements have not been published.

The first rollout should help customers who are already choosing parts reach installation planning. Vicrez product pages already link to the directory in navigation and the footer. Add a short, relevant block beside installation guidance instead of repeating the same sitewide link.

## Placements

| Order | Target | Placement | Destination |
| --- | --- | --- | --- |
| 1 | [Charger kit vz102117](https://www.vicrez.com/us/products/vicrez-demon-full-complete-wide-body-kit-vz102117-dodge-charger-2015-2016-2017-2018-2019-2020) | Immediately after installation/technical notes | Directory search plus supplied-parts checklist |
| 2 | [Widebody kit store](https://www.vicrez.com/us/vicrez-widebody-kits) | Beside the kit-selection guidance, after the product selection area | Directory search |
| 3 | [Teddy's Challenger build](https://vicrezdriver.com/teddys-dodge-challenger-widebody-build/) | After the parts/build discussion and before the closing shopping call to action | Quote comparison guide |
| 4 | [Grand Cherokee widebody showcase](https://vicrezdriver.com/jeep-grand-cherokee-srt-widebody-build-demon-style-kit-wheels-vcorsa-tires/) | At the installation/fitment planning discussion | Supplied-parts checklist |
| 5 | [Vicrez Charger vz102199 installation](https://www.youtube.com/watch?v=JB3dv10-BhI) | Description, directly after the existing product links | Directory search plus supplied-parts checklist |

The two article targets are existing pages. The added copy must not identify any pilot shop as the installer of those builds. The video is published by the vicrez.com channel. Confirm editing access to that channel before publishing.

## Product page block

**Heading:** Plan the installation before ordering

**Copy:** Need a shop to install these parts? Search local directory listings, then confirm your vehicle, exact part numbers, preparation and finish work with the shop. Agree on a written scope before ordering or shipping parts to a business.

**Links:** Find an installer near you · Prepare your parts and installation brief

Ready-to-place HTML for the vz102117 product:

```html
<section aria-labelledby="installation-planning">
  <h3 id="installation-planning">Plan the installation before ordering</h3>
  <p>Need a shop to install these parts? Search local directory listings, then confirm your vehicle, exact part numbers, preparation and finish work with the shop. Agree on a written scope before ordering or shipping parts to a business.</p>
  <p><a href="https://installers.vicrez.com/?utm_source=vicrez&amp;utm_medium=referral&amp;utm_campaign=installer_pilot_20261027&amp;utm_content=product_vz102117">Find an installer near you</a></p>
  <p><a href="https://installers.vicrez.com/guides/customer-supplied-parts-installation?utm_source=vicrez&amp;utm_medium=referral&amp;utm_campaign=installer_pilot_20261027&amp;utm_content=product_vz102117_checklist">Prepare your parts and installation brief</a></p>
</section>
```

For the widebody category, use the same heading and copy and this single link:

[Find an installer near you](https://installers.vicrez.com/?utm_source=vicrez&utm_medium=referral&utm_campaign=installer_pilot_20261027&utm_content=category_widebody)

## Article additions

**Teddy's Challenger build:** Planning your own widebody project? Give each shop the same vehicle details, part numbers and requested finish. Our [installation quote worksheet](https://installers.vicrez.com/guides/compare-installation-quotes?utm_source=vicrez&utm_medium=referral&utm_campaign=installer_pilot_20261027&utm_content=driver_teddy_challenger) helps you compare preparation, fitting, finishing and exclusions before choosing an estimate.

**Grand Cherokee showcase:** Before buying parts for your own build, confirm the vehicle application and installation scope with a shop. Use the [customer-supplied parts checklist](https://installers.vicrez.com/guides/customer-supplied-parts-installation?utm_source=vicrez&utm_medium=referral&utm_campaign=installer_pilot_20261027&utm_content=driver_grand_cherokee) to record accepted parts, receiving arrangements and work that still needs inspection.

These are planning links. Neither passage promises that the displayed setup fits another vehicle or that a featured directory shop completed the pictured build.

## YouTube description addition

```text
Need help planning your installation? Find local directory listings and confirm your vehicle, exact parts and written scope with the shop:
https://installers.vicrez.com/?utm_source=youtube&utm_medium=social&utm_campaign=installer_pilot_20261027&utm_content=video_JB3dv10-BhI

Before ordering or shipping parts, use this installation-planning checklist:
https://installers.vicrez.com/guides/customer-supplied-parts-installation?utm_source=youtube&utm_medium=social&utm_campaign=installer_pilot_20261027&utm_content=video_JB3dv10-BhI_checklist
```

## Measurement and release sequence

Use campaign `installer_pilot_20261027`. The prepared links use `vicrez / referral` and `youtube / social`, which the directory's acquisition classifier recognizes. Distinct `utm_content` values separate the placements in GA4. Server-side inquiry records retain source/channel, not the full campaign/content fields; don't claim placement-level server attribution from those records.

1. Verify the pilot release is live and the destination pages return 200 with clean canonicals.
2. Publish the product block and two article additions when rollout is authorized; preserve a copy of each prior block for rollback. Publish the video addition only through the channel that owns it.
3. Test each published link once, verify the query parameters survive, and exclude staff QA from customer reporting. Do not submit fake inquiries.
4. Review after seven and fourteen complete days in GA4's property timezone. Compare sessions, engaged sessions and saved inquiries by source and campaign. Cross-check saved inquiries against production records and record actual shop replies separately.

A useful result is a relevant customer inquiry with follow-through, not merely a spike in pageviews. Keep the placements if they bring useful visits; revise copy or destination when visitors arrive but do not reach search, profiles or an inquiry. With low volume, report counts and uncertainties rather than unstable conversion percentages.

Do not add campaign parameters to links within installers.vicrez.com. Internal links remain canonical so they do not reset acquisition attribution. Avoid blanket city-page blasts or repeated unchanged indexing requests.

## Source checks

Placement context was reviewed on October 27 using the product/category pages, the two articles and the public video listing. Product navigation/footer links to the installer directory already exist. The new blocks are prepared additions, not claims of changes to those properties.

The pilot follows Google's guidance on [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) and [requesting recrawls](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl). Links and recrawl requests cannot guarantee indexing.
