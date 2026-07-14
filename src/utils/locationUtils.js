/**
 * locationUtils.js — Place type definitions and Geolocation helpers
 */

export const PLACE_TYPES = [
  { id: 'medical',     label: 'Medical Store',   icon: '💊', keywords: ['pharmacy', 'chemist', 'medical', 'clinic', 'hospital', 'drug'] },
  { id: 'print',       label: 'Print Shop',       icon: '🖨️', keywords: ['print', 'xerox', 'copy', 'stationery', 'cyber'] },
  { id: 'bank',        label: 'Bank / ATM',       icon: '🏦', keywords: ['bank', 'atm', 'finance', 'credit union'] },
  { id: 'grocery',     label: 'Grocery / Kirana', icon: '🛒', keywords: ['grocery', 'supermarket', 'kirana', 'provision', 'mart'] },
  { id: 'electronics', label: 'Electronics',      icon: '💻', keywords: ['electronics', 'mobile', 'computer', 'laptop', 'repair'] },
  { id: 'courier',     label: 'Courier / Post',   icon: '📦', keywords: ['courier', 'post', 'parcel', 'delivery', 'shipping'] },
  { id: 'tailor',      label: 'Tailor',           icon: '🧵', keywords: ['tailor', 'alteration', 'stitch', 'fabric'] },
  { id: 'hardware',    label: 'Hardware Store',   icon: '🔧', keywords: ['hardware', 'tools', 'electrical', 'plumber'] },
  { id: 'restaurant',  label: 'Restaurant / Cafe',icon: '🍽️', keywords: ['restaurant', 'cafe', 'food', 'bakery'] },
  { id: 'other',       label: 'Other',            icon: '📍', keywords: [] },
];

export function getPlaceType(id) {
  return PLACE_TYPES.find(p => p.id === id) || PLACE_TYPES[PLACE_TYPES.length - 1];
}

/**
 * Request current position via browser Geolocation API.
 * Returns a promise resolving to { lat, lng } or throws.
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

/**
 * Use Google Maps Geocoding to find nearby place types from coordinates.
 * NOTE: In production, plug in a real API key. This returns a stub for now.
 */
export async function getNearbyPlaceTypes(lat, lng) {
  // Stub — returns all place types so user can manually match
  // Replace with Google Places API call when API key is available
  return PLACE_TYPES.map(p => p.id);
}

/**
 * Find tasks relevant to detected nearby place types
 */
export function getRelevantTasks(tasks, nearbyTypeIds) {
  return tasks.filter(t =>
    t.locationTrigger &&
    nearbyTypeIds.includes(t.locationTrigger) &&
    t.status !== 'done'
  );
}
