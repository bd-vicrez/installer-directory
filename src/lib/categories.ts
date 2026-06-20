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
  'wheels-and-tires': {
    title: 'Wheel & Tire Installers Near You',
    description: 'Find professional wheel and tire installation shops. Aftermarket wheel fitment, tire mounting, balancing, TPMS service, alignment, and Vicrez wheel & tire package installation.',
    keywords: ['wheel', 'tire', 'rim', 'alignment', 'balancing'],
    heading: 'Wheel & Tire Installation Shops',
    intro: 'Find shops that specialize in aftermarket wheel and tire installation, including fitment, mounting, balancing, TPMS programming, and Vicrez wheel and tire package setups. Many shops also install VCORSA performance tires and hub-centric rings.',
    shortLabel: 'Wheel & Tire Installer',
  },
  'body-kits': {
    title: 'Body Kit & Bumper Installers Near You',
    description: 'Find expert body kit and bumper installation shops. OE replacement bumpers, front lips, side skirts, diffusers, spoilers, fender flares, and full widebody kit installation for Vicrez parts.',
    keywords: ['body kit', 'bumper', 'splitter', 'diffuser', 'spoiler', 'lip', 'side skirt', 'fender', 'aero'],
    heading: 'Body Kit & Bumper Installation Shops',
    intro: 'Professional shops that install Vicrez OE replacement bumpers, front lips, side skirts, rear diffusers, spoilers, fender flares, grilles, and full body kit conversions. Many installers also handle paint matching and test fitting for Vicrez aftermarket parts.',
    shortLabel: 'Body Kit Installer',
  },
  'vinyl-wrap': {
    title: 'Vinyl Wrap & Tint Installers Near You',
    description: 'Find professional vinyl wrap and window tint shops. Full vehicle wraps, color change wraps, accent wraps, window tint, and ceramic coating. Install Vicrez vinyl wrap products.',
    keywords: ['vinyl', 'wrap', 'tint', 'window tint', 'ceramic coat', 'detail'],
    heading: 'Vinyl Wrap & Tint Shops',
    intro: 'Shops specializing in Vicrez vinyl wrap installation, window tinting, ceramic coating, and automotive detailing services. Many shops handle full color change wraps, partial wraps, chrome deletes, and accent wrap projects.',
    shortLabel: 'Vinyl Wrap Installer',
  },
  'ppf-installers': {
    title: 'PPF (Paint Protection Film) Installers Near You',
    description: 'Find PPF installation experts for Vicrez paint protection film. Clear bra, self-healing film, full-body PPF, and partial PPF coverage for your vehicle.',
    keywords: ['ppf', 'paint protection', 'clear bra'],
    heading: 'Paint Protection Film (PPF) Installers',
    intro: 'Expert installers of Vicrez paint protection film (PPF), clear bra, and self-healing protective coatings. Services may include full-body PPF, partial front-end coverage, door edge guards, and custom-cut protection for high-impact areas.',
    shortLabel: 'PPF Installer',
  },
  'paint-bodywork': {
    title: 'Paint & Bodywork Shops Near You',
    description: 'Find professional auto body and paint shops. Custom paint, body repair, collision repair, refinishing, paint matching for Vicrez bumpers and body parts.',
    keywords: ['paint', 'body work', 'bodywork', 'collision', 'auto body', 'autobody', 'refinish'],
    heading: 'Paint & Body Work Shops',
    intro: 'Professional auto body shops offering custom paint, bodywork repairs, collision repair, refinishing, and paint matching services. Many of these shops can prep and paint Vicrez OE replacement bumpers, hoods, fenders, and body kit components.',
    shortLabel: 'Paint & Body Shop',
  },
  'widebody-kits': {
    title: 'Widebody Kit Installers Near You',
    description: 'Find shops that specialize in widebody kit installation. Vicrez widebody kits, fender flares, overfenders, and custom wide fender conversions with paint matching.',
    keywords: ['widebody', 'wide body', 'fender flare', 'overfender'],
    heading: 'Widebody Kit Installation Shops',
    intro: 'Shops experienced in installing Vicrez widebody conversion kits, including wide fender flares, bolt-on overfenders, and fully molded widebody setups. Many shops offer paint matching, body prep, and alignment services to complete the build.',
    shortLabel: 'Widebody Kit Installer',
  },
  'aero-parts': {
    title: 'Aero Parts & Spoiler Installers Near You',
    description: 'Find shops that install aerodynamic parts and spoilers. Front lips, side skirts, rear diffusers, splitters, spoilers, and Vicrez aero components.',
    keywords: ['aero', 'spoiler', 'lip', 'diffuser', 'splitter', 'side skirt', 'wing'],
    heading: 'Aero Parts & Spoiler Installation Shops',
    intro: 'Professional shops that install Vicrez aerodynamic parts including front lips, side skirts, rear diffusers, splitters, spoilers, and wings. Services may include test fitting, hardware installation, and paint matching for a factory-finished look.',
    shortLabel: 'Aero Parts Installer',
  },
  'custom-builds': {
    title: 'Custom Build Shops Near You',
    description: 'Find shops for full custom vehicle builds. Restomod, show car, custom fabrication, complete vehicle transformations using Vicrez parts and accessories.',
    keywords: ['custom', 'build', 'fabricat', 'restomod', 'show car'],
    heading: 'Custom Build & Fabrication Shops',
    intro: 'Full-service custom shops for complete vehicle builds, custom fabrication, restomods, and show car preparation. Many of these shops work with the full Vicrez product line including body kits, aero parts, wheels, tires, vinyl wrap, and PPF.',
    shortLabel: 'Custom Build Shop',
  },
};

export const CATEGORY_SLUGS = Object.keys(CATEGORIES);

/**
 * Filter installers whose `install_capabilities` text matches a category's keywords.
 * Case-insensitive substring match.
 */
import type { Installer } from './types';

export function filterInstallersByCategory<T extends Installer>(
  installers: T[],
  categorySlug: string,
): T[] {
  const cfg = CATEGORIES[categorySlug];
  if (!cfg) return [];
  return installers.filter((i) => {
    const cap = (i.install_capabilities || '').toLowerCase();
    return cfg.keywords.some((kw) => cap.includes(kw.toLowerCase()));
  });
}
