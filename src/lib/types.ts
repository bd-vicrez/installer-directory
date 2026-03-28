export interface Installer {
  id: string | number;
  slug: string;
  business_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  install_capabilities: string;
  shop_type: string;
  specialize_in: string;
  source: string;
  status: string;
  date_added: string;
  internal_notes: string;
  lat: number | null;
  lng: number | null;
  feedback: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_hours: Record<string, unknown> | null;
  google_phone: string | null;
  google_website: string | null;
  google_photos_url: string | null;
  google_status: string | null;
  google_types: string[] | null;
  enriched_at: string | null;
}

export interface InstallerWithMeta extends Installer {
  tier: 'verified' | 'listed';
  distance: number | null;
  rating: number | null;
  capabilities: string[];
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
}

export interface RemovalRequest {
  shop_name: string;
  email: string;
  reason: string;
}
