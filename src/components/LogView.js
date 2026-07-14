/**
 * LogView.js — Meeting / Call / Conversation Log tab (Tab 4)
 */
import { store } from '../store/store.js';
import { formatDate, timeAgo } from '../utils/dateUtils.js';

const LOG_TYPES = ['Meeting', 'Call', 'WhatsApp', 'Email', 'In-person'];
const LOG_ICONS = { Meeting: '🤝', Call: '📞', WhatsApp: '💬', Email: '📧', 'In-person': '👋' };

export function mountLogView(container) {
  let searchQuery = '';

  function render() {
    const { logs, people } = store.state;
    container.innerHTML = '';

    // Search bar
    const searchBar = document.createElement('div');
    searchBar.className = 'log-search';
    searchBar.innerHTML = `
      <span class="log-search-icon">🔍</span>
      <input class="form-input" id="log-search" type="text" placeholder="Search logs — person, summary, action items..." value="${escHtml(searchQuery)}" />
    `;
    container.appendChild(searchBar);

    searchBar.querySelector('#log-search').addEventListener('input', e => {
      searchQuery = e.target.value;
      renderLogs();
    });

    // Add log button
    const headerRow = document.createElement('div');
    headerRow.className = 'section-header';
    headerRow.innerHTML = `
      <span class="section-title">Conversation Log</span>
      <button class="btn btn-primary" id="add-log-btn" style="font-size:0.8125rem;padding:6px 14px">+ Add Entry</button>
    `;
    container.appendChild(headerRow);

    headerRow.querySelector('#add-log-btn').addEventListener('click', () => showLogForm(null, people));

    renderLogs();
  }

  function renderLogs() {
    const { logs, people } = store.state;
    const personMap = Object.fromEntries(people.map(p => [p.id, p]));

    // Remove old log list if present
    const old = container.querySelector('.log-list');
    if (old) old.remove();

    const list = document.createElement('div');
    list.className = 'log-list';

    const q = searchQuery.toLowerCase();
    const filtered = logs.filter(l => {
      if (!q) return true;
      return (
        l.with?.toLowerCase().includes(q) ||
        l.summary?.toLowerCase().includes(q) ||
        l.actionItems?.toLowerCase().includes(q) ||
        l.tags?.toLowerCase().includes(q)
      );
    });

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📓</div>
          <div class="empty-title">${q ? 'No results' : 'No log entries yet'}</div>
          <div class="empty-sub">${q ? 'Try a different search' : 'Log meetings, calls, and conversations'}</div>
        </div>
      `;
      container.appendChild(list);
      return;
    }

    filtered.forEach((log, idx) => {
      const card = document.createElement('div');
      card.className = 'log-card';
      card.style.animationDelay = `${idx * 40}ms`;

      const icon = LOG_ICONS[log.type] || '📝';
      const actions = (log.actionItems || '').split(',').map(a => a.trim()).filter(Boolean);
      const tags = (log.tags || '').split(',').map(t => t.trim()).filter(Boolean);

      card.innerHTML = `
        <div class="log-card-header">
          <div class="log-type-icon">${icon}</div>
          <div class="log-meta">
            <div class="log-with">${escHtml(log.with || 'Unknown')}</div>
            <div class="log-date-type">${log.type || 'Meeting'} · ${log.date ? formatDate(log.date) : formatDate(log.createdAt)} · Added ${timeAgo(log.createdAt)}</div>
          </div>
          <div class="log-actions">
            <button class="task-action-btn" data-edit="${log.id}" title="Edit">✏️</button>
            <button class="task-action-btn delete" data-del="${log.id}" title="Delete">🗑</button>
          </div>
        </div>

        ${log.summary ? `<div class="log-summary">${escHtml(log.summary)}</div>` : ''}

        ${actions.length ? `
          <div class="log-action-items">
            ${actions.map(a => `<div class="log-action-item">${escHtml(a)}</div>`).join('')}
          </div>` : ''}

        ${tags.length ? `
          <div class="log-tags">
            ${tags.map(t => `<span class="log-tag">${escHtml(t)}</span>`).join('')}
          </div>` : ''}
      `;

      card.querySelector(`[data-edit="${log.id}"]`).addEventListener('click', () => {
        showLogForm(log, store.state.people);
      });
      card.querySelector(`[data-del="${log.id}"]`).addEventListener('click', () => {
        if (confirm(`Delete this log entry?`)) store.deleteLog(log.id);
      });

      list.appendChild(card);
    });

    container.appendChild(list);
  }

  function showLogForm(log, people) {
    const isEdit = !!log;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h2 class="modal-title">${isEdit ? '✏️ Edit Log Entry' : '📓 Add Log Entry'}</h2>
          <button class="modal-close" id="lf-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">With (person/group) *</label>
              <input class="form-input" id="lf-with" type="text" placeholder="e.g. KJ, Team, Client..." value="${escHtml(log?.with || '')}" autofocus />
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-select form-input" id="lf-type">
                ${LOG_TYPES.map(t => `<option value="${t}" ${log?.type === t ? 'selected' : (t === 'Meeting' && !log ? 'selected' : '')}>${LOG_ICONS[t]} ${t}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Date *</label>
            <input class="form-input" id="lf-date" type="date" value="${log?.date || new Date().toISOString().slice(0, 10)}" />
          </div>

          <div class="form-group">
            <label class="form-label">Summary / What was discussed</label>
            <textarea class="form-textarea form-input" id="lf-summary" placeholder="Key discussion points, decisions made..." rows="3">${escHtml(log?.summary || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Action Items <span style="color:var(--text-muted);font-weight:400">(comma separated)</span></label>
            <textarea class="form-textarea form-input" id="lf-actions" placeholder="Send proposal, Call back on Friday, Share files..." rows="2">${escHtml(log?.actionItems || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Tags <span style="color:var(--text-muted);font-weight:400">(comma separated)</span></label>
            <input class="form-input" id="lf-tags" type="text" placeholder="e.g. project-x, urgent, followup" value="${escHtml(log?.tags || '')}" />
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" id="lf-cancel">Cancel</button>
            <button class="btn btn-primary" id="lf-save">${isEdit ? '💾 Save' : '📝 Log It'}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    function collect() {
      return {
        with:        backdrop.querySelector('#lf-with').value.trim(),
        type:        backdrop.querySelector('#lf-type').value,
        date:        backdrop.querySelector('#lf-date').value,
        summary:     backdrop.querySelector('#lf-summary').value.trim(),
        actionItems: backdrop.querySelector('#lf-actions').value.trim(),
        tags:        backdrop.querySelector('#lf-tags').value.trim(),
      };
    }

    function close() { backdrop.remove(); }
    backdrop.querySelector('#lf-close').onclick = close;
    backdrop.querySelector('#lf-cancel').onclick = close;
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

    backdrop.querySelector('#lf-save').onclick = () => {
      const data = collect();
      if (!data.with) { backdrop.querySelector('#lf-with').focus(); return; }
      if (isEdit) {
        store.updateLog(log.id, data);
      } else {
        store.addLog(data);
      }
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
