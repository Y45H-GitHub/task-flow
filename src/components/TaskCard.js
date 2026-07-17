/**
 * TaskCard.js — Renders a single task card DOM element (Unicons Adapter)
 */
import { timeAgo, formatDateTime, formatDateShort, isOverdue, isAging } from '../utils/dateUtils.js';
import { getPlaceType } from '../utils/locationUtils.js';
import { store } from '../store/store.js';
import { openTaskForm } from './TaskForm.js';
import { openSubtaskPanel } from './SubtaskPanel.js';
import { countDirectChildren, countDoneDirectChildren } from '../utils/subtaskUtils.js';

const PRIORITY_COLORS = { P1: 'badge-p1', P2: 'badge-p2', P3: 'badge-p3', P4: 'badge-p4' };
const STATUS_BADGE = {
  todo:       { cls: 'badge-todo',       label: 'To Do' },
  inprogress: { cls: 'badge-inprogress', label: 'In Progress' },
  waiting:    { cls: 'badge-waiting',    label: 'Waiting' },
  blocked:    { cls: 'badge-blocked',    label: 'Blocked' },
  done:       { cls: 'badge-done',       label: 'Done' },
};
const EFFORT_ICONS = { 
  '2min': '<i class="uil uil-bolt" style="font-size:0.875rem"></i>', 
  '15min': '<i class="uil uil-clock" style="font-size:0.875rem"></i>', 
  '1hr': '<i class="uil uil-history" style="font-size:0.875rem"></i>', 
  'half-day': '<i class="uil uil-sun" style="font-size:0.875rem"></i>', 
  'full-day': '<i class="uil uil-calendar-alt" style="font-size:0.875rem"></i>' 
};

function getKeywords(title) {
  if (!title) return [];
  return title.toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 3);
}

/**
 * @param {object} task
 * @param {object} person  — full person object { name, color }
 * @param {object} opts    — { onToggle, onEdit, onDelete }
 */
