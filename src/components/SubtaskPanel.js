/**
 * SubtaskPanel.js — Infinite-depth subtask detail drawer.
 * Opens as a side panel when a subtask row is clicked.
 * Supports nested panel stack (click a child → opens new panel on top).
 */
import { store } from '../store/store.js';
import { openTaskForm } from './TaskForm.js';
import {
  getNodeByPath,
  buildBreadcrumb,
  countDirectChildren,
  countDoneDirectChildren,
  allDescendantsDone,
} from '../utils/subtaskUtils.js';

const PRIORITY_COLORS = { P1: 'badge-p1', P2: 'badge-p2', P3: 'badge-p3', P4: 'badge-p4' };
const STATUS_BADGE = {
  todo:       { cls: 'badge-todo',       label: 'To Do' },
  inprogress: { cls: 'badge-inprogress', label: 'In Progress' },
  waiting:    { cls: 'badge-waiting',    label: 'Waiting' },
  blocked:    { cls: 'badge-blocked',    label: 'Blocked' },
  done:       { cls: 'badge-done',       label: 'Done' },
};

/**
 * Open the subtask detail panel.
 * @param {string}   taskId     — root task's ID
 * @param {string[]} path       — path of subtask IDs to the node being opened
 */
export function openSubtaskPanel(taskId, path) {
  // Remove any existing panel first
  document.getElementById('subtask-panel-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'subtask-panel-backdrop';
  backdrop.id = 'subtask-panel-backdrop';

  const panel = document.createElement('div');
  panel.className = 'subtask-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Subtask detail');

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  // Render and animate in
  renderPanel(panel, taskId, path);
  requestAnimationFrame(() => {
    backdrop.classList.add('visible');
    panel.classList.add('visible');
  });

  // Backdrop click closes
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closePanel(backdrop);
  });

  // Escape key closes
  const onKey = (e) => {
    if (e.key === 'Escape') { closePanel(backdrop); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);

  // Re-render on store changes (e.g. checkbox toggle)
  const unsub = store.subscribe(() => {
    const task = store.state.tasks.find(t => t.id === taskId);
    if (!task) { closePanel(backdrop); unsub(); return; }
    renderPanel(panel, taskId, path);
  });

  backdrop._unsub = unsub;
}

function closePanel(backdrop) {
  backdrop.classList.remove('visible');
  backdrop.querySelector('.subtask-panel')?.classList.remove('visible');
  backdrop._unsub?.();
  setTimeout(() => backdrop.remove(), 300);
}

