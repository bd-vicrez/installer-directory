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
