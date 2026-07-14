/**
 * PlacesView.js — Places + Item Locator tab (Tab 3)
 */
import { store } from '../store/store.js';
import { PLACE_TYPES, getPlaceType, getCurrentPosition, getRelevantTasks } from '../utils/locationUtils.js';
import { timeAgo } from '../utils/dateUtils.js';
import { showToast } from '../app.js';

export function mountPlacesView(container) {
  function render() {
    const { tasks, items } = store.state;
    container.innerHTML = '';

    // Location check banner
    const locBanner = document.createElement('div');
    locBanner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(245 158 11/0.08);border:1px solid rgba(245 158 11/0.2);border-radius:var(--r-lg);padding:12px 16px;margin-bottom:20px;gap:12px';
    locBanner.innerHTML = `
      <div>
        <div style="font-weight:600;font-size:0.9375rem;color:#fbbf24">📍 Location Check</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">Find tasks relevant to where you are now</div>
      </div>
      <button class="btn" id="check-location-btn" style="background:rgba(245 158 11/0.15);color:#fbbf24;border:1px solid rgba(245 158 11/0.3);flex-shrink:0">
        🗺 Check Location
      </button>
    `;
    container.appendChild(locBanner);

    locBanner.querySelector('#check-location-btn').addEventListener('click', checkLocation);

    // Location task groups
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-header';
    sectionTitle.innerHTML = `<span class="section-title">📍 Tasks by Location Type</span>`;
    container.appendChild(sectionTitle);

    const locationTasks = tasks.filter(t => t.locationTrigger && t.status !== 'done');

    if (!locationTasks.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="empty-icon">📍</div><div class="empty-title">No location-tagged tasks</div><div class="empty-sub">Tag a task with a place type when adding it</div>`;
      container.appendChild(empty);
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
        group.style.animationDelay = `${idx * 50}ms`;

        group.innerHTML = `
          <div class="place-group-header">
            <div class="place-icon-wrap">${pt.icon}</div>
            <div>
              <div class="place-name">${pt.label}</div>
              <div class="place-count">${typeTasks.length} task${typeTasks.length !== 1 ? 's' : ''}</div>
            </div>
            <button class="location-check-btn" data-type="${typeId}">📡 Near Me?</button>
          </div>
          <div class="person-task-list">
            ${typeTasks.map(t => `
              <div class="person-task-item">
                <span class="badge badge-${(t.priority || 'P4').toLowerCase()}">${t.priority || 'P4'}</span>
                <span class="ptask-title">${escHtml(t.title)}</span>
                ${t.notes ? `<span class="ptask-due" title="${escHtml(t.notes)}" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.notes)}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
        container.appendChild(group);
      });

      // Near Me? buttons
      container.querySelectorAll('.location-check-btn').forEach(btn => {
        btn.addEventListener('click', () => checkLocationForType(btn.dataset.type));
      });
    }

    // Item Locator section
    const itemSection = document.createElement('div');
    itemSection.className = 'item-locator-section';
    itemSection.innerHTML = `
      <div class="section-header" style="margin-top:8px">
        <span class="section-title">🗃 Physical Item Locator</span>
        <button class="btn btn-ghost" id="add-item-btn" style="font-size:0.8125rem">+ Add Item</button>
      </div>
    `;
    container.appendChild(itemSection);

    itemSection.querySelector('#add-item-btn').addEventListener('click', showAddItemModal);

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<div class="empty-icon">🗃</div><div class="empty-title">No items tracked</div><div class="empty-sub">Track where you keep passport, charger, HDD, etc.</div>`;
      container.appendChild(empty);
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
            <div class="item-age">Added ${timeAgo(item.createdAt)}</div>
          </div>
          <button class="task-action-btn delete" data-id="${item.id}" title="Delete">🗑</button>
        `;
        card.querySelector('.delete').addEventListener('click', () => {
          if (confirm(`Remove "${item.name}" from tracker?`)) store.deleteItem(item.id);
        });
        container.appendChild(card);
      });
    }
  }

  async function checkLocation() {
    const btn = container.querySelector('#check-location-btn');
    if (!btn) return;
    btn.textContent = '⏳ Getting location...';
    btn.disabled = true;

    try {
      const { lat, lng } = await getCurrentPosition();
      const { tasks } = store.state;
      const locationTasks = tasks.filter(t => t.locationTrigger && t.status !== 'done');

      if (!locationTasks.length) {
        showToast('No location-tagged tasks found.', 'info');
      } else {
        showToast(`📍 ${locationTasks.length} location task${locationTasks.length !== 1 ? 's' : ''} in your list — check Places below!`, 'success');
      }
    } catch (err) {
      if (err.code === 1) {
        showToast('Location permission denied. Enable in browser settings.', 'error');
      } else {
        showToast('Could not get location. Try again.', 'error');
      }
    } finally {
      btn.textContent = '🗺 Check Location';
      btn.disabled = false;
    }
  }

  function checkLocationForType(typeId) {
    const { tasks } = store.state;
    const relevant = tasks.filter(t => t.locationTrigger === typeId && t.status !== 'done');
    const pt = getPlaceType(typeId);
    showToast(`${pt.icon} ${relevant.length} task${relevant.length !== 1 ? 's' : ''} for ${pt.label}`, 'success');
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
            <input class="form-input" id="ai-name" type="text" placeholder="e.g. Passport, External HDD, Charger..." autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">Where is it? *</label>
            <input class="form-input" id="ai-location" type="text" placeholder="e.g. Top drawer, office locker, blue bag..." />
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="ai-cancel">Cancel</button>
            <button class="btn btn-primary" id="ai-save">📍 Save Location</button>
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
