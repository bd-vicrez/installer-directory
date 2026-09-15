import { directoryServices, normalizeService } from "./service-taxonomy";
/**
 * Shared installer service category config.
 * Used by:
 *   - /installers/category/[category]   (national)
 *   - /installers/[location]/[category] (city/state + service combo - SEO long-tail)
 */

export interface CategoryConfig {
  title: string;
  description: string;
  keywords: string[];
  heading: string;
  intro: string;
  /** Short SEO label, e.g. "Body Kit Installer" - used in city+service title */
  shortLabel: string;
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  "wheels-and-tires": {
    title: "Wheel & Tire Installers Near You",
    description:
      "Browse shops with recorded services related to wheel and tire work. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: ["wheel", "tire", "rim", "alignment", "balancing"],
    heading: "Wheel & Tire Installation Shops",
    intro:
      "These listings have recorded services related to wheel and tire work. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "Wheel & Tire Installer",
  },
  "body-kits": {
    title: "Body Kit & Bumper Installers Near You",
    description:
      "Browse shops with recorded services related to body kits and bumpers. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: [
      "body kit",
      "bumper",
      "splitter",
      "diffuser",
      "spoiler",
      "lip",
      "side skirt",
      "fender",
      "aero",
    ],
    heading: "Body Kit & Bumper Installation Shops",
    intro:
      "These listings have recorded services related to body kits and bumpers. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "Body Kit Installer",
  },
  "vinyl-wrap": {
    title: "Vinyl Wrap Installers Near You",
    description:
      "Browse shops with recorded services related to vinyl wrap. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: [
      "vinyl",
      "wrap",
      "tint",
      "window tint",
      "ceramic coat",
      "detail",
    ],
    heading: "Vinyl Wrap Shops",
    intro:
      "These listings have recorded services related to vinyl wrap. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "Vinyl Wrap Installer",
  },
  "ppf-installers": {
    title: "PPF (Paint Protection Film) Installers Near You",
    description:
      "Browse shops with recorded services related to paint protection film. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: ["ppf", "paint protection", "clear bra"],
    heading: "Paint Protection Film (PPF) Installers",
    intro:
      "These listings have recorded services related to paint protection film. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "PPF Installer",
  },
  "paint-bodywork": {
    title: "Paint & Bodywork Shops Near You",
    description:
      "Browse shops with recorded services related to paint and bodywork. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: [
      "paint",
      "body work",
      "bodywork",
      "collision",
      "auto body",
      "autobody",
      "refinish",
    ],
    heading: "Paint & Body Work Shops",
    intro:
      "These listings have recorded services related to paint and bodywork. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "Paint & Body Shop",
  },
  "widebody-kits": {
    title: "Widebody Kit Installers Near You",
    description:
      "Browse shops with recorded services related to widebody conversions. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: ["widebody", "wide body", "fender flare", "overfender"],
    heading: "Widebody Kit Installation Shops",
    intro:
      "These listings have recorded services related to widebody conversions. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "Widebody Kit Installer",
  },
  "aero-parts": {
    title: "Aero Parts & Spoiler Installers Near You",
    description:
      "Browse shops with recorded services related to aero parts and spoilers. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: [
      "aero",
      "spoiler",
      "lip",
      "diffuser",
      "splitter",
      "side skirt",
      "wing",
    ],
    heading: "Aero Parts & Spoiler Installation Shops",
    intro:
      "These listings have recorded services related to aero parts and spoilers. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "Aero Parts Installer",
  },
  "custom-builds": {
    title: "Custom Build Shops Near You",
    description:
      "Browse shops with recorded services related to custom builds and fabrication. Confirm current capabilities, parts acceptance and availability with the shop.",
    keywords: ["custom", "build", "fabricat", "restomod", "show car"],
    heading: "Custom Build & Fabrication Shops",
    intro:
      "These listings have recorded services related to custom builds and fabrication. Ask each shop whether it handles your specific vehicle and accepts your parts, including any Vicrez products. Listing information does not certify workmanship or guarantee availability.",
    shortLabel: "Custom Build Shop",
  },
};

CATEGORIES["window-tint"] = {
  title: "Window tint shops",
  description:
    "Browse recorded window tint services. Confirm film options and current availability with the shop.",
  keywords: ["window tint", "tint"],
  heading: "Window Tint Shops",
  intro:
    "These shops have recorded window tint services. Ask about your vehicle, film and local requirements.",
  shortLabel: "Window Tint Shop",
};
CATEGORIES["performance"] = {
  title: "Performance and suspension shops",
  description: "Browse recorded performance and suspension services.",
  keywords: ["performance", "suspension"],
  heading: "Performance & Suspension Shops",
  intro:
    "Confirm the specific modification and vehicle with each shop before scheduling.",
  shortLabel: "Performance Shop",
};
export const CATEGORY_SLUGS = Object.keys(CATEGORIES);

/**
 * Filter installers whose `install_capabilities` text matches a category's keywords.
 * Case-insensitive substring match.
 */
import type { Installer } from "./types";

function capabilitiesText(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw.toLowerCase();
  if (Array.isArray(raw)) return raw.filter(Boolean).join(" ").toLowerCase();
  // Postgres jsonb/object
  try {
    return JSON.stringify(raw).toLowerCase();
  } catch {
    return "";
  }
}

export function filterInstallersByCategory<T extends Installer>(
  installers: T[],
  categorySlug: string,
): T[] {
  const cfg = CATEGORIES[categorySlug];
  if (!cfg) return [];
  return installers.filter((i) =>
    directoryServices(i.install_capabilities).includes(
      normalizeService(categorySlug),
    ),
  );
}
