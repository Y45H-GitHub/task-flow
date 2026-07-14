/**
 * app.js — FlowTask Root App Controller (Bento Pivot)
 * Handles: tab navigation (sidebar + bottom nav), FAB, header stats, PWA, toast system
 */
import { store } from './store/store.js';
import { mountTasksView } from './components/TasksView.js';
import { mountPeopleView } from './components/PeopleView.js';
import { mountPlacesView } from './components/PlacesView.js';
import { mountLogView }    from './components/LogView.js';
import { mountMoreView }   from './components/MoreView.js';
import { openTaskForm }    from './components/TaskForm.js';
import { isOverdue }       from './utils/dateUtils.js';

const TABS = [
  { id: 'tasks',   label: 'Tasks',  icon: '📋' },
  { id: 'people',  label: 'People', icon: '👥' },
  { id: 'places',  label: 'Places', icon: '📍' },
  { id: 'log',     label: 'Log',    icon: '📓' },
  { id: 'more',    label: 'More',   icon: '⚙️' },
];

const MOUNTERS = {
  tasks:  mountTasksView,
  people: mountPeopleView,
  places: mountPlacesView,
  log:    mountLogView,
  more:   mountMoreView,
};

let _activeTab = 'tasks';
const _mounted = {};

export function initApp(root) {
  root.innerHTML = buildShell();
  registerPWA();
  bindNav();
  bindFAB();
  updateHeaderStats();
  store.subscribe(updateHeaderStats);
  switchTab('tasks');
}

function buildShell() {
  return `
    <!-- Desktop Left Sidebar -->
    <aside class="desktop-sidebar" role="navigation" aria-label="Sidebar navigation">
      <div class="sidebar-logo">
        <div class="app-logo-icon">✨</div>
        <span class="app-logo-text">FlowTask</span>
      </div>
      <div class="sidebar-nav">
        ${TABS.map(t => `
          <button class="sidebar-item" data-tab="${t.id}" id="side-${t.id}" role="tab" aria-selected="false">
            <span class="sidebar-icon">${t.icon}</span>
            <span class="sidebar-label">${t.label}</span>
          </button>
        `).join('')}
      </div>
    </aside>

    <!-- Top Header -->
    <header class="app-header">
      <div class="app-logo">
        <!-- Show logo only on mobile/tablet header (sidebar handles desktop) -->
        <div class="app-logo-icon" style="display: var(--display-mobile-logo, inline-flex)">✨</div>
        <span class="app-logo-text" style="display: var(--display-mobile-logo, inline-flex)">FlowTask</span>
      </div>
      <div class="app-header-right" id="header-stats"></div>
    </header>

    <!-- Tab panes -->
    <main class="tab-content">
      ${TABS.map(t => `
        <section class="tab-pane" id="pane-${t.id}" role="tabpanel" aria-label="${t.label}">
        </section>
      `).join('')}
    </main>

    <!-- FAB -->
    <button class="fab" id="fab" aria-label="Add new task" title="Add task">+</button>

    <!-- Bottom Nav (Mobile) -->
    <nav class="bottom-nav" role="navigation" aria-label="Bottom navigation">
      ${TABS.map(t => `
        <button class="nav-item" data-tab="${t.id}" id="nav-${t.id}" role="tab" aria-selected="false">
          <span class="nav-icon">${t.icon}</span>
          <span class="nav-label">${t.label}</span>
        </button>
      `).join('')}
    </nav>

    <!-- Toast Container -->
    <div class="toast-container" id="toast-container" aria-live="polite"></div>
  `;
}

function bindNav() {
  // Mobile bottom nav clicks
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Desktop sidebar nav clicks
  document.querySelectorAll('.sidebar-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function bindFAB() {
  document.getElementById('fab').addEventListener('click', () => {
    const { people } = store.state;
    openTaskForm({
      people,
      onSave: (data) => {
        store.addTask(data);
        showToast('✅ Task added!', 'success');
        if (_mounted.tasks?.refresh) _mounted.tasks.refresh();
      },
    });
  });
}

function switchTab(tabId) {
  _activeTab = tabId;

  // Update mobile bottom nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });

  // Update desktop sidebar items
  document.querySelectorAll('.sidebar-item').forEach(btn => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });

  // Show active pane
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${tabId}`);
  });

  // Lazy mount tab view
  if (!_mounted[tabId]) {
    const pane = document.getElementById(`pane-${tabId}`);
    const mounter = MOUNTERS[tabId];
    if (mounter && pane) {
      _mounted[tabId] = mounter(pane);
    }
  }

  // Hide FAB except on Tasks tab
  const fab = document.getElementById('fab');
  if (fab) fab.style.display = tabId === 'tasks' ? 'flex' : 'none';

  // Smooth scroll main pane to top
  const mainPane = document.getElementById(`pane-${tabId}`);
  if (mainPane) {
    if (window.innerWidth >= 1024) {
      document.querySelector('.tab-content').scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function updateHeaderStats() {
  const statsEl = document.getElementById('header-stats');
  if (!statsEl) return;
  const { tasks } = store.state;
  const pending = tasks.filter(t => t.status !== 'done').length;
  const overdue = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;

  statsEl.innerHTML = `
    <div class="stat-chip">
      <span>${pending}</span>
      <span class="stat-num">pending</span>
    </div>
    ${overdue > 0 ? `<div class="stat-chip overdue"><span>⚠️</span><span class="stat-num">${overdue} overdue</span></div>` : ''}
  `;
}

function registerPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {/* dev ignore */});
  }
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast${type !== 'info' ? ` ${type}` : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
