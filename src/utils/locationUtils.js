/**
 * locationUtils.js — Place type definitions (Unicons Adapter)
 */

export const PLACE_TYPES = [
  { id: 'medical',     label: 'Medical Store',   icon: 'uil-medical-square', keywords: ['pharmacy', 'chemist', 'medical', 'clinic', 'hospital', 'drug'] },
  { id: 'print',       label: 'Print Shop',       icon: 'uil-print',          keywords: ['print', 'xerox', 'copy', 'stationery', 'cyber'] },
  { id: 'bank',        label: 'Bank / ATM',       icon: 'uil-university',     keywords: ['bank', 'atm', 'finance', 'credit union'] },
  { id: 'grocery',     label: 'Grocery / Kirana', icon: 'uil-shopping-cart',  keywords: ['grocery', 'supermarket', 'kirana', 'provision', 'mart'] },
  { id: 'electronics', label: 'Electronics',      icon: 'uil-laptop',         keywords: ['electronics', 'mobile', 'computer', 'laptop', 'repair'] },
  { id: 'courier',     label: 'Courier / Post',   icon: 'uil-package',        keywords: ['courier', 'post', 'parcel', 'delivery', 'shipping'] },
  { id: 'tailor',      label: 'Tailor',           icon: 'uil-adjust',         keywords: ['tailor', 'alteration', 'stitch', 'fabric'] },
  { id: 'hardware',    label: 'Hardware Store',   icon: 'uil-wrench',         keywords: ['hardware', 'tools', 'electrical', 'plumber'] },
  { id: 'restaurant',  label: 'Restaurant / Cafe',icon: 'uil-utensils',       keywords: ['restaurant', 'cafe', 'food', 'bakery'] },
  { id: 'other',       label: 'Other',            icon: 'uil-map-marker',     keywords: [] },
];

export function getPlaceType(id) {
  return PLACE_TYPES.find(p => p.id === id) || PLACE_TYPES[PLACE_TYPES.length - 1];
}

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

export async function getNearbyPlaceTypes(lat, lng) {
  return PLACE_TYPES.map(p => p.id);
}

export function getRelevantTasks(tasks, nearbyTypeIds) {
  return tasks.filter(t =>
    t.locationTrigger &&
    nearbyTypeIds.includes(t.locationTrigger) &&
    t.status !== 'done'
  );
}
