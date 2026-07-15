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
let _searchQuery  = '';
let _viewMode     = 'list'; // 'list' or 'board'

export function mountTasksView(container) {
  container.innerHTML = `
    <div class="tasks-toolbar">
      <div class="tasks-search-row">
        <div class="tasks-search-wrap">
          <i class="tasks-search-icon uil uil-search"></i>
          <input class="form-input" id="tasks-search" type="text" placeholder="Search tasks by title, notes, person, category..." value="${_searchQuery}" />
        </div>
        <button class="btn btn-ghost btn-icon" id="board-view-toggle" title="Toggle Board/List View">
          <i class="uil ${_viewMode === 'board' ? 'uil-list-ul' : 'uil-columns'}"></i>
        </button>
      </div>
      <div class="tasks-filter-row" id="filter-row"></div>
      <div class="tasks-sort-row" id="sort-toolbar-row">
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

  // Search input binding
  const searchInput = container.querySelector('#tasks-search');
  searchInput.addEventListener('input', e => {
    _searchQuery = e.target.value;
    render();
  });

  // Board view toggle binding
  const viewToggle = container.querySelector('#board-view-toggle');
  viewToggle.addEventListener('click', () => {
    _viewMode = _viewMode === 'board' ? 'list' : 'board';
    viewToggle.innerHTML = `<i class="uil ${_viewMode === 'board' ? 'uil-list-ul' : 'uil-columns'}"></i>`;
    
    // Hide/show sort controls and jump buttons in Kanban view
    const sortRowEl = container.querySelector('#sort-toolbar-row');
    if (sortRowEl) {
      sortRowEl.style.display = _viewMode === 'board' ? 'none' : 'flex';
    }
    
    render();
  });

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
    
    // Apply search filter
    if (_searchQuery.trim()) {
      const q = _searchQuery.toLowerCase().trim();
      const matchedPersonIds = people.filter(p => p.name.toLowerCase().includes(q)).map(p => p.id);
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        matchedPersonIds.includes(t.person) ||
        (t.subtasks && t.subtasks.some(sub => sub.title.toLowerCase().includes(q)))
      );
    }

    const list = container.querySelector('#task-list');
    
    if (_viewMode === 'board') {
      const statuses = ['todo', 'inprogress', 'waiting', 'blocked', 'done'];
      const statusLabels = { todo: 'To Do', inprogress: 'In Progress', waiting: 'Waiting', blocked: 'Blocked', done: 'Done' };
      const statusIcons = { todo: 'uil-clipboard-notes', inprogress: 'uil-history', waiting: 'uil-clock', blocked: 'uil-ban', done: 'uil-check-circle' };
      
      list.className = 'kanban-board animate-in';
      list.innerHTML = statuses.map(s => `
        <div class="kanban-column" data-status="${s}">
          <div class="kanban-column-header">
            <span class="kanban-column-title"><i class="uil ${statusIcons[s]}"></i> ${statusLabels[s]}</span>
            <span class="kanban-column-count">0</span>
          </div>
          <div class="kanban-column-tasks" id="kanban-tasks-${s}"></div>
        </div>
      `).join('');

      statuses.forEach(s => {
        const colTasks = filtered.filter(t => t.status === s);
        const colContainer = list.querySelector(`#kanban-tasks-${s}`);
        const countEl = list.querySelector(`[data-status="${s}"] .kanban-column-count`);
        countEl.textContent = colTasks.length;

        if (colTasks.length === 0) {
          colContainer.innerHTML = `<div class="kanban-empty">No tasks</div>`;
        } else {
          colTasks.forEach((task, idx) => {
            const card = createTaskCard(task, personMap[task.person], {
              onToggle: (id) => { store.toggleTask(id); render(); },
              onEdit:   (t)  => openTaskForm({ task: t, people, onSave: (data) => { store.updateTask(t.id, data); render(); } }),
              onDelete: (id) => { store.deleteTask(id); render(); },
            });
            card.classList.add('kanban-card');
            card.style.animationDelay = `${idx * 20}ms`;
            colContainer.appendChild(card);
          });
        }
      });
      return;
    }

    // List view rendering
    list.className = 'task-list';
    list.innerHTML = '';
    
    filtered = applySort(filtered, _activeSort);

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
