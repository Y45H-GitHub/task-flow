/**
 * PlacesView.js — Places + Item Locator tab (Tab 3 — Unicons Adapter)
 */
import { store } from '../store/store.js';
import { PLACE_TYPES, getPlaceType, getCurrentPosition, getNearbyPlaceTypes, getNearbyShopsForCategory, getRelevantTasks, getRadius, setRadius, getLocationOverride, setLocationOverride, clearLocationOverride } from '../utils/locationUtils.js';
import { timeAgo } from '../utils/dateUtils.js';
import { showToast, startLocationAlerts, stopLocationAlerts } from '../app.js';

export function mountPlacesView(container) {
  // Persists nearby shop results across re-renders (store updates shouldn't wipe the list).
  const nearbyResults = new Map(); // typeId → { shops, checkedAt }

  function render() {
    const { tasks, items } = store.state;
    container.innerHTML = '';

    const alertsActive = localStorage.getItem('flowtask_loc_alerts') === 'true';

    // Location check banner
    const locBanner = document.createElement('div');
    locBanner.style.cssText = 'display:flex;flex-direction:column;background:rgba(245 158 11/0.06);border:1px solid rgba(245 158 11/0.15);border-radius:var(--r-lg);padding:18px;margin-bottom:24px;gap:16px';
    locBanner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%">
        <div>
          <div style="font-weight:700;font-size:0.9375rem;color:#fbbf24;display:flex;align-items:center;gap:6px"><i class="uil uil-map-pin" style="font-size:1.125rem"></i> Location Check</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">Find tasks relevant to where you are now</div>
        </div>
        <button class="btn" id="check-location-btn" style="background:rgba(245 158 11/0.1);color:#fbbf24;border:1px solid rgba(245 158 11/0.2);flex-shrink:0">
          <i class="uil uil-navigation" style="margin-right:2px"></i> Check Location
        </button>
      </div>
      <div style="height:1px;background:rgba(245 158 11/0.15)"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
        <div style="font-size:0.8125rem;color:var(--text-primary);display:flex;align-items:center;gap:6px">
          <i class="uil uil-bell" style="color:#fbbf24"></i> Always-on background alerts
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="location-alerts-toggle" ${alertsActive ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div style="height:1px;background:rgba(245 158 11/0.15)"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%">
        <div style="font-size:0.8125rem;color:var(--text-primary);display:flex;align-items:center;gap:6px">
          <i class="uil uil-focus-target" style="color:#fbbf24"></i> Search radius
        </div>
        <div id="radius-picker" style="display:flex;gap:6px;flex-wrap:wrap">
          ${[500,1000,2000,5000].map(r => {
            const active = getRadius() === r;
            const label  = r >= 1000 ? `${r/1000} km` : `${r} m`;
            return `<button
              class="radius-pill${active ? ' active' : ''}"
              data-radius="${r}"
              style="
                padding:4px 12px;
                border-radius:999px;
                font-size:0.75rem;
                font-weight:600;
                cursor:pointer;
                border:1px solid ${active ? '#fbbf24' : 'rgba(245 158 11/0.2)'};
                background:${active ? 'rgba(245 158 11/0.2)' : 'transparent'};
                color:${active ? '#fbbf24' : 'var(--text-secondary)'};
                transition:all 0.15s;
              "
            >${label}</button>`;
          }).join('')}
        </div>
      </div>
      <div style="height:1px;background:rgba(245 158 11/0.15)"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%" id="loc-source-row">
        ${buildLocSourceRow()}
      </div>
    `;
    container.appendChild(locBanner);
    locBanner.querySelector('#check-location-btn').addEventListener('click', checkLocation);
    locBanner.querySelector('#location-alerts-toggle').addEventListener('change', toggleLocationAlerts);
    locBanner.querySelector('#loc-override-btn').addEventListener('click', () => showLocationOverrideModal(locBanner));

    // Radius picker
    locBanner.querySelectorAll('.radius-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        setRadius(parseInt(pill.dataset.radius, 10));
        // re-style all pills without a full re-render
        locBanner.querySelectorAll('.radius-pill').forEach(p => {
          const chosen = p === pill;
          p.style.border    = `1px solid ${chosen ? '#fbbf24' : 'rgba(245 158 11/0.2)'}`;
          p.style.background = chosen ? 'rgba(245 158 11/0.2)' : 'transparent';
          p.style.color      = chosen ? '#fbbf24' : 'var(--text-secondary)';
          p.classList.toggle('active', chosen);
        });
        const label = parseInt(pill.dataset.radius, 10) >= 1000
          ? `${parseInt(pill.dataset.radius, 10)/1000} km`
          : `${pill.dataset.radius} m`;
        showToast(`Search radius set to ${label}`, 'success');
      });
    });


    // Grid container to hold both bento sections
    const grid = document.createElement('div');
    grid.className = 'places-grid';

    // ── Column 1: Locations ──
    const leftCol = document.createElement('div');
    leftCol.className = 'flex flex-col gap-4';
    leftCol.innerHTML = `<div class="section-header"><span class="section-title">📍 Tasks by Location Type</span></div>`;

    const locationTasks = tasks.filter(t => t.locationTrigger && t.status !== 'done');

    if (!locationTasks.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="empty-icon"><i class="uil uil-map-marker-slash"></i></div><div class="empty-title">No location-tagged tasks</div><div class="empty-sub">Tag a task with a place type when adding it</div>`;
      leftCol.appendChild(empty);
    } else {
      // Group by place type
      const byType = {};
      locationTasks.forEach(t => {
        if (!byType[t.locationTrigger]) byType[t.locationTrigger] = [];
        byType[t.locationTrigger].push(t);
      });

      Object.entries(byType).forEach(([typeId, typeTasks], idx) => {
        const pt = getPlaceType(typeId);
        const group = document.createElement('div');
        group.className = 'place-group';
        group.style.animationDelay = `${idx * 40}ms`;

        group.innerHTML = `
          <div class="place-group-header">
            <div class="place-icon-wrap"><i class="uil ${pt.icon}" style="color:#fbbf24"></i></div>
            <div>
              <div class="place-name">${pt.label}</div>
              <div class="place-count">${typeTasks.length} task${typeTasks.length !== 1 ? 's' : ''}</div>
              <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:1px">${pt.hint}</div>
            </div>
            <button class="location-check-btn" data-type="${typeId}"><i class="uil uil-rss" style="margin-right:2px"></i> Near Me?</button>
          </div>
          <div class="person-task-list">
            ${typeTasks.map(t => `
              <div class="person-task-item">
                <span class="badge badge-${(t.priority || 'P4').toLowerCase()}">${t.priority || 'P4'}</span>
                <span class="ptask-title">${escHtml(t.title)}</span>
                ${t.notes ? `<span class="ptask-due" title="${escHtml(t.notes)}" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)">${escHtml(t.notes)}</span>` : ''}
              </div>
            `).join('')}
          </div>
          <div class="nearby-shops-list" id="nearby-shops-${typeId}"></div>
        `;
        leftCol.appendChild(group);

        // Restore cached results (survives store re-renders)
        if (nearbyResults.has(typeId)) {
          const cached = nearbyResults.get(typeId);
          renderNearbyShops(group.querySelector(`#nearby-shops-${typeId}`), cached.shops, cached.checkedAt);
        }
      });
    }
    grid.appendChild(leftCol);

    // ── Column 2: Item Locator ──
    const rightCol = document.createElement('div');
    rightCol.className = 'flex flex-col gap-4';
    rightCol.innerHTML = `
      <div class="section-header">
        <span class="section-title">🗃 Physical Item Locator</span>
        <button class="btn btn-ghost" id="add-item-btn" style="font-size:0.8125rem;padding:4px 10px"><i class="uil uil-plus" style="margin-right:2px"></i> Track Item</button>
      </div>
      <div class="item-locator-container" id="item-locator-container"></div>
    `;

    grid.appendChild(rightCol);
    container.appendChild(grid);

    // Bind item locator actions
    rightCol.querySelector('#add-item-btn').addEventListener('click', showAddItemModal);

    const itemContainer = rightCol.querySelector('#item-locator-container');
    if (!items.length) {
      itemContainer.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="uil uil-box"></i></div><div class="empty-title">No items tracked</div><div class="empty-sub">Keep tabs on where you keep passports, keys, etc.</div></div>`;
    } else {
      items.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.animationDelay = `${idx * 40}ms`;
        card.innerHTML = `
          <div class="item-emoji"><i class="uil uil-archive" style="color:var(--accent)"></i></div>
          <div class="item-info">
            <div class="item-name">${escHtml(item.name)}</div>
            <div class="item-location"><i class="uil uil-map-marker" style="font-size:0.75rem;margin-right:2px"></i> ${escHtml(item.location)}</div>
            <div class="item-age">Tracked ${timeAgo(item.createdAt)}</div>
          </div>
          <button class="task-action-btn delete" data-id="${item.id}" title="Delete"><i class="uil uil-trash-alt"></i></button>
        `;
        card.querySelector('.delete').addEventListener('click', () => {
          if (confirm(`Remove "${item.name}" from tracker?`)) store.deleteItem(item.id);
        });
        itemContainer.appendChild(card);
      });
    }

    // Bind Near Me? buttons
    container.querySelectorAll('.location-check-btn').forEach(btn => {
      btn.addEventListener('click', () => checkLocationForType(btn.dataset.type, btn));
    });
  }

  async function checkLocation() {
    const btn = container.querySelector('#check-location-btn');
    if (!btn) return;
    btn.innerHTML = '<i class="uil uil-spinner-alt" style="display:inline-block;animation:spin 1s linear infinite;margin-right:2px"></i> Checking...';
    btn.disabled = true;

    // quick spinner animation rule injection in case it's not in CSS
    if (!document.getElementById('spin-keyframe')) {
      const style = document.createElement('style');
      style.id = 'spin-keyframe';
      style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    try {
      const { lat, lng } = await getCurrentPosition();
      const { tasks } = store.state;
      const nearbyTypeIds = await getNearbyPlaceTypes(lat, lng);
      const matched = getRelevantTasks(tasks, nearbyTypeIds);

      if (!matched.length) {
        showToast('No matching shops nearby for your tasks.', 'info');
      } else {
        showToast(`📍 Found ${matched.length} task${matched.length !== 1 ? 's' : ''} for nearby shops: ${matched.map(t => `"${t.title}"`).join(', ')}`, 'success');
      }
    } catch (err) {
      if (err?.code === 1) {
        showToast('Location permission denied — enable it in browser settings.', 'error');
      } else if (err?.name === 'OverpassError') {
        showToast(`Map data unavailable: ${err.message}`, 'error');
      } else {
        showToast('Could not fetch your location. Please try again.', 'error');
      }
    } finally {
      btn.innerHTML = '<i class="uil uil-navigation" style="margin-right:2px"></i> Check Location';
      btn.disabled = false;
    }
  }

  function toggleLocationAlerts(e) {
    const active = e.target.checked;
    localStorage.setItem('flowtask_loc_alerts', active ? 'true' : 'false');
    if (active) {
      startLocationAlerts();
      showToast('🔔 Location alerts enabled!', 'success');
    } else {
      stopLocationAlerts();
      showToast('🔕 Location alerts disabled.', 'info');
    }
  }

  function ensureSpinKeyframe() {
    if (!document.getElementById('spin-keyframe')) {
      const style = document.createElement('style');
      style.id = 'spin-keyframe';
      style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
  }

  // ── Nearby shop cards ─────────────────────────────────────────────────────

  function formatDist(m) {
    if (m < 50)   return '< 50 m';
    if (m < 1000) return `${m} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }

  function mapsUrl(shop) {
    const q = shop.name ? encodeURIComponent(shop.name) : '';
    return `https://www.google.com/maps/search/?api=1&query=${q}&center=${shop.lat},${shop.lng}`;
  }

  function osmUrl(shop) {
    return `https://www.openstreetmap.org/?mlat=${shop.lat}&mlon=${shop.lng}#map=18/${shop.lat}/${shop.lng}`;
  }

  function renderNearbyShops(el, shops, checkedAt) {
    if (!el) return;
    if (!shops.length) {
      el.innerHTML = `
        <div style="padding:10px 0 4px;font-size:0.8rem;color:var(--text-muted);display:flex;align-items:center;gap:6px">
          <i class="uil uil-map-marker-slash" style="font-size:1rem"></i>
          No places found in this area. Try a larger radius.
        </div>`;
      return;
    }

    const timeStr = checkedAt ? new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    el.innerHTML = `
      <div style="margin-top:10px;margin-bottom:6px;display:flex;align-items:center;gap:6px">
        <i class="uil uil-map-pin" style="color:#fbbf24;font-size:0.9rem"></i>
        <span style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">Nearby places</span>
        ${timeStr ? `<span style="font-size:0.7rem;color:var(--text-muted);margin-left:auto">Checked at ${timeStr}</span>` : ''}
      </div>
      <div class="nearby-shop-cards">
        ${shops.map((shop, i) => {
          const label   = shop.name ?? `Unnamed ${shop.osmType ?? 'place'}`;
          const distStr = formatDist(shop.distance);
          const isClose = shop.distance < 500;
          return `
            <div class="nearby-shop-card" style="animation-delay:${i * 40}ms">
              <div class="nearby-shop-dist" style="color:${isClose ? '#22c55e' : '#fbbf24'}">${distStr}</div>
              <div class="nearby-shop-body">
                <div class="nearby-shop-name">${escHtml(label)}</div>
                ${shop.osmType ? `<div class="nearby-shop-type">${escHtml(shop.osmType.replace(/_/g, ' '))}</div>` : ''}
              </div>
              <div class="nearby-shop-actions">
                <a href="${mapsUrl(shop)}" target="_blank" rel="noopener" class="nearby-map-btn" title="Open in Google Maps" aria-label="Open ${escHtml(label)} in Google Maps">
                  <i class="uil uil-map"></i>
                </a>
                <a href="${osmUrl(shop)}" target="_blank" rel="noopener" class="nearby-map-btn nearby-map-btn--osm" title="Open in OpenStreetMap" aria-label="Open in OpenStreetMap">
                  <i class="uil uil-globe"></i>
                </a>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async function checkLocationForType(typeId, btn) {
    const pt          = getPlaceType(typeId);
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="uil uil-spinner-alt" style="display:inline-block;animation:spin 1s linear infinite;margin-right:2px"></i>';
    btn.disabled  = true;
    ensureSpinKeyframe();

    try {
      const { lat, lng }       = await getCurrentPosition();
      const { found, shops }   = await getNearbyShopsForCategory(lat, lng, typeId);
      const { tasks }          = store.state;
      const relevant           = tasks.filter(t => t.locationTrigger === typeId && t.status !== 'done');
      const checkedAt          = new Date().toISOString();

      // Cache so the cards survive re-renders
      nearbyResults.set(typeId, { shops, checkedAt });

      // Inject into the live DOM (no full re-render needed)
      const shopContainer = container.querySelector(`#nearby-shops-${typeId}`);
      renderNearbyShops(shopContainer, shops, checkedAt);

      if (!found) {
        const r = getRadius();
        const rangeLabel = r >= 1000 ? `${r/1000} km` : `${r} m`;
        showToast(`No ${pt.label} found within ${rangeLabel}.`, 'info');
      } else {
        const named    = shops.filter(s => s.name).map(s => s.name);
        const namesStr = named.length ? ` · ${named.slice(0, 3).join(', ')}` : '';
        showToast(`${pt.label} nearby${namesStr}. ${relevant.length} task${relevant.length !== 1 ? 's' : ''} to do here!`, 'success');
      }
    } catch (err) {
      if (err?.code === 1) {
        showToast('Location permission denied — enable it in browser settings.', 'error');
      } else if (err?.code === 2) {
        showToast('Your position is unavailable right now. Try again outside.', 'error');
      } else if (err?.name === 'OverpassError') {
        showToast(`Map server busy — tried 2 endpoints. Try again in a moment.`, 'error');
      } else {
        showToast('Could not get location. Please try again.', 'error');
      }
    } finally {
      btn.innerHTML = originalHtml;
      btn.disabled  = false;
    }
  }

  // ── Location override helpers ──────────────────────────────────────────────

  function buildLocSourceRow() {
    const ov = getLocationOverride();
    if (ov) {
      const coordStr = `${ov.lat.toFixed(4)}, ${ov.lng.toFixed(4)}`;
      return `
        <div style="font-size:0.8125rem;color:var(--text-primary);display:flex;align-items:center;gap:6px;min-width:0">
          <i class="uil uil-edit-alt" style="color:#fbbf24;flex-shrink:0"></i>
          <div style="min-width:0">
            <div style="font-weight:600;color:#fbbf24;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${escHtml(ov.label || coordStr)}
            </div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${coordStr} &middot; Manual override</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button id="loc-override-btn" style="padding:4px 10px;border-radius:var(--r-full);font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(245 158 11/0.25);background:rgba(245 158 11/0.08);color:#fbbf24">Edit</button>
          <button id="loc-clear-btn" style="padding:4px 10px;border-radius:var(--r-full);font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(239 68 68/0.25);background:rgba(239 68 68/0.08);color:#f87171">Use GPS</button>
        </div>`;
    }
    return `
      <div style="font-size:0.8125rem;color:var(--text-primary);display:flex;align-items:center;gap:6px">
        <i class="uil uil-signal" style="color:#fbbf24"></i>
        <span>Your location: <strong style="color:#fbbf24">GPS auto-detect</strong></span>
      </div>
      <button id="loc-override-btn" style="padding:4px 12px;border-radius:var(--r-full);font-size:0.75rem;font-weight:600;cursor:pointer;border:1px solid rgba(245 158 11/0.2);background:transparent;color:var(--text-secondary)">Set manually</button>`;
  }

  function refreshLocSourceRow(locBanner) {
    const row = locBanner.querySelector('#loc-source-row');
    if (!row) return;
    row.innerHTML = buildLocSourceRow();
    row.querySelector('#loc-override-btn')?.addEventListener('click', () => showLocationOverrideModal(locBanner));
    row.querySelector('#loc-clear-btn')?.addEventListener('click', () => {
      clearLocationOverride();
      refreshLocSourceRow(locBanner);
      showToast('Switched back to GPS auto-detect', 'info');
    });
  }

  function showLocationOverrideModal(locBanner) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="border-radius:var(--r-xl);max-width:480px">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h2 class="modal-title"><i class="uil uil-map-marker" style="color:var(--accent)"></i> Set Your Location</h2>
          <button class="modal-close" id="lom-close">&#10005;</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:14px">
            Search for an address or place name. The result will be used for all location checks instead of GPS.
          </p>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <input class="form-input" id="lom-query" type="text"
              placeholder="e.g. Bandra, Mumbai or CP, New Delhi"
              style="flex:1" autocomplete="off" />
            <button class="btn btn-primary" id="lom-search" style="flex-shrink:0">
              <i class="uil uil-search"></i> Search
            </button>
          </div>
          <div id="lom-results" style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto"></div>
          <div id="lom-status" style="font-size:0.8rem;color:var(--text-muted);padding:4px 0"></div>
          <div class="modal-footer" style="margin-top:14px">
            <button class="btn btn-ghost" id="lom-cancel">Cancel</button>
            <button class="btn" id="lom-use-gps"
              style="background:rgba(99 102 241/0.1);color:#818cf8;border:1px solid rgba(99 102 241/0.2)">
              <i class="uil uil-signal"></i> Use GPS instead
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    const queryInput = backdrop.querySelector('#lom-query');
    const resultsEl  = backdrop.querySelector('#lom-results');
    const statusEl   = backdrop.querySelector('#lom-status');

    function close() { backdrop.remove(); }
    backdrop.querySelector('#lom-close').onclick  = close;
    backdrop.querySelector('#lom-cancel').onclick = close;
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#lom-use-gps').onclick = () => {
      clearLocationOverride();
      refreshLocSourceRow(locBanner);
      showToast('Switched back to GPS auto-detect', 'info');
      close();
    };

    async function doSearch() {
      const q = queryInput.value.trim();
      if (!q) return;
      statusEl.textContent = 'Searching…';
      resultsEl.innerHTML  = '';
      backdrop.querySelector('#lom-search').disabled = true;

      try {
        const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;
        const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();

        if (!data.length) {
          statusEl.textContent = 'No results found. Try a different term.';
          return;
        }
        statusEl.textContent = `${data.length} result${data.length !== 1 ? 's' : ''} found:`;

        data.forEach(place => {
          const lat  = parseFloat(place.lat);
          const lng  = parseFloat(place.lon);
          const name = place.display_name;
          const shortName = name.split(',').slice(0, 3).join(',').trim();

          const item = document.createElement('button');
          item.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border-radius:var(--r-md);background:rgba(255 255 255/0.03);border:1px solid var(--border);cursor:pointer;text-align:left;width:100%;transition:background 0.15s';
          item.innerHTML = `
            <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary)">${escHtml(shortName)}</span>
            <span style="font-size:0.7rem;color:var(--text-muted)">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>`;
          item.onmouseenter = () => item.style.background = 'rgba(245 158 11/0.08)';
          item.onmouseleave = () => item.style.background = 'rgba(255 255 255/0.03)';
          item.onclick = () => {
            setLocationOverride(lat, lng, shortName);
            refreshLocSourceRow(locBanner);
            showToast(`Location set to ${shortName}`, 'success');
            close();
          };
          resultsEl.appendChild(item);
        });
      } catch (err) {
        statusEl.textContent = 'Search failed. Check your connection and try again.';
      } finally {
        backdrop.querySelector('#lom-search').disabled = false;
      }
    }

    backdrop.querySelector('#lom-search').onclick = doSearch;
    queryInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    queryInput.focus();
  }

  function showAddItemModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="border-radius:var(--r-xl)">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h2 class="modal-title"><i class="uil uil-box" style="color:var(--accent)"></i> Track an Item</h2>
          <button class="modal-close" id="ai-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Item Name *</label>
            <input class="form-input" id="ai-name" type="text" placeholder="e.g. Passport, HDD, Office keys..." autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">Location description *</label>
            <input class="form-input" id="ai-location" type="text" placeholder="e.g. Top dresser drawer, laptop bag pocket..." />
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="ai-cancel">Cancel</button>
            <button class="btn btn-primary" id="ai-save">💾 Save Location</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    function close() { backdrop.remove(); }
    backdrop.querySelector('#ai-close').onclick = close;
    backdrop.querySelector('#ai-cancel').onclick = close;
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#ai-save').onclick = () => {
      const name     = backdrop.querySelector('#ai-name').value.trim();
      const location = backdrop.querySelector('#ai-location').value.trim();
      if (!name || !location) return;
      store.addItem({ name, location });
      close();
    };
  }

  const unsub = store.subscribe(render);
  render();
  return { unmount: unsub };
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
