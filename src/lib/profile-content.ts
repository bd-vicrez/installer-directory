import { Installer } from "./types";
import { isVerified, parseCapabilities } from "./utils";

// Pilot selected from existing dealer-form records, reviewed September 11, 2026.
// These are quote-preparation questions, not claims about completed projects.
export const PROFILE_QUOTE_NOTES: Record<string, string> = {
  "b-wraps-las-vegas-nv":
    "For a Charger or Challenger project, include the model year, trim and exact aero or body-kit part numbers. Ask which fitment and paint work the shop can quote for your vehicle.",
  "performance-off-road-automotive-bakersfield-ca":
    "Describe your vehicle, current modifications and the accessories you want installed. Ask whether the quote covers fitting the parts, paint or bodywork, and any related service work.",
  "central-auto-customs-inc-sacramento-ca":
    "For a Mopar widebody project, include the model year, trim and kit part numbers. Ask about panel preparation, test fitting and paint, and request an itemized scope before booking.",
  "atomic-wraps-olympia-wa":
    "Identify the vehicle or other project and the areas you want wrapped. For an aero-kit project, include the part numbers and ask which preparation and fitting work is included.",
  "jc-emergency-lighting-llc-forked-river-nj":
    "Describe whether the project is for an emergency-service vehicle or an everyday vehicle. List the wheel, paint or aero work requested and confirm the shop can handle that specific scope.",
  "rubio-premier-motors-westhampton-ny":
    "Identify the vehicle type, model year and proposed parts. For a motorcycle, ATV or exotic-vehicle project, confirm the exact work the shop accepts rather than assuming every listed service applies.",
  "dent-pro-usa-of-lafayette-lafayette-la":
    "Include photos of the panels involved and the exact aftermarket parts you want fitted. Ask whether the estimate includes existing-damage repair, preparation and paint matching.",
  "curley-reds-auto-body-half-moon-bay-ca":
    "Describe any collision damage separately from the aftermarket installation. Include the vehicle details and part numbers, and ask for the repair, fitting and paint scope to be itemized.",
  "wrap-elements-llc-san-antonio-tx":
    "List each part of your project separately, such as wrap, body-kit, wheel or suspension work. Confirm which services the shop currently accepts and the order in which the work would be completed.",
  "cuztom-graphics-llc-muskogee-ok":
    "List the graphics or wrap areas and any body-kit, wheel or suspension parts involved. Ask for the accepted scope, preparation requirements and estimated timing before arranging delivery.",
};

export const REVIEWED_PROFILE_SLUGS = Object.keys(PROFILE_QUOTE_NOTES);

export function getProfileDescription(installer: Installer): string {
  const capabilities = parseCapabilities(installer.install_capabilities);
  const location = [installer.city, installer.state].filter(Boolean).join(", ");
  const project =
    installer.owner_details_confirmed_at &&
    installer.owner_details?.projects?.[0];
  if (project?.vehicle && project?.summary)
    return `${installer.business_name}${location ? ` in ${location}` : ""}. Shop-reported project: ${project.vehicle}. ${project.summary}`.slice(
      0,
      300,
    );
  return `${installer.business_name}${location ? ` in ${location}` : ""}. ${capabilities.length ? `Listed services: ${capabilities.join(", ")}.` : "Contact the shop to confirm available installation services."}`;
}

export function getProfileQuoteNote(installer: Installer): string | null {
  // Fail closed if a record is removed from the pilot or loses its dealer-form source.
  if (
    !isVerified(installer.source) ||
    !installer.source.toLowerCase().includes("[new dealer form]")
  )
    return null;
  if (["removed", "non_us_excluded"].includes(installer.status)) return null;
  return PROFILE_QUOTE_NOTES[installer.slug] || null;
}

export function getProfileGuide(
  installer: Installer,
): { href: string; label: string } | null {
  const caps = parseCapabilities(installer.install_capabilities)
    .join(" ")
    .toLowerCase();
  if (caps.includes("widebody"))
    return {
      href: "/guides/widebody-kit-installation-guide",
      label: "Plan a widebody installation",
    };
  if (caps.includes("vinyl") || caps.includes("wrap"))
    return {
      href: "/guides/vinyl-wrap-cost-guide",
      label: "Plan a vinyl-wrap project",
    };
  if (caps.includes("body kit") || caps.includes("aero"))
    return {
      href: "/guides/how-to-choose-body-kit-installer",
      label: "Questions to ask a body-kit installer",
    };
  if (caps.includes("wheel") || caps.includes("tire"))
    return {
      href: "/guides/wheel-and-tire-installation-guide",
      label: "Plan a wheel-and-tire installation",
    };
  return null;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
