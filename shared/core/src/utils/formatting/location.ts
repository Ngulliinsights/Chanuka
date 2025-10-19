/**
 * Location Formatting Utilities
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function formatCoordinates(coords: Coordinates): string {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
}

export function formatPropertyLocation(location: string): string {
  return location.split(',').map(part => 
    part.trim().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  ).join(', ');
}

export function formatCounty(county: string): string {
  return county.charAt(0).toUpperCase() + county.slice(1).toLowerCase() + ' County';
}

export function formatAddress(
  street: string,
  city: string,
  county?: string,
  postalCode?: string
): string {
  const parts = [street, city];
  if (county) parts.push(formatCounty(county));
  if (postalCode) parts.push(postalCode);
  return parts.join(', ');
}












































