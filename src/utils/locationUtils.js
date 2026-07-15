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
  const query = `[out:json];(node(around:500,${lat},${lng})[shop];node(around:500,${lat},${lng})[amenity=pharmacy];node(around:500,${lat},${lng})[amenity=bank];node(around:500,${lat},${lng})[amenity=atm];node(around:500,${lat},${lng})[amenity=restaurant];node(around:500,${lat},${lng})[amenity=cafe];);out;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Overpass API error');
    const data = await res.json();
    const detectedTypes = new Set();

    if (data.elements) {
      for (const el of data.elements) {
        const tags = el.tags || {};
        const shop = tags.shop || '';
        const amenity = tags.amenity || '';
        const name = tags.name || '';

        for (const pt of PLACE_TYPES) {
          const match = pt.keywords.some(k =>
            shop.toLowerCase().includes(k) ||
            amenity.toLowerCase().includes(k) ||
            name.toLowerCase().includes(k)
          );
          if (match) {
            detectedTypes.add(pt.id);
          }
        }
      }
    }
    return Array.from(detectedTypes);
  } catch (err) {
    console.error('Failed to fetch nearby shops:', err);
    return [];
  }
}

export function getRelevantTasks(tasks, nearbyTypeIds) {
  return tasks.filter(t =>
    t.locationTrigger &&
    nearbyTypeIds.includes(t.locationTrigger) &&
    t.status !== 'done'
  );
}

export async function runLocationCheck(tasks, onMatch) {
  try {
    const { lat, lng } = await getCurrentPosition();
    const nearbyTypeIds = await getNearbyPlaceTypes(lat, lng);
    const matched = getRelevantTasks(tasks, nearbyTypeIds);
    if (matched.length > 0) {
      onMatch(matched);
    }
  } catch (err) {
    console.error('Failed runLocationCheck:', err);
  }
}
