/**
 * TasksView.js — Main Tasks tab (Tab 1 — Unicons Adapter)
 */
import { store } from '../store/store.js';
import { createTaskCard } from './TaskCard.js';
import { openTaskForm } from './TaskForm.js';
import { isOverdue, today } from '../utils/dateUtils.js';

const FILTERS = [
  { id: 'all',       label: 'All',        icon: 'uil-clipboard-notes' },
  { id: 'pending',   label: 'Pending',    icon: 'uil-clock' },
  { id: 'today',     label: 'Today',      icon: 'uil-calender' },
  { id: 'overdue',   label: 'Overdue',    icon: 'uil-exclamation-triangle' },
  { id: 'location',  label: 'Location',   icon: 'uil-map-marker' },
  { id: 'quickwin',  label: 'Quick Wins', icon: 'uil-bolt' },
  { id: 'waiting',   label: 'Waiting',    icon: 'uil-history' },
  { id: 'done',      label: 'Done',       icon: 'uil-check-circle' },
];

const SORTS = [
  { id: 'added',    label: 'Added' },
  { id: 'due',      label: 'Due' },
  { id: 'priority', label: 'Priority' },
  { id: 'person',   label: 'Person' },
];

const PRIORITY_ORDER = { P1: 1, P2: 2, P3: 3, P4: 4 };

let _activeFilter = 'all';
let _activeSort   = 'added';

export function mountTasksView(container) {
  container.innerHTML = `
    <div class="tasks-toolbar">
      <div class="tasks-filter-row" id="filter-row"></div>
      <div class="tasks-sort-row">
        <span class="sort-label">Sort:</span>
        <div id="sort-row" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <div class="jump-btns">
          <button class="btn btn-ghost btn-icon" id="jump-top" title="Jump to first" style="font-size:0.875rem"><i class="uil uil-arrow-up"></i></button>
          <button class="btn btn-ghost btn-icon" id="jump-bottom" title="Jump to last" style="font-size:0.875rem"><i class="uil uil-arrow-down"></i></button>
        </div>
      </div>
    </div>
    <div class="task-list" id="task-list"></div>
  `;

  // Filter chips
  const filterRow = container.querySelector('#filter-row');
  FILTERS.forEach(f => {
    const chip = document.createElement('button');
    chip.className = `filter-chip${f.id === _activeFilter ? ' active' : ''}`;
    chip.dataset.filter = f.id;
    chip.innerHTML = `<i class="uil ${f.icon}" style="margin-right:3px"></i> ${f.label}`;
    chip.addEventListener('click', () => {
      _activeFilter = f.id;
      filterRow.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === f.id));
      render();
    });
    filterRow.appendChild(chip);
  });

  // Sort buttons
  const sortRow = container.querySelector('#sort-row');
  SORTS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = `sort-btn${s.id === _activeSort ? ' active' : ''}`;
    btn.dataset.sort = s.id;
    btn.textContent = s.label;
    btn.addEventListener('click', () => {
      _activeSort = s.id;
      sortRow.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === s.id));
      render();
    });
    sortRow.appendChild(btn);
  });

  // Jump buttons
  container.querySelector('#jump-top').addEventListener('click', () => {
    container.closest('.tab-pane').scrollIntoView({ behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  container.querySelector('#jump-bottom').addEventListener('click', () => {
    const list = container.querySelector('#task-list');
    list.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
  });

  function render() {
    const { tasks, people } = store.state;
    const personMap = Object.fromEntries(people.map(p => [p.id, p]));

    let filtered = applyFilter(tasks, _activeFilter);
    filtered = applySort(filtered, _activeSort);

    const list = container.querySelector('#task-list');
    list.innerHTML = '';

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="uil ${emptyIcon(_activeFilter)}"></i></div>
          <div class="empty-title">${emptyTitle(_activeFilter)}</div>
          <div class="empty-sub">Tap + to add a task</div>
        </div>`;
      return;
    }

    filtered.forEach((task, idx) => {
      const card = createTaskCard(task, personMap[task.person], {
        onToggle: (id) => { store.toggleTask(id); render(); },
        onEdit:   (t)  => openTaskForm({ task: t, people, onSave: (data) => { store.updateTask(t.id, data); render(); } }),
        onDelete: (id) => { store.deleteTask(id); render(); },
      });
      card.style.animationDelay = `${idx * 30}ms`;
      list.appendChild(card);
    });
  }

  const unsub = store.subscribe(() => render());
  render();

  return { unmount: unsub, refresh: render };
}

function applyFilter(tasks, filter) {
  switch (filter) {
    case 'pending':  return tasks.filter(t => t.status !== 'done');
    case 'today':    return tasks.filter(t => t.dueDate === today());
    case 'overdue':  return tasks.filter(t => isOverdue(t.dueDate, t.status));
    case 'location': return tasks.filter(t => t.locationTrigger && t.status !== 'done');
    case 'quickwin': return tasks.filter(t => t.effort === '2min' && t.status !== 'done');
    case 'waiting':  return tasks.filter(t => t.status === 'waiting');
    case 'done':     return tasks.filter(t => t.status === 'done');
    default:         return tasks;
  }
}

function applySort(tasks, sort) {
  const clone = [...tasks];
  switch (sort) {
    case 'due':      return clone.sort((a, b) => (a.dueDate || '9') < (b.dueDate || '9') ? -1 : 1);
    case 'priority': return clone.sort((a, b) => (PRIORITY_ORDER[a.priority] || 5) - (PRIORITY_ORDER[b.priority] || 5));
    case 'person':   return clone.sort((a, b) => (a.person || '').localeCompare(b.person || ''));
    default:         return clone; // 'added'
  }
}

function emptyIcon(filter) {
  const map = { 
    pending: 'uil-check-circle', 
    today: 'uil-calender', 
    overdue: 'uil-smile', 
    location: 'uil-map-marker-slash', 
    quickwin: 'uil-bolt-alt', 
    waiting: 'uil-history-alt', 
    done: 'uil-check-circle' 
  };
  return map[filter] || 'uil-clipboard-notes';
}

function emptyTitle(filter) {
  const map = {
    all:      'No tasks yet',
    pending:  'All caught up!',
    today:    'Nothing due today',
    overdue:  'No overdue tasks — great!',
    location: 'No location-tagged tasks',
    quickwin: 'No quick wins',
    waiting:  'Nothing waiting',
    done:     'Nothing done yet',
  };
  return map[filter] || 'No tasks';
}
