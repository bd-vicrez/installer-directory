import { Installer } from "./types";
import { reviewedProfile } from "./profile-indexing";

// The measurement cohort is deliberately small. It does not replace sitemap admission.
export const PILOT_UPDATED = "2026-10-27";
export const PILOT_GUIDES = [
  "customer-supplied-parts-installation",
  "compare-installation-quotes",
];

export const PILOT_PROFILES: Record<string, { focus: string; prepare: string; request: string }> = {
  "b-wraps-las-vegas-nv": {
    focus: "Charger and Challenger body-kit planning",
    prepare: "Send the model year, trim, bumper configuration and kit part numbers. Separate the parts already owned from items still being selected, and include photos of existing modifications.",
    request: "I have a [year / trim] Charger or Challenger and am considering [part numbers]. Can you review the application and quote test fitting, preparation, paint and assembly separately? Please identify any work you would refer elsewhere.",
  },
  "central-auto-customs-inc-sacramento-ca": {
    focus: "Mopar widebody project scope",
    prepare: "List the proposed panels, current wheels and suspension changes. Ask the shop to identify any required panel modifications before agreeing to a conversion; the recorded specialty alone does not answer that question.",
    request: "For my [year / model / trim], I am considering [widebody kit]. Can you assess panel modifications, test fitting and finish work, and identify any separate wheel or suspension work before I order?",
  },
  "atomic-wraps-olympia-wa": {
    focus: "Wrap coverage and aero-part preparation",
    prepare: "Identify the vehicle type, desired coverage, paint condition and existing film. For a combined wrap and aero project, list the parts that must be fitted before the finishing work is planned.",
    request: "I would like [color change / graphics / partial coverage] on my [vehicle]. Here are photos and the proposed coverage. Can you confirm surface preparation, removal work, materials and edges included, plus whether you accept the aero parts in my list?",
  },
  "kustom-kreations-inc-fitchburg-ma": {
    focus: "Existing-kit installation or custom fabrication",
    prepare: "Choose whether the request is to fit a purchased kit or develop a custom part. The shop publishes both installation and design services; a design reference should be labeled separately from a finished part ready to install.",
    request: "My project is [install an existing kit / design a custom part] for [vehicle]. Here are the parts or reference drawings. Which design, fabrication, fitting and paint stages would you quote, and what inspection is needed first?",
  },
  "speedpro-chicago-loop-chicago-il-66fd2024": {
    focus: "Commercial vehicle graphics and wrap scope",
    prepare: "State whether the request is fleet branding, partial graphics or a full color change. Include vehicle quantity, artwork status and surfaces to cover. Confirm automotive installation at this branch before sending artwork for production.",
    request: "We have [quantity / vehicle models] and need [graphics / wrap coverage]. Do you accept this automotive project at the Chicago Loop branch? Please separate artwork, proofs, production, removal and installation in the estimate.",
  },
};

export const PILOT_CITIES: Record<string, { city: string; state: string; shop: string; title: string; context: string; checks: string[] }> = {
  "fitchburg-ma": {
    city: "Fitchburg", state: "MA", shop: "kustom-kreations-inc-fitchburg-ma",
    title: "Planning bodywork in Fitchburg",
    context: "Kustom Kreations publishes body-kit installation alongside custom paint, bodywork and design/prototyping. That distinction matters when comparing an off-the-shelf kit installation with a request to create a new part. Its website lists visits by appointment; arrange a project review before travelling or sending parts.",
    checks: [
      "For a purchased kit, supply the manufacturer, part numbers and vehicle details so the shop can assess the fitting and finish stages.",
      "For a custom design, supply dimensions or reference images and ask which design and fabrication stages need separate estimates.",
      "Confirm the appointment, receiving arrangements and written scope directly with the shop.",
    ],
  },
  "chicago-il": {
    city: "Chicago", state: "IL", shop: "speedpro-chicago-loop-chicago-il-66fd2024",
    title: "Planning vehicle graphics in Chicago",
    context: "SpeedPro Chicago Loop's directory application describes vehicle wraps and fleet graphics. Its branch website emphasizes large-format printing and commercial signage. Start by confirming whether this branch accepts the automotive scope you need, especially if it is a full color change rather than business graphics.",
    checks: [
      "For fleet branding, identify each vehicle model, the number of vehicles, artwork ownership and whether proofs are included.",
      "For partial graphics or a color change, specify covered panels, existing film and any removal work before comparing prices.",
      "Ask where installation takes place and how vehicles will be scheduled; a printing service list alone does not confirm those arrangements.",
    ],
  },
};

export const PILOT_PATHS = [
  "/",
  ...Object.keys(PILOT_CITIES).map((slug) => `/installers/${slug}`),
  ...Object.keys(PILOT_PROFILES).map((slug) => `/installer/${slug}`),
  ...PILOT_GUIDES.map((slug) => `/guides/${slug}`),
];

export function pilotProfile(shop: Installer) {
  return reviewedProfile(shop) && Object.hasOwn(PILOT_PROFILES, shop.slug)
    ? PILOT_PROFILES[shop.slug]
    : null;
}

export function supportedPilotCities(shops: Installer[]) {
  return Object.entries(PILOT_CITIES).filter(([, city]) =>
    shops.some((shop) => shop.slug === city.shop && shop.city === city.city &&
      shop.state === city.state && pilotProfile(shop)),
  );
}
