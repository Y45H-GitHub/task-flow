/**
 * MoreView.js — Settings / Export tab (Tab 5)
 */
import { store } from '../store/store.js';
import { exportTasksCSV, pendingToText, copyToClipboard } from '../utils/exportUtils.js';
import { isOverdue } from '../utils/dateUtils.js';
import { showToast } from '../app.js';

export function mountMoreView(container) {
  function render() {
    const { tasks, logs, items, people } = store.state;

    const total    = tasks.length;
    const pending  = tasks.filter(t => t.status !== 'done').length;
    const done     = tasks.filter(t => t.status === 'done').length;
    const overdue  = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
    const withLoc  = tasks.filter(t => t.locationTrigger && t.status !== 'done').length;
    const logCount = logs.length;

    container.innerHTML = `
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="color:#a5b4fc">${total}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#fbbf24">${pending}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#4ade80">${done}</div>
          <div class="stat-label">Done</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#f87171">${overdue}</div>
          <div class="stat-label">Overdue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#fbbf24">${withLoc}</div>
          <div class="stat-label">📍 Location</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#a5b4fc">${logCount}</div>
          <div class="stat-label">Log Entries</div>
        </div>
      </div>

      <!-- Export section -->
      <div class="more-section">
        <div class="more-section-title">Export & Share</div>

        <div class="more-item" id="export-csv">
          <div class="more-item-icon" style="background:rgba(34 197 94/0.12)">📊</div>
          <div class="more-item-text">
            <div class="more-item-title">Export to CSV</div>
            <div class="more-item-sub">Download all ${total} tasks as a spreadsheet</div>
          </div>
          <span class="more-item-arrow">→</span>
        </div>

        <div class="more-item" id="copy-pending">
          <div class="more-item-icon" style="background:rgba(99 102 241/0.12)">📋</div>
          <div class="more-item-text">
            <div class="more-item-title">Copy Pending List</div>
            <div class="more-item-sub">Copy ${pending} pending tasks — paste in WhatsApp/Notes</div>
          </div>
          <span class="more-item-arrow">→</span>
        </div>
      </div>

      <!-- Manage section -->
      <div class="more-section">
        <div class="more-section-title">Manage Data</div>

        <div class="more-item" id="clear-done">
          <div class="more-item-icon" style="background:rgba(239 68 68/0.1)">🗑</div>
          <div class="more-item-text">
            <div class="more-item-title">Clear Completed Tasks</div>
            <div class="more-item-sub">Remove ${done} completed task${done !== 1 ? 's' : ''} to declutter</div>
          </div>
          <span class="more-item-arrow">→</span>
        </div>

        <div class="more-item" id="export-json">
          <div class="more-item-icon" style="background:rgba(59 130 246/0.1)">💾</div>
          <div class="more-item-text">
            <div class="more-item-title">Export Full Backup (JSON)</div>
            <div class="more-item-sub">Tasks, logs, people, items — everything</div>
          </div>
          <span class="more-item-arrow">→</span>
        </div>

        <div class="more-item" id="import-json">
          <div class="more-item-icon" style="background:rgba(139 92 246/0.1)">📥</div>
          <div class="more-item-text">
            <div class="more-item-title">Import from Backup</div>
            <div class="more-item-sub">Restore a JSON backup file</div>
          </div>
          <span class="more-item-arrow">→</span>
        </div>
      </div>

      <!-- About section -->
      <div class="more-section">
        <div class="more-section-title">About FlowTask</div>
        <div style="padding:16px 20px">
          <div style="font-size:0.875rem;color:var(--text-secondary);line-height:1.8">
            <strong style="color:var(--text-primary)">FlowTask v2.0</strong> — Built for the features every task app is missing.<br><br>
            ✅ Created timestamp on every task<br>
            📍 Location triggers by store type<br>
            🔥 Aging alerts (7+ days pending)<br>
            ⚠️ Overdue indicators<br>
            👥 Per-person task view for meetings<br>
            📓 Meeting &amp; call log with action items<br>
            🗃 Physical item locator<br>
            ⚡ Quick wins filter (2-min tasks)<br>
            📊 CSV export &amp; WhatsApp copy<br>
            📡 PWA — installable &amp; offline-ready
          </div>
        </div>
      </div>
    `;

    // Bind actions
    container.querySelector('#export-csv').addEventListener('click', () => {
      try {
        exportTasksCSV(tasks, people);
        showToast('✅ CSV downloaded!', 'success');
      } catch { showToast('Export failed.', 'error'); }
    });

    container.querySelector('#copy-pending').addEventListener('click', async () => {
      try {
        const text = pendingToText(tasks, people);
        await copyToClipboard(text);
        showToast('📋 Copied to clipboard!', 'success');
      } catch { showToast('Copy failed.', 'error'); }
    });

    container.querySelector('#clear-done').addEventListener('click', () => {
      if (done === 0) { showToast('No completed tasks to clear.', 'info'); return; }
      if (confirm(`Remove ${done} completed task${done !== 1 ? 's' : ''}? This cannot be undone.`)) {
        store.clearCompleted();
        showToast(`🗑 Cleared ${done} completed task${done !== 1 ? 's' : ''}.`, 'success');
      }
    });

    container.querySelector('#export-json').addEventListener('click', () => {
      try {
        const backup = JSON.stringify(store.state, null, 2);
        const date = new Date().toISOString().slice(0, 10);
        const blob = new Blob([backup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowtask-backup-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('💾 Backup downloaded!', 'success');
      } catch { showToast('Export failed.', 'error'); }
    });

    container.querySelector('#import-json').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.tasks || !data.people) throw new Error('Invalid backup');
          if (confirm('This will replace all current data. Continue?')) {
            store.update(s => {
              s.tasks  = data.tasks  || [];
              s.logs   = data.logs   || [];
              s.items  = data.items  || [];
              s.people = data.people || [];
            });
            showToast('✅ Data imported successfully!', 'success');
          }
        } catch { showToast('Invalid backup file.', 'error'); }
      });
      input.click();
    });
  }

  const unsub = store.subscribe(render);
  render();
  return { unmount: unsub };
}