export function createTaskCard(task, person, { onToggle, onEdit, onDelete }) {
  const card = document.createElement('div');
  card.className = `task-card${task.status === 'done' ? ' done' : ''}${isOverdue(task.dueDate, task.status) ? ' overdue' : ''}${task.starred ? ' starred' : ''}`;
  card.dataset.id = task.id;
  card.dataset.priority = task.priority || 'P4';

  const aging = isAging(task.createdAt, task.status);
  const overdue = isOverdue(task.dueDate, task.status);

  // Checkbox
  const check = document.createElement('button');
  check.className = 'task-check';
  check.setAttribute('aria-label', task.status === 'done' ? 'Mark incomplete' : 'Mark complete');
  check.innerHTML = task.status === 'done' ? '<i class="uil uil-check"></i>' : '';
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
  if (aging)  flags.innerHTML += `<i class="uil uil-fire flag-aging" title="Pending 7+ days" style="color:#ef4444;font-size:1.125rem"></i>`;
  if (overdue) flags.innerHTML += `<i class="uil uil-exclamation-triangle" title="Overdue!" style="color:#ef4444;font-size:1.125rem;margin-left:2px"></i>`;
  titleRow.appendChild(flags);
  body.appendChild(titleRow);

  // Notes
  if (task.notes) {
    const notes = document.createElement('div');
    notes.className = 'task-notes';
    notes.textContent = task.notes;
    body.appendChild(notes);
  }

  // Subtasks section
  const subtasksList = document.createElement('div');
  subtasksList.className = 'task-card-subtasks';

  if (task.subtasks && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter(s => s.status === 'done').length;
    const pct = Math.round((doneCount / task.subtasks.length) * 100);

    const progressWrap = document.createElement('div');
    progressWrap.className = 'subtask-progress-wrap';
    progressWrap.innerHTML = `
      <div class="subtask-progress-text">
        <span>Checklist (${doneCount}/${task.subtasks.length})</span>
        <span>${pct}%</span>
      </div>
      <div class="subtask-progress-bar-bg">
        <div class="subtask-progress-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    subtasksList.appendChild(progressWrap);

    const listContainer = document.createElement('div');
    listContainer.className = 'subtask-items-list';

    task.subtasks.forEach(sub => {
      const item = document.createElement('div');
      item.className = `subtask-item${sub.status === 'done' ? ' done' : ''}`;

      const subCheck = document.createElement('button');
      subCheck.className = 'subtask-check';
      subCheck.innerHTML = sub.status === 'done' ? '<i class="uil uil-check"></i>' : '';
      subCheck.addEventListener('click', (e) => {
        e.stopPropagation();
        // Confirm if has children and becoming done
        const path = [sub.id];
        const becomingDone = sub.status !== 'done';
        const hasChildren = (sub.subtasks || []).length > 0;
        if (becomingDone && hasChildren) {
          const yes = confirm('Also mark all sub-tasks inside as done?');
          store.toggleNestedSubtask(task.id, path, yes);
        } else {
          store.toggleNestedSubtask(task.id, path, false);
        }
      });

      const subTitle = document.createElement('span');
      subTitle.className = 'subtask-title';
      subTitle.textContent = sub.title;

      // Children count pip
      const childCount = countDirectChildren(sub);
      const childDone  = countDoneDirectChildren(sub);

      const subActions = document.createElement('div');
      subActions.className = 'subtask-actions';

      const subEdit = document.createElement('button');
      subEdit.className = 'subtask-action-btn';
      subEdit.innerHTML = '<i class="uil uil-pen"></i>';
      subEdit.title = 'Edit Subtask';
      subEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        const { people } = store.state;
        openTaskForm({
          task: sub,
          people,
          isSubtask: true,
          onSave: (data) => {
            store.updateNestedSubtask(task.id, [sub.id], data);
          }
        });
      });

      const subDel = document.createElement('button');
      subDel.className = 'subtask-action-btn delete';
      subDel.innerHTML = '<i class="uil uil-trash-alt"></i>';
      subDel.title = 'Delete Subtask';
      subDel.addEventListener('click', (e) => {
        e.stopPropagation();
        const msg = childCount > 0
          ? `Delete "${sub.title}" and its ${childCount} sub-task(s)?`
          : `Delete subtask "${sub.title}"?`;
        if (confirm(msg)) {
          store.deleteNestedSubtask(task.id, [sub.id]);
        }
      });

      // Drill-in button — opens SubtaskPanel
      const drillBtn = document.createElement('button');
      drillBtn.className = 'subtask-drill-btn';
      drillBtn.innerHTML = '<i class="uil uil-angle-right"></i>';
      drillBtn.title = 'Open sub-tasks';
      drillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSubtaskPanel(task.id, [sub.id]);
      });

      subActions.appendChild(subEdit);
      subActions.appendChild(subDel);

      item.appendChild(subCheck);
      item.appendChild(subTitle);

      // Insert pip if sub has children
      if (childCount > 0) {
        const pip = document.createElement('span');
        pip.className = 'subtask-children-pip';
        pip.innerHTML = `<i class="uil uil-layer-group" style="font-size:0.625rem"></i> ${childDone}/${childCount}`;
        item.appendChild(pip);
      }

      item.appendChild(subActions);
      item.appendChild(drillBtn);

      // Click anywhere on the row (not a button) opens the panel
      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openSubtaskPanel(task.id, [sub.id]);
      });

      listContainer.appendChild(item);
    });

    subtasksList.appendChild(listContainer);
  }

  // Inline Add Subtask input (adds direct child to root task)
  const addSubtaskForm = document.createElement('div');
  addSubtaskForm.className = 'subtask-add-form';
  addSubtaskForm.innerHTML = `
    <input type="text" class="subtask-add-input" placeholder="+ Add a step..." />
    <button class="btn btn-ghost subtask-add-btn" style="padding: 4px 8px; font-size: 0.75rem; display: none">Add</button>
  `;
  const input = addSubtaskForm.querySelector('.subtask-add-input');
  const btn = addSubtaskForm.querySelector('.subtask-add-btn');

  input.addEventListener('focus', () => { btn.style.display = 'block'; });
  input.addEventListener('blur', () => {
    setTimeout(() => { if (document.activeElement !== input) btn.style.display = 'none'; }, 200);
  });

  const handleAdd = () => {
    const text = input.value.trim();
    if (text) {
      store.addSubtask(task.id, { title: text });
      input.value = '';
    }
  };
  btn.addEventListener('click', handleAdd);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  });

  subtasksList.appendChild(addSubtaskForm);
  body.appendChild(subtasksList);

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
    meta.innerHTML += `<span class="${dueCls}"><i class="uil uil-calendar-alt" style="font-size:0.875rem"></i>${overdue ? 'Overdue · ' : ''}Due ${formatDateShort(task.dueDate)}</span>`;
  }

  // Category
  if (task.category) {
    meta.innerHTML += `<span class="task-meta-item"><i class="uil uil-tag-alt" style="font-size:0.875rem"></i>${escHtml(task.category)}</span>`;
  }

  // Location trigger
  if (task.locationTrigger) {
    const pt = getPlaceType(task.locationTrigger);
    meta.innerHTML += `<span class="location-badge"><i class="uil ${pt.icon}" style="font-size:0.875rem"></i> ${pt.label}</span>`;
  }

  body.appendChild(meta);

  // Related Tasks grouping across people
  const allTasks = store.state.tasks;
  const people = store.state.people;
  const personMap = Object.fromEntries(people.map(p => [p.id, p]));
  const currentKeywords = getKeywords(task.title);

  const relatedTasks = allTasks.filter(t => {
    if (t.id === task.id || t.status === 'done' || t.person === task.person) return false;

    const catMatch = t.category && task.category && t.category.trim().toLowerCase() === task.category.trim().toLowerCase();
    if (catMatch) return true;

    const tKeywords = getKeywords(t.title);
    return currentKeywords.some(k => tKeywords.includes(k));
  });

  if (relatedTasks.length > 0) {
    const relatedSection = document.createElement('div');
    relatedSection.className = 'task-related-section';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'related-toggle-btn';
    toggleBtn.innerHTML = `<i class="uil uil-link-h"></i> Related Tasks (${relatedTasks.length})`;

    const relatedList = document.createElement('div');
    relatedList.className = 'related-tasks-list';
    relatedList.style.display = 'none';

    relatedTasks.forEach(rt => {
      const rtItem = document.createElement('div');
      rtItem.className = 'related-task-item';
      const rtPerson = personMap[rt.person] || { name: 'Unassigned', color: 'var(--text-muted)' };
      rtItem.innerHTML = `
        <span class="person-pill" style="background:${rtPerson.color}22;color:${rtPerson.color};font-size:0.6875rem;border: 1px solid ${rtPerson.color}44">${rtPerson.name}</span>
        <span class="related-task-title">${escHtml(rt.title)}</span>
      `;
      relatedList.appendChild(rtItem);
    });

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = relatedList.style.display === 'none';
      relatedList.style.display = isHidden ? 'flex' : 'none';
      toggleBtn.classList.toggle('active', isHidden);
    });

    relatedSection.appendChild(toggleBtn);
    relatedSection.appendChild(relatedList);
    body.appendChild(relatedSection);
  }

  // Timestamp
  const ts = document.createElement('div');
  ts.className = 'task-timestamp';
  ts.innerHTML = `<i class="uil uil-clock-three" style="font-size:0.8125rem"></i> <span>Added ${timeAgo(task.createdAt)} · ${formatDateTime(task.createdAt)}</span>`;
  if (task.completedAt) {
    ts.innerHTML += ` &nbsp;·&nbsp; <i class="uil uil-check-circle" style="font-size:0.8125rem;color:var(--status-done)"></i> <span>Done ${timeAgo(task.completedAt)}</span>`;
  }
  body.appendChild(ts);

  card.appendChild(body);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  // Star Toggle
  const starBtn = document.createElement('button');
  starBtn.className = `task-action-btn star-btn${task.starred ? ' starred' : ''}`;
  starBtn.innerHTML = task.starred ? '<i class="uil uil-star" style="color:#fbbf24"></i>' : '<i class="uil uil-star"></i>';
  starBtn.title = task.starred ? 'Unstar' : 'Star';
  starBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    store.updateTask(task.id, { starred: !task.starred });
  });
  actions.appendChild(starBtn);

  const editBtn = document.createElement('button');
  editBtn.className = 'task-action-btn';
  editBtn.innerHTML = '<i class="uil uil-pen"></i>';
  editBtn.title = 'Edit';
  editBtn.addEventListener('click', () => onEdit(task));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'task-action-btn delete';
  delBtn.innerHTML = '<i class="uil uil-trash-alt"></i>';
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
