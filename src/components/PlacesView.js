/**
 * PlacesView.js — Places + Item Locator tab (Tab 3 — Bento Adapter)
 */
import { store } from '../store/store.js';
import { PLACE_TYPES, getPlaceType, getCurrentPosition } from '../utils/locationUtils.js';
import { timeAgo } from '../utils/dateUtils.js';
import { showToast } from '../app.js';

export function mountPlacesView(container) {
  function render() {
    const { tasks, items } = store.state;
    container.innerHTML = '';

    // Location check banner
    const locBanner = document.createElement('div');
    locBanner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(245 158 11/0.06);border:1px solid rgba(245 158 11/0.15);border-radius:var(--r-lg);padding:14px 18px;margin-bottom:24px;gap:12px';
    locBanner.innerHTML = `
      <div>
        <div style="font-weight:700;font-size:0.9375rem;color:#fbbf24">📍 Location Check</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">Find tasks relevant to where you are now</div>
      </div>
      <button class="btn" id="check-location-btn" style="background:rgba(245 158 11/0.1);color:#fbbf24;border:1px solid rgba(245 158 11/0.2);flex-shrink:0">
        🗺 Check Location
      </button>
    `;
    container.appendChild(locBanner);
    locBanner.querySelector('#check-location-btn').addEventListener('click', checkLocation);

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
      empty.innerHTML = `<div class="empty-icon">📍</div><div class="empty-title">No location-tagged tasks</div><div class="empty-sub">Tag a task with a place type when adding it</div>`;
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
            <div class="place-icon-wrap">${pt.icon}</div>
            <div>
              <div class="place-name">${pt.label}</div>
              <div class="place-count">${typeTasks.length} task${typeTasks.length !== 1 ? 's' : ''}</div>
            </div>
            <button class="location-check-btn" data-type="${typeId}">Near Me?</button>
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
        `;
        leftCol.appendChild(group);
      });
    }
    grid.appendChild(leftCol);

    // ── Column 2: Item Locator ──
    const rightCol = document.createElement('div');
    rightCol.className = 'flex flex-col gap-4';
    rightCol.innerHTML = `
      <div class="section-header">
        <span class="section-title">🗃 Physical Item Locator</span>
        <button class="btn btn-ghost" id="add-item-btn" style="font-size:0.8125rem;padding:4px 10px">+ Track Item</button>
      </div>
      <div class="item-locator-container" id="item-locator-container"></div>
    `;

    grid.appendChild(rightCol);
    container.appendChild(grid);

    // Bind item locator actions
    rightCol.querySelector('#add-item-btn').addEventListener('click', showAddItemModal);

    const itemContainer = rightCol.querySelector('#item-locator-container');
    if (!items.length) {
      itemContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">🗃</div><div class="empty-title">No items tracked</div><div class="empty-sub">Keep tabs on where you keep passports, chargers, keys etc.</div></div>`;
    } else {
      const ITEM_EMOJIS = ['🗂','💾','🔑','📄','💊','🔌','📦','👜','💻','🪪','📱','🏷'];
      items.forEach((item, idx) => {
        const emoji = ITEM_EMOJIS[idx % ITEM_EMOJIS.length];
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.animationDelay = `${idx * 40}ms`;
        card.innerHTML = `
          <div class="item-emoji">${emoji}</div>
          <div class="item-info">
            <div class="item-name">${escHtml(item.name)}</div>
            <div class="item-location">📍 ${escHtml(item.location)}</div>
            <div class="item-age">Tracked ${timeAgo(item.createdAt)}</div>
          </div>
          <button class="task-action-btn delete" data-id="${item.id}" title="Delete">🗑</button>
        `;
        card.querySelector('.delete').addEventListener('click', () => {
          if (confirm(`Remove "${item.name}" from tracker?`)) store.deleteItem(item.id);
        });
        itemContainer.appendChild(card);
      });
    }

    // Bind Near Me? buttons
    container.querySelectorAll('.location-check-btn').forEach(btn => {
      btn.addEventListener('click', () => checkLocationForType(btn.dataset.type));
    });
  }

  async function checkLocation() {
    const btn = container.querySelector('#check-location-btn');
    if (!btn) return;
    btn.textContent = '⏳ Checking...';
    btn.disabled = true;

    try {
      const { lat, lng } = await getCurrentPosition();
      const { tasks } = store.state;
      const locationTasks = tasks.filter(t => t.locationTrigger && t.status !== 'done');

      if (!locationTasks.length) {
        showToast('No location tasks active in your list.', 'info');
      } else {
        showToast(`📍 Found ${locationTasks.length} location tasks in your checklist!`, 'success');
      }
    } catch (err) {
      showToast('Could not fetch location coordinates.', 'error');
    } finally {
      btn.textContent = '🗺 Check Location';
      btn.disabled = false;
    }
  }

  function checkLocationForType(typeId) {
    const { tasks } = store.state;
    const relevant = tasks.filter(t => t.locationTrigger === typeId && t.status !== 'done');
    const pt = getPlaceType(typeId);
    showToast(`${pt.icon} ${relevant.length} task${relevant.length !== 1 ? 's' : ''} active for ${pt.label}`, 'success');
  }

  function showAddItemModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="border-radius:var(--r-xl)">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h2 class="modal-title">🗃 Track an Item</h2>
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
