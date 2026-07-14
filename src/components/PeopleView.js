/**
 * PeopleView.js — People tab (Tab 2 — Unicons Adapter)
 */
import { store } from '../store/store.js';
import { isOverdue, formatDateShort } from '../utils/dateUtils.js';

const PRIORITY_ORDER_MAP = { P1: 1, P2: 2, P3: 3, P4: 4 };

export function mountPeopleView(container) {
  function render() {
    const { tasks, people } = store.state;
    container.innerHTML = '';

    // Add person header
    const headerRow = document.createElement('div');
    headerRow.className = 'section-header';
    headerRow.innerHTML = `
      <span class="section-title">Tasks by Person</span>
      <button class="btn btn-ghost" id="add-person-btn" style="font-size:0.8125rem"><i class="uil uil-user-plus" style="margin-right:2px"></i> Add Person</button>
    `;
    container.appendChild(headerRow);

    headerRow.querySelector('#add-person-btn').addEventListener('click', showAddPersonModal);

    const pendingTasks = tasks.filter(t => t.status !== 'done');

    if (!people.length) {
      container.innerHTML += `
        <div class="empty-state">
          <div class="empty-icon"><i class="uil uil-users-alt"></i></div>
          <div class="empty-title">No people yet</div>
          <div class="empty-sub">Add people to tag tasks</div>
        </div>`;
      return;
    }

    // Grid container to hold person groups
    const grid = document.createElement('div');
    grid.className = 'people-grid';

    let hasAny = false;
    people.forEach((person, idx) => {
      const personTasks = pendingTasks
        .filter(t => t.person === person.id)
        .sort((a, b) => (PRIORITY_ORDER_MAP[a.priority] || 5) - (PRIORITY_ORDER_MAP[b.priority] || 5));

      if (!personTasks.length) return;
      hasAny = true;

      const group = document.createElement('div');
      group.className = 'person-group animate-in';
      group.style.animationDelay = `${idx * 40}ms`;

      group.innerHTML = `
        <div class="person-group-header">
          <div class="person-avatar" style="background:${person.color}22;color:${person.color}">
            ${person.name.slice(0, 2).toUpperCase()}
          </div>
          <div class="person-info">
            <div class="person-name">${escHtml(person.name)}</div>
            <div class="person-task-count">${personTasks.length} task${personTasks.length !== 1 ? 's' : ''}</div>
          </div>
          ${person.id !== 'self' ? `<button class="btn btn-ghost" data-del="${person.id}" style="font-size:0.75rem;padding:4px 10px"><i class="uil uil-times"></i></button>` : ''}
        </div>
        <div class="person-task-list">
          ${personTasks.map(t => `
            <div class="person-task-item">
              <span class="badge badge-${t.priority?.toLowerCase() || 'p4'}">${t.priority || 'P4'}</span>
              <span class="ptask-title">${escHtml(t.title)}</span>
              ${t.dueDate ? `<span class="ptask-due${isOverdue(t.dueDate, t.status) ? ' overdue' : ''}"><i class="uil uil-calendar-alt" style="margin-right:2px"></i> ${formatDateShort(t.dueDate)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `;

      if (person.id !== 'self') {
        group.querySelector(`[data-del="${person.id}"]`).addEventListener('click', (e) => {
          e.stopPropagation();
          deletePerson(person.id);
        });
      }

      grid.appendChild(group);
    });

    if (hasAny) {
      container.appendChild(grid);
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-icon"><i class="uil uil-users-alt"></i></div>
        <div class="empty-title">All caught up!</div>
        <div class="empty-sub">No pending tasks for anyone.</div>
      `;
      container.appendChild(empty);
    }

    // Show inactive/clear people
    const emptyPeople = people.filter(p => !pendingTasks.some(t => t.person === p.id));
    if (emptyPeople.length && hasAny) {
      const section = document.createElement('div');
      section.innerHTML = `<div class="section-header" style="margin-top:32px"><span class="section-title">All Clear ✓</span></div>`;
      const chips = document.createElement('div');
      chips.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
      emptyPeople.forEach(p => {
        chips.innerHTML += `<span class="person-pill" style="padding:6px 14px;font-size:0.8125rem;background:${p.color}08;color:${p.color};border:1px solid ${p.color}15">${p.name}</span>`;
      });
      section.appendChild(chips);
      container.appendChild(section);
    }
  }

  function deletePerson(id) {
    if (confirm('Delete this person? Their tasks will remain but become unassigned.')) {
      store.update(s => {
        s.tasks.forEach(t => { if (t.person === id) t.person = 'self'; });
        s.people = s.people.filter(p => p.id !== id);
      });
    }
  }

  function showAddPersonModal() {
    const colors = ['#6366f1','#ec4899','#3b82f6','#22c55e','#f97316','#a855f7','#14b8a6','#f59e0b','#ef4444','#64748b'];
    let selectedColor = colors[0];

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="border-radius:var(--r-xl)">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h2 class="modal-title"><i class="uil uil-user-plus" style="color:var(--accent)"></i> Add Person</h2>
          <button class="modal-close" id="ap-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-input" id="ap-name" type="text" placeholder="e.g. Ravi, Mom, Boss..." maxlength="30" autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">Color Swatch</label>
            <div class="person-color-row" id="color-row">
              ${colors.map(c => `<div class="person-color-swatch${c === selectedColor ? ' selected' : ''}" data-color="${c}" style="background:${c}"></div>`).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="ap-cancel">Cancel</button>
            <button class="btn btn-primary" id="ap-save">Add Person</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.querySelectorAll('.person-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        selectedColor = sw.dataset.color;
        backdrop.querySelectorAll('.person-color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
      });
    });

    function close() { backdrop.remove(); }
    backdrop.querySelector('#ap-close').onclick = close;
    backdrop.querySelector('#ap-cancel').onclick = close;
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#ap-save').onclick = () => {
      const name = backdrop.querySelector('#ap-name').value.trim();
      if (!name) { backdrop.querySelector('#ap-name').focus(); return; }
      store.addPerson({ name, color: selectedColor });
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