function renderPanel(panel, taskId, path) {
  const task = store.state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const node = getNodeByPath(task, path);
  if (!node) return;

  const crumbs = buildBreadcrumb(task, path);
  const { people } = store.state;
  const personMap = Object.fromEntries(people.map(p => [p.id, p]));

  // ── Header ──────────────────────────────────────────────────────────────
  const headerHTML = `
    <div class="subtask-panel-header">
      <div class="subtask-panel-breadcrumb" id="sp-breadcrumb">
        ${crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return `
            ${i > 0 ? '<span class="subtask-panel-crumb-sep">›</span>' : ''}
            <button class="subtask-panel-crumb${isLast ? ' current' : ''}"
              data-crumb-path="${JSON.stringify(crumb.path)}"
              title="${escHtml(crumb.label)}">
              ${escHtml(truncate(crumb.label, 18))}
            </button>
          `;
        }).join('')}
      </div>
      <button class="subtask-panel-close" id="sp-close" aria-label="Close panel">
        <i class="uil uil-times"></i>
      </button>
    </div>
  `;

  // ── Node Fields ──────────────────────────────────────────────────────────
  const person = personMap[node.person];
  const sb = STATUS_BADGE[node.status] || STATUS_BADGE.todo;
  const fieldsHTML = `
    <div class="subtask-panel-fields">
      <div class="subtask-panel-title">${escHtml(node.title)}</div>
      ${node.notes ? `<div class="subtask-panel-notes">${escHtml(node.notes)}</div>` : ''}
      <div class="subtask-panel-meta">
        ${node.priority ? `<span class="badge ${PRIORITY_COLORS[node.priority] || 'badge-p4'}">${node.priority}</span>` : ''}
        <span class="badge ${sb.cls}">${sb.label}</span>
        ${person ? `<span class="person-pill" style="background:${person.color}22;color:${person.color};border:1px solid ${person.color}44">${person.name}</span>` : ''}
        ${node.dueDate ? `<span class="task-meta-item"><i class="uil uil-calendar-alt" style="font-size:0.875rem"></i> Due ${node.dueDate}</span>` : ''}
        ${node.effort ? `<span class="effort-badge">${node.effort}</span>` : ''}
      </div>
      <button class="subtask-panel-edit-btn" id="sp-edit-btn">
        <i class="uil uil-pen"></i> Edit
      </button>
    </div>
  `;

  // ── Children Section ─────────────────────────────────────────────────────
  const children = node.subtasks || [];
  const doneCount = children.filter(c => c.status === 'done').length;
  const pct = children.length > 0 ? Math.round((doneCount / children.length) * 100) : 0;

  const progressHTML = children.length > 0 ? `
    <div class="subtask-panel-progress">
      <div class="subtask-panel-progress-text">
        <span>Subtasks (${doneCount}/${children.length})</span>
        <span>${pct}%</span>
      </div>
      <div class="subtask-panel-progress-bar-bg">
        <div class="subtask-panel-progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>
  ` : '';

  const childrenListHTML = children.length === 0
    ? `<div class="subtask-panel-empty">No sub-tasks yet — add one below</div>`
    : `<div class="subtask-panel-list" id="sp-child-list">
        ${children.map(child => {
          const grandchildCount = countDirectChildren(child);
          const grandDone = countDoneDirectChildren(child);
          return `
            <div class="subtask-panel-item${child.status === 'done' ? ' done' : ''}"
              data-child-id="${child.id}">
              <button class="subtask-panel-item-check" data-toggle-id="${child.id}"
                aria-label="${child.status === 'done' ? 'Mark incomplete' : 'Mark complete'}">
                ${child.status === 'done' ? '<i class="uil uil-check"></i>' : ''}
              </button>
              <span class="subtask-panel-item-title">${escHtml(child.title)}</span>
              ${grandchildCount > 0 ? `
                <span class="subtask-panel-item-child-pip">
                  <i class="uil uil-layer-group" style="font-size:0.625rem"></i>
                  ${grandDone}/${grandchildCount}
                </span>` : ''}
              <div class="subtask-panel-item-actions">
                <button class="subtask-panel-item-action-btn" data-edit-id="${child.id}" title="Edit">
                  <i class="uil uil-pen"></i>
                </button>
                <button class="subtask-panel-item-action-btn delete" data-delete-id="${child.id}" title="Delete">
                  <i class="uil uil-trash-alt"></i>
                </button>
              </div>
              <i class="uil uil-angle-right subtask-panel-item-open" title="Open subtasks"></i>
            </div>
          `;
        }).join('')}
      </div>`;

  const childrenSectionHTML = `
    <div class="subtask-panel-children">
      <div class="subtask-panel-children-header">
        <span class="subtask-panel-children-title">Sub-tasks</span>
      </div>
      ${progressHTML}
      ${childrenListHTML}
      <div class="subtask-panel-add-form">
        <input type="text" class="subtask-panel-add-input" id="sp-add-input"
          placeholder="+ Add a sub-task…" autocomplete="off" />
        <button class="subtask-panel-add-btn" id="sp-add-btn">Add</button>
      </div>
    </div>
  `;

  // ── Assemble ─────────────────────────────────────────────────────────────
  panel.innerHTML = `
    ${headerHTML}
    <div class="subtask-panel-body">
      ${fieldsHTML}
      ${childrenSectionHTML}
    </div>
  `;

  // ── Event listeners ───────────────────────────────────────────────────────

  // Close button
  panel.querySelector('#sp-close').addEventListener('click', () => {
    closePanel(panel.closest('.subtask-panel-backdrop'));
  });

  // Breadcrumb navigation — click a parent crumb to re-open at that level
  panel.querySelectorAll('.subtask-panel-crumb:not(.current)').forEach(btn => {
    btn.addEventListener('click', () => {
      const crumbPath = JSON.parse(btn.dataset.crumbPath);
      if (crumbPath.length === 0) {
        // Navigating back to root task — close this panel
        closePanel(panel.closest('.subtask-panel-backdrop'));
      } else {
        renderPanel(panel, taskId, crumbPath);
      }
    });
  });

  // Edit this node
  panel.querySelector('#sp-edit-btn').addEventListener('click', () => {
    openTaskForm({
      task: node,
      people,
      isSubtask: true,
      onSave: (data) => {
        store.updateNestedSubtask(taskId, path, data);
      },
    });
  });

  // Child: toggle done
  panel.querySelectorAll('[data-toggle-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const childId = btn.dataset.toggleId;
      const childPath = [...path, childId];
      const childNode = getNodeByPath(task, childPath);
      if (!childNode) return;

      const becomingDone = childNode.status !== 'done';
      const hasChildren = (childNode.subtasks || []).length > 0;

      if (becomingDone && hasChildren && !allDescendantsDone(childNode)) {
        const yes = confirm('Also mark all sub-tasks inside as done?');
        store.toggleNestedSubtask(taskId, childPath, yes);
      } else {
        store.toggleNestedSubtask(taskId, childPath, false);
      }
    });
  });

  // Child: edit
  panel.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const childId = btn.dataset.editId;
      const childPath = [...path, childId];
      const childNode = getNodeByPath(store.state.tasks.find(t => t.id === taskId), childPath);
      if (!childNode) return;
      openTaskForm({
        task: childNode,
        people,
        isSubtask: true,
        onSave: (data) => store.updateNestedSubtask(taskId, childPath, data),
      });
    });
  });

  // Child: delete
  panel.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const childId = btn.dataset.deleteId;
      const childPath = [...path, childId];
      const childNode = getNodeByPath(store.state.tasks.find(t => t.id === taskId), childPath);
      if (!childNode) return;
      if (confirm(`Delete "${childNode.title}"${(childNode.subtasks || []).length > 0 ? ' and all its sub-tasks' : ''}?`)) {
        store.deleteNestedSubtask(taskId, childPath);
      }
    });
  });

  // Child: drill into (click on the row itself, excluding buttons)
  panel.querySelectorAll('.subtask-panel-item').forEach(row => {
    row.addEventListener('click', (e) => {
      // Ignore if clicking a button inside the row
      if (e.target.closest('button')) return;
      const childId = row.dataset.childId;
      renderPanel(panel, taskId, [...path, childId]);
    });
  });

  // Inline add sub-task
  const addInput = panel.querySelector('#sp-add-input');
  const addBtn   = panel.querySelector('#sp-add-btn');

  const handleAdd = () => {
    const text = addInput.value.trim();
    if (!text) return;
    // path points to the current node; add a child at this node's level
    store.addNestedSubtask(taskId, path, { title: text });
    addInput.value = '';
    addInput.focus();
  };

  addBtn.addEventListener('click', handleAdd);
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') addInput.blur();
  });

  // Focus the add input after render
  setTimeout(() => addInput?.focus(), 50);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str = '') {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}
