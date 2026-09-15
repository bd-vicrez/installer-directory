import type { Installer } from './types';
import { getTier, parseCapabilities } from './utils';

export const PUBLIC_INSTALLER_FIELDS = [
  'id', 'slug', 'business_name', 'street_address', 'city', 'state', 'zip_code',
  'phone', 'website', 'install_capabilities', 'shop_type', 'specialize_in',
  'lat', 'lng', 'google_place_id', 'google_rating', 'google_review_count',
  'google_hours', 'google_phone', 'google_website', 'google_status',
] as const;
export type PublicInstaller = Pick<Installer, typeof PUBLIC_INSTALLER_FIELDS[number]> & {
  tier: 'verified' | 'listed'; distance: number | null; rating: number | null; capabilities: string[];
};
// Never spread a database row into a response or client-component prop.
export function toPublicInstaller(row: Record<string, any>): PublicInstaller {
  const result: Record<string, any> = {};
  for (const key of PUBLIC_INSTALLER_FIELDS) result[key] = row[key] ?? null;
  return {
    ...result,
    tier: row.tier === 'verified' ? 'verified' : row.tier === 'listed' ? 'listed' : getTier(row.source || ''),
    distance: row.distance == null ? null : Math.round(Number(row.distance) * 10) / 10,
    rating: row.google_rating == null ? null : Number(row.google_rating),
    capabilities: parseCapabilities(row.install_capabilities || ''),
  } as PublicInstaller;
}
export const SERVICE_KEYWORDS: Record<string, string[]> = {
  'Body Kits': ['body kit', 'aero', 'bumper', 'splitter', 'diffuser', 'spoiler', 'lip', 'side skirt', 'fender'],
  'Paint/Bodywork': ['paint', 'body work', 'bodywork', 'collision', 'auto body', 'autobody', 'refinish'],
  'Vinyl/Wraps': ['vinyl', 'wrap', 'tint', 'ceramic coat', 'detail'],
  'PPF': ['ppf', 'paint protection', 'clear bra'],
  'Performance Mods': ['performance', 'exhaust', 'turbo', 'supercharger', 'tune', 'tuning', 'suspension', 'intake', 'engine'],
  'Wheels/Tires': ['wheel', 'tire', 'rim', 'alignment'],
};
export function readSearchOptions(params: URLSearchParams) {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const raw = params.get(key), value = raw == null ? fallback : Number(raw);
    if (raw === '' || !Number.isFinite(value) || value < min || value > max) throw new Error('Invalid ' + key);
    return value;
  };
  const hasLat = params.has('lat'), hasLng = params.has('lng');
  if (hasLat !== hasLng) throw new Error('Location requires latitude and longitude');
  const service = params.get('service') || '';
  if (service && !SERVICE_KEYWORDS[service]) throw new Error('Invalid service');
  const tier = params.get('tier') || '';
  if (tier && tier !== 'verified') throw new Error('Invalid tier');
  const q = (params.get('q') || '').trim();
  if (q.length > 120) throw new Error('Location is too long');
  const limit = number('limit', 24, 1, 48), offset = number('offset', 0, 0, 100000);
  if (!Number.isInteger(limit) || !Number.isInteger(offset)) throw new Error('Invalid page');
  return { q, service, tier, limit, offset, radius: number('radius', 50, 1, 250),
    lat: hasLat ? number('lat', 0, -90, 90) : null, lng: hasLng ? number('lng', 0, -180, 180) : null };
}
