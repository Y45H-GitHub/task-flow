/**
 * TaskCard.js — Renders a single task card DOM element
 */
import { timeAgo, formatDateTime, formatDateShort, isOverdue, isAging } from '../utils/dateUtils.js';
import { getPlaceType } from '../utils/locationUtils.js';

const PRIORITY_COLORS = { P1: 'badge-p1', P2: 'badge-p2', P3: 'badge-p3', P4: 'badge-p4' };
const STATUS_BADGE = {
  todo:       { cls: 'badge-todo',       label: 'To Do' },
  inprogress: { cls: 'badge-inprogress', label: 'In Progress' },
  waiting:    { cls: 'badge-waiting',    label: 'Waiting' },
  blocked:    { cls: 'badge-blocked',    label: 'Blocked' },
  done:       { cls: 'badge-done',       label: 'Done' },
};
const EFFORT_ICONS = { '2min': '⚡', '15min': '🕐', '1hr': '⏱', 'half-day': '🌤', 'full-day': '📅' };

/**
 * @param {object} task
 * @param {object} person  — full person object { name, color }
 * @param {object} opts    — { onToggle, onEdit, onDelete }
 */
export function createTaskCard(task, person, { onToggle, onEdit, onDelete }) {
  const card = document.createElement('div');
  card.className = `task-card${task.status === 'done' ? ' done' : ''}${isOverdue(task.dueDate, task.status) ? ' overdue' : ''}`;
  card.dataset.id = task.id;
  card.dataset.priority = task.priority || 'P4';

  const aging = isAging(task.createdAt, task.status);
  const overdue = isOverdue(task.dueDate, task.status);

  // Checkbox
  const check = document.createElement('button');
  check.className = 'task-check';
  check.setAttribute('aria-label', task.status === 'done' ? 'Mark incomplete' : 'Mark complete');
  check.textContent = task.status === 'done' ? '✓' : '';
  check.addEventListener('click', () => onToggle(task.id));
  card.appendChild(check);

  // Body
  const body = document.createElement('div');
  body.className = 'task-body';

  // Title row
  const titleRow = document.createElement('div');
  titleRow.className = 'task-title-row';

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;
  titleRow.appendChild(title);

  // Flags (aging, overdue)
  const flags = document.createElement('div');
  flags.className = 'task-flags';
  if (aging)  flags.innerHTML += `<span class="flag-aging" title="Pending 7+ days">🔥</span>`;
  if (overdue) flags.innerHTML += `<span title="Overdue!">⚠️</span>`;
  titleRow.appendChild(flags);
  body.appendChild(titleRow);

  // Notes
  if (task.notes) {
    const notes = document.createElement('div');
    notes.className = 'task-notes';
    notes.textContent = task.notes;
    body.appendChild(notes);
  }

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  // Priority badge
  if (task.priority) {
    meta.innerHTML += `<span class="badge ${PRIORITY_COLORS[task.priority] || 'badge-p4'}">${task.priority}</span>`;
  }

  // Status badge
  const sb = STATUS_BADGE[task.status] || STATUS_BADGE.todo;
  meta.innerHTML += `<span class="badge ${sb.cls}">${sb.label}</span>`;

  // Person pill
  if (person) {
    meta.innerHTML += `<span class="person-pill" style="background:${person.color}22;color:${person.color};border-color:${person.color}44">${person.name}</span>`;
  }

  // Effort
  if (task.effort && EFFORT_ICONS[task.effort]) {
    meta.innerHTML += `<span class="effort-badge">${EFFORT_ICONS[task.effort]} ${task.effort}</span>`;
  }

  // Due date
  if (task.dueDate) {
    const dueCls = overdue ? 'task-meta-item task-due-overdue' : 'task-meta-item';
    meta.innerHTML += `<span class="${dueCls}"><span class="icon">📅</span>${overdue ? '⚠️ Overdue · ' : ''}Due ${formatDateShort(task.dueDate)}</span>`;
  }

  // Category
  if (task.category) {
    meta.innerHTML += `<span class="task-meta-item"><span class="icon">🏷</span>${escHtml(task.category)}</span>`;
  }

  // Location trigger
  if (task.locationTrigger) {
    const pt = getPlaceType(task.locationTrigger);
    meta.innerHTML += `<span class="location-badge">${pt.icon} ${pt.label}</span>`;
  }

  body.appendChild(meta);

  // Timestamp
  const ts = document.createElement('div');
  ts.className = 'task-timestamp';
  ts.innerHTML = `<span>🕐</span><span>Added ${timeAgo(task.createdAt)} · ${formatDateTime(task.createdAt)}</span>`;
  if (task.completedAt) {
    ts.innerHTML += ` &nbsp;·&nbsp; <span>✓ Done ${timeAgo(task.completedAt)}</span>`;
  }
  body.appendChild(ts);

  card.appendChild(body);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'task-action-btn';
  editBtn.textContent = '✏️';
  editBtn.title = 'Edit';
  editBtn.addEventListener('click', () => onEdit(task));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'task-action-btn delete';
  delBtn.textContent = '🗑';
  delBtn.title = 'Delete';
  delBtn.addEventListener('click', () => {
    if (confirm(`Delete "${task.title}"?`)) onDelete(task.id);
  });
  actions.appendChild(delBtn);

  card.appendChild(actions);

  return card;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
