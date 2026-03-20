import { Installer, InstallerWithMeta, GeoLocation } from './types';

const VERIFIED_KEYWORDS = [
  '[New Dealer Form]',
  '[CS Sheet]',
  '[Vicrez Business Network]',
  'Alex Cold Call',
  'manual',
];

export function isVerified(source: string): boolean {
  if (!source) return false;
  const lower = source.toLowerCase();
  return VERIFIED_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

export function getTier(source: string): 'verified' | 'listed' {
  return isVerified(source) ? 'verified' : 'listed';
}

export function parseRating(internalNotes: string | null): number | null {
  if (!internalNotes) return null;
  // Look for patterns like "4/5", "rating: 4", "★★★★" or "4 stars"
  const slashMatch = internalNotes.match(/(\d(?:\.\d)?)\s*\/\s*5/);
  if (slashMatch) return parseFloat(slashMatch[1]);

  const starMatch = internalNotes.match(/rating[:\s]*(\d(?:\.\d)?)/i);
  if (starMatch) return parseFloat(starMatch[1]);

  const starCount = (internalNotes.match(/★/g) || []).length;
  if (starCount > 0 && starCount <= 5) return starCount;

  return null;
}

export function parseCapabilities(capString: string | string[]): string[] {
  if (!capString) return [];
  if (Array.isArray(capString)) return capString.filter(Boolean);
  return capString
    .split(/[,;|]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

const CAPABILITY_CATEGORIES: Record<string, string[]> = {
  'Body Kits': ['body kit', 'body kits', 'aero', 'aerodynamic', 'bumper', 'splitter', 'diffuser', 'spoiler', 'lip', 'side skirt', 'fender'],
  'Paint/Bodywork': ['paint', 'body work', 'bodywork', 'collision', 'auto body', 'autobody', 'refinish', 'ppf', 'paint protection'],
  'Vinyl/Wraps': ['vinyl', 'wrap', 'wraps', 'tint', 'window tint', 'ceramic coat', 'detail'],
  'Performance Mods': ['performance', 'exhaust', 'turbo', 'supercharger', 'tune', 'tuning', 'suspension', 'intake', 'engine'],
  'Wheels/Tires': ['wheel', 'wheels', 'tire', 'tires', 'rim', 'rims', 'alignment'],
};

export function matchesCapabilityFilter(
  installer: InstallerWithMeta,
  filter: string
): boolean {
  if (!filter) return true;
  const keywords = CAPABILITY_CATEGORIES[filter];
  if (!keywords) return true;
  const text = `${installer.install_capabilities} ${installer.specialize_in} ${installer.shop_type}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Haversine distance in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export async function geocodeZip(zip: string): Promise<GeoLocation | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      city: place['place name'],
      state: place['state abbreviation'],
    };
  } catch {
    return null;
  }
}

export function enrichInstaller(
  installer: Installer,
  userLocation: GeoLocation | null
): InstallerWithMeta {
  const tier = getTier(installer.source);
  const rating = parseRating(installer.internal_notes);
  const capabilities = parseCapabilities(installer.install_capabilities);

  let distance: number | null = null;
  if (userLocation && installer.lat && installer.lng) {
    distance = haversineDistance(
      userLocation.lat,
      userLocation.lng,
      installer.lat,
      installer.lng
    );
    distance = Math.round(distance * 10) / 10;
  }

  return {
    ...installer,
    tier,
    distance,
    rating,
    capabilities,
  };
}

export function sortInstallers(installers: InstallerWithMeta[]): InstallerWithMeta[] {
  return installers.sort((a, b) => {
    // Verified first
    if (a.tier === 'verified' && b.tier !== 'verified') return -1;
    if (a.tier !== 'verified' && b.tier === 'verified') return 1;

    // Then by distance (null distances go last)
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    if (a.distance !== null) return -1;
    if (b.distance !== null) return 1;

    return 0;
  });
}

export function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function formatDistance(miles: number | null): string {
  if (miles === null) return '';
  if (miles < 1) return '< 1 mi';
  return `${miles.toFixed(1)} mi`;
}
