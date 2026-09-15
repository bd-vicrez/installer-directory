export async function geocodeLocation(query: string) {
  if (/^\d{5}$/.test(query)) {
    const response = await fetch('https://api.zippopotam.us/us/' + query, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
    if (response.ok) {
      const data = await response.json(), place = data.places?.[0];
      if (place) return { lat: Number(place.latitude), lng: Number(place.longitude), label: place['place name'] + ', ' + place['state abbreviation'] };
    }
    return null;
  }
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('Geocoder unavailable');
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('components', 'country:US');
  url.searchParams.set('key', key);
  const response = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error('Geocoder unavailable');
  const data = await response.json();
  if (data.status === 'ZERO_RESULTS') return null;
  if (data.status !== 'OK') throw new Error('Geocoder unavailable');
  const first = data.results[0], components = first.address_components;
  const city = components.find((c: any) => c.types.includes('locality'))?.long_name;
  const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name;
  return { lat: first.geometry.location.lat, lng: first.geometry.location.lng, label: city && state ? city + ', ' + state : first.formatted_address };
}
