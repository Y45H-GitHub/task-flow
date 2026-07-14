/**
 * TaskForm.js — Add/Edit Task Modal (bottom sheet — Unicons Adapter)
 */
import { PLACE_TYPES } from '../utils/locationUtils.js';
import { today } from '../utils/dateUtils.js';

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const STATUSES   = ['todo', 'inprogress', 'waiting', 'blocked', 'done'];
const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', waiting: 'Waiting', blocked: 'Blocked', done: 'Done' };
const EFFORTS   = ['2min', '15min', '1hr', 'half-day', 'full-day'];
const EFFORT_LABELS = { '2min': '2 min', '15min': '15 min', '1hr': '1 hr', 'half-day': 'Half day', 'full-day': 'Full day' };

export function openTaskForm({ task = null, people = [], onSave, onClose }) {
  const isEdit = !!task;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'task-modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal" id="task-modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'Edit Task' : 'Add Task'}">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2 class="modal-title">${isEdit ? '<i class="uil uil-pen" style="color:var(--accent)"></i> Edit Task' : '<i class="uil uil-plus-circle" style="color:var(--accent)"></i> Add Task'}</h2>
        <button class="modal-close" id="task-modal-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="ft-title">Task *</label>
          <input class="form-input" id="ft-title" type="text" placeholder="What needs to be done?" maxlength="200" value="${esc(task?.title || '')}" autofocus />
        </div>

        <div class="form-group">
          <label class="form-label" for="ft-notes">Notes / Why? <span style="color:var(--text-muted);font-weight:400">(context for future you)</span></label>
          <textarea class="form-textarea form-input" id="ft-notes" placeholder="Why did you add this? Any details..." rows="2">${esc(task?.notes || '')}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ft-priority">Priority</label>
            <select class="form-select form-input" id="ft-priority">
              ${PRIORITIES.map(p => `<option value="${p}" ${task?.priority === p ? 'selected' : (p === 'P3' && !task ? 'selected' : '')}>${priorityLabel(p)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ft-status">Status</label>
            <select class="form-select form-input" id="ft-status">
              ${STATUSES.map(s => `<option value="${s}" ${task?.status === s ? 'selected' : (s === 'todo' && !task ? 'selected' : '')}>${STATUS_LABELS[s]}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ft-effort">Effort</label>
            <select class="form-select form-input" id="ft-effort">
              <option value="">— No estimate —</option>
              ${EFFORTS.map(e => `<option value="${e}" ${task?.effort === e ? 'selected' : ''}>${EFFORT_LABELS[e]}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ft-due">Due Date</label>
            <input class="form-input" id="ft-due" type="date" value="${task?.dueDate || ''}" min="${today()}" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ft-person">Person</label>
            <select class="form-select form-input" id="ft-person">
              ${people.map(p => `<option value="${p.id}" ${task?.person === p.id ? 'selected' : (p.id === 'self' && !task ? 'selected' : '')}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ft-category">Category</label>
            <input class="form-input" id="ft-category" type="text" placeholder="e.g. Health, Work, Finance" value="${esc(task?.category || '')}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="ft-location"><i class="uil uil-map-marker" style="margin-right:2px;color:var(--text-secondary)"></i> Location Trigger</label>
          <select class="form-select form-input" id="ft-location">
            <option value="">— No location trigger —</option>
            ${PLACE_TYPES.map(p => `<option value="${p.id}" ${task?.locationTrigger === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Task will surface under Places tab for this location type</p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-ghost" id="ft-cancel">Cancel</button>
          <button class="btn btn-primary" id="ft-save">${isEdit ? '<i class="uil uil-check"></i> Save' : '<i class="uil uil-plus"></i> Add'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.getElementById('ft-title').focus();

  function collect() {
    return {
      title:           document.getElementById('ft-title').value.trim(),
      notes:           document.getElementById('ft-notes').value.trim(),
      priority:        document.getElementById('ft-priority').value,
      status:          document.getElementById('ft-status').value,
      effort:          document.getElementById('ft-effort').value,
      dueDate:         document.getElementById('ft-due').value,
      person:          document.getElementById('ft-person').value,
      category:        document.getElementById('ft-category').value.trim(),
      locationTrigger: document.getElementById('ft-location').value,
    };
  }

  function close() {
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.2s';
    setTimeout(() => { backdrop.remove(); onClose?.(); }, 200);
  }

  document.getElementById('task-modal-close').onclick = close;
  document.getElementById('ft-cancel').onclick = close;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

  document.getElementById('ft-save').onclick = () => {
    const data = collect();
    if (!data.title) {
      document.getElementById('ft-title').focus();
      document.getElementById('ft-title').style.borderColor = 'var(--p1)';
      return;
    }
    onSave(data);
    close();
  };

  // Enter to save (not in textarea)
  document.getElementById('task-modal').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.shiftKey) {
      document.getElementById('ft-save').click();
    }
    if (e.key === 'Escape') close();
  });
}

function priorityLabel(p) {
  const map = { P1: 'P1 — Critical', P2: 'P2 — High', P3: 'P3 — Normal', P4: 'P4 — Low' };
  return map[p] || p;
}

function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
