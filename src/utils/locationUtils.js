/**
 * locationUtils.js — Place type definitions with structured OSM tag queries.
 *
 * WHY: The previous implementation matched keywords against OSM node name/shop/amenity
 * strings. This is fragile — OSM uses structured tags like amenity=pharmacy or
 * shop=copyshop, not free-text names. Keyword matching misses most nodes and produces
 * false positives. This version builds precise Overpass QL queries from tag descriptors.
 */

const OVERPASS_URL    = 'https://overpass-api.de/api/interpreter';
const DEFAULT_RADIUS  = 500; // metres

/**
 * PLACE_TYPES
 * Each entry describes a category the user can attach to a task.
 *
 * osm: [{ key, value }]
 *   - key/value → exact OSM tag match (e.g. amenity=pharmacy)
 *   - value: null → any value for that key (catch-all, e.g. shop=*)
 *
 * hint: human-readable description of what OSM types are covered.
 *   Shown as a live hint below the Location Trigger dropdown in TaskForm.
 */
export const PLACE_TYPES = [
  {
    id: 'medical',
    label: 'Medical Store',
    icon: 'uil-medical-square',
    hint: 'Pharmacies, clinics, hospitals',
    osm: [
      { key: 'amenity', value: 'pharmacy' },
      { key: 'amenity', value: 'clinic' },
      { key: 'amenity', value: 'hospital' },
      { key: 'shop',    value: 'medical_supply' },
    ],
  },
  {
    id: 'print',
    label: 'Print Shop',
    icon: 'uil-print',
    hint: 'Copy shops, stationery stores',
    osm: [
      { key: 'shop', value: 'copyshop' },
      { key: 'shop', value: 'stationery' },
    ],
  },
  {
    id: 'bank',
    label: 'Bank / ATM',
    icon: 'uil-university',
    hint: 'Banks and ATM machines',
    osm: [
      { key: 'amenity', value: 'bank' },
      { key: 'amenity', value: 'atm' },
    ],
  },
  {
    id: 'grocery',
    label: 'Grocery / Kirana',
    icon: 'uil-shopping-cart',
    hint: 'Supermarkets, kirana, convenience stores',
    osm: [
      { key: 'shop', value: 'supermarket' },
      { key: 'shop', value: 'grocery' },
      { key: 'shop', value: 'convenience' },
      { key: 'shop', value: 'greengrocer' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: 'uil-laptop',
    hint: 'Electronics, mobile, computer shops',
    osm: [
      { key: 'shop', value: 'electronics' },
      { key: 'shop', value: 'mobile_phone' },
      { key: 'shop', value: 'computer' },
    ],
  },
  {
    id: 'courier',
    label: 'Courier / Post',
    icon: 'uil-package',
    hint: 'Post offices, courier drop-off points',
    osm: [
      { key: 'amenity', value: 'post_office' },
      { key: 'shop',    value: 'courier' },
    ],
  },
  {
    id: 'tailor',
    label: 'Tailor',
    icon: 'uil-adjust',
    hint: 'Tailors and alteration shops',
    osm: [
      { key: 'craft', value: 'tailor' },
      { key: 'shop',  value: 'tailor' },
    ],
  },
  {
    id: 'hardware',
    label: 'Hardware Store',
    icon: 'uil-wrench',
    hint: 'Hardware, tools, electrical shops',
    osm: [
      { key: 'shop', value: 'hardware' },
      { key: 'shop', value: 'doityourself' },
      { key: 'shop', value: 'tools' },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant / Cafe',
    icon: 'uil-utensils',
    hint: 'Restaurants, cafes, fast food outlets',
    osm: [
      { key: 'amenity', value: 'restaurant' },
      { key: 'amenity', value: 'cafe' },
      { key: 'amenity', value: 'fast_food' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'uil-map-marker',
    hint: 'Any shop or retail location',
    osm: [
      { key: 'shop', value: null }, // any shop= tag
    ],
  },
];

export function getPlaceType(id) {
  return PLACE_TYPES.find(p => p.id === id) ?? PLACE_TYPES[PLACE_TYPES.length - 1];
}

// ── Overpass helpers ──────────────────────────────────────────────────────────

/**
 * Build a single Overpass QL union query from an array of OSM tag descriptors.
 * Produces: [out:json]; ( node(around:R,lat,lng)[key=val]; ... ); out;
 */
function buildOverpassQuery(osmTags, lat, lng, radius = DEFAULT_RADIUS) {
  const nodes = osmTags
    .map(({ key, value }) => {
      const filter = value ? `[${key}=${value}]` : `[${key}]`;
      return `  node(around:${radius},${lat},${lng})${filter};`;
    })
    .join('\n');
  return `[out:json];\n(\n${nodes}\n);\nout;`;
}

async function runOverpassQuery(query) {
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();
  return data.elements ?? [];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

/**
 * Check a single category near the user's current position.
 * Used by the per-type "Near Me?" button on the Places tab.
 *
 * @returns {{ found: boolean, shopNames: string[] }}
 */
export async function getNearbyShopsForCategory(lat, lng, categoryId) {
  const pt = getPlaceType(categoryId);
  if (!pt?.osm?.length) return { found: false, shopNames: [] };

  const query    = buildOverpassQuery(pt.osm, lat, lng);
  const elements = await runOverpassQuery(query);

  const shopNames = elements
    .map(el => el.tags?.name)
    .filter(Boolean)
    .slice(0, 4); // cap at 4 names to keep the toast readable

  return { found: elements.length > 0, shopNames };
}

/**
 * Get all nearby place type IDs in one round-trip.
 * Used by the full "Check Location" button.
 */
export async function getNearbyPlaceTypes(lat, lng) {
  // One big union query covering all categories
  const allTags  = PLACE_TYPES.flatMap(pt => pt.osm);
  const query    = buildOverpassQuery(allTags, lat, lng);
  const elements = await runOverpassQuery(query);

  const detectedTypes = new Set();
  for (const el of elements) {
    const tags = el.tags ?? {};
    for (const pt of PLACE_TYPES) {
      const matched = pt.osm.some(({ key, value }) => {
        const tagVal = tags[key];
        if (!tagVal) return false;
        return value ? tagVal === value : true;
      });
      if (matched) detectedTypes.add(pt.id);
    }
  }

  return Array.from(detectedTypes);
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
    if (matched.length > 0) onMatch(matched);
  } catch (err) {
    console.error('runLocationCheck failed:', err);
  }
}
