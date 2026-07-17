/**
 * locationUtils.js — Place type definitions with structured OSM tag queries.
 *
 * WHY: The previous implementation matched keywords against OSM node name/shop/amenity
 * strings. This is fragile — OSM uses structured tags like amenity=pharmacy or
 * shop=copyshop, not free-text names. Keyword matching misses most nodes and produces
 * false positives. This version builds precise Overpass QL queries from tag descriptors.
 */

// Primary + fallback Overpass endpoints. If the primary is busy the request is
// retried once, then re-attempted on the mirror.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const RADIUS_KEY     = 'flowtask_loc_radius';
const DEFAULT_RADIUS = 2000; // metres
const RETRY_DELAY_MS = 2000;
const LOC_OVERRIDE_KEY = 'flowtask_loc_override'; // { lat, lng, label }

export function getRadius() {
  const stored = parseInt(localStorage.getItem(RADIUS_KEY), 10);
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_RADIUS;
}

export function setRadius(metres) {
  localStorage.setItem(RADIUS_KEY, String(metres));
}

/**
 * Manual location override — stored in localStorage so it persists across page reloads.
 * When set, getCurrentPosition() returns this immediately (no GPS call).
 */
export function getLocationOverride() {
  try {
    const raw = localStorage.getItem(LOC_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed;
  } catch { /* ignore */ }
  return null;
}

export function setLocationOverride(lat, lng, label = '') {
  localStorage.setItem(LOC_OVERRIDE_KEY, JSON.stringify({ lat, lng, label }));
}

export function clearLocationOverride() {
  localStorage.removeItem(LOC_OVERRIDE_KEY);
}

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

/**
 * Classify a raw Overpass response.
 *
 * The API can return three things:
 *   1. HTTP 4xx/5xx  → hard error, no retry.
 *   2. HTTP 200 + JSON  → success.
 *   3. HTTP 200 + XML   → server busy / timeout (common on the free tier).
 *      Body looks like: <p><strong>Error</strong>: runtime error … timeout.</p>
 *
 * We detect case 3 by checking the Content-Type header before calling .json().
 */
class OverpassError extends Error {
  constructor(message, { busy = false } = {}) {
    super(message);
    this.name  = 'OverpassError';
    this.busy  = busy; // true → safe to retry
  }
}

function extractXmlError(text) {
  // Pull the text inside <p>…</p> that follows the <strong>Error</strong> tag.
  const match = text.match(/<strong[^>]*>Error<\/strong>\s*:\s*([^<]+)/i);
  return match ? match[1].trim() : 'Overpass server error (unknown reason)';
}

async function tryFetch(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });

  if (!res.ok) {
    throw new OverpassError(`Overpass HTTP ${res.status}`, { busy: res.status >= 500 });
  }

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();

  if (!contentType.includes('json') && (text.trimStart().startsWith('<') || text.trimStart().startsWith('<?'))) {
    // Server returned XML → extract the human-readable reason.
    const reason = extractXmlError(text);
    const isBusy = /timeout|too busy|rate limit/i.test(reason);
    throw new OverpassError(reason, { busy: isBusy });
  }

  try {
    const data = JSON.parse(text);
    return data.elements ?? [];
  } catch {
    throw new OverpassError('Overpass returned malformed JSON.');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run an Overpass query with:
 *   - 1 automatic retry (after RETRY_DELAY_MS) on busy/timeout errors.
 *   - Fallback to the secondary mirror endpoint if the retry also fails.
 */
async function runOverpassQuery(query) {
  const endpoints = [...OVERPASS_ENDPOINTS];

  for (let endpointIdx = 0; endpointIdx < endpoints.length; endpointIdx++) {
    const url = `${endpoints[endpointIdx]}?data=${encodeURIComponent(query)}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await tryFetch(url);
      } catch (err) {
        const isLast = endpointIdx === endpoints.length - 1 && attempt === 1;

        if (err instanceof OverpassError && err.busy && !isLast) {
          // Wait before retrying (first attempt) or before trying mirror (second attempt).
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        if (isLast) throw err; // propagate to caller after all options exhausted

        // Non-busy error on a non-last endpoint: try mirror immediately.
        break;
      }
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCurrentPosition() {
  // If the user has set a manual override, use it immediately.
  const override = getLocationOverride();
  if (override) return Promise.resolve({ lat: override.lat, lng: override.lng });

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
 * Haversine great-circle distance between two coordinates.
 * @returns distance in metres
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R  = 6_371_000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check a single category near the user's current position.
 * Used by the per-type "Near Me?" button on the Places tab.
 *
 * @returns {{ found: boolean, shops: Array<{name:string|null, lat:number, lng:number, distance:number, osmType:string}> }}
 *   shops is sorted by distance ascending, capped at 8.
 */
export async function getNearbyShopsForCategory(lat, lng, categoryId) {
  const pt = getPlaceType(categoryId);
  if (!pt?.osm?.length) return { found: false, shops: [] };

  const query    = buildOverpassQuery(pt.osm, lat, lng, getRadius());
  const elements = await runOverpassQuery(query);

  const shops = elements
    .filter(el => el.lat != null && el.lon != null)
    .map(el => {
      const tags    = el.tags ?? {};
      const osmType = tags.amenity ?? tags.shop ?? tags.craft ?? null;
      return {
        name    : tags.name ?? tags['name:en'] ?? null,
        lat     : el.lat,
        lng     : el.lon,
        distance: Math.round(haversineDistance(lat, lng, el.lat, el.lon)),
        osmType,
        tags,
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  return { found: shops.length > 0, shops };
}


/**
 * Get all nearby place type IDs in one round-trip.
 * Used by the full "Check Location" button.
 */
export async function getNearbyPlaceTypes(lat, lng) {
  // One big union query covering all categories
  const allTags  = PLACE_TYPES.flatMap(pt => pt.osm);
  const query    = buildOverpassQuery(allTags, lat, lng, getRadius());
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
