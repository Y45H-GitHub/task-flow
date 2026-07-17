/**
 * MoreView.js — Settings / Export tab (Tab 5 — Unicons Adapter)
 */
import { store } from '../store/store.js';
import { exportTasksCSV, pendingToText, copyToClipboard } from '../utils/exportUtils.js';
import { isOverdue } from '../utils/dateUtils.js';
import { showToast, startDueDateReminders, stopDueDateReminders } from '../app.js';
import {
  isRemindersEnabled, setRemindersEnabled,
  getLeadHours, setLeadHours,
  requestNotificationPermission,
} from '../utils/notificationUtils.js';

export function mountMoreView(container) {
  function render() {
    const { tasks, logs, items, people } = store.state;

    const total    = tasks.length;
    const pending  = tasks.filter(t => t.status !== 'done').length;
    const done     = tasks.filter(t => t.status === 'done').length;
    const overdue  = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
    const withLoc  = tasks.filter(t => t.locationTrigger && t.status !== 'done').length;
    const logCount = logs.length;

    const remindersEnabled  = isRemindersEnabled();
    const currentLeadHours  = getLeadHours();
    const LEAD_OPTIONS = [
      { value: 0,  label: 'Same day'     },
      { value: 1,  label: '1 hr before'  },
      { value: 2,  label: '2 hrs before' },
      { value: 24, label: '1 day before' },
      { value: 48, label: '2 days before'},
    ];

    container.innerHTML = `
      <!-- Stats (Adapts to single line on desktop) -->
      <div class="stats-grid animate-in">
        <div class="stat-card">
          <div class="stat-value" style="color:var(--accent)">${total}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#fbbf24">${pending}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#10b981">${done}</div>
          <div class="stat-label">Done</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#ef4444">${overdue}</div>
          <div class="stat-label">Overdue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:#f59e0b">${withLoc}</div>
          <div class="stat-label">📍 Location</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--accent)">${logCount}</div>
          <div class="stat-label">Logs</div>
        </div>
      </div>

      <!-- Bento Grid for settings columns -->
      <div class="more-dashboard-grid animate-in" style="animation-delay: 50ms">
        <!-- Export block -->
        <div class="more-section">
          <div class="more-section-title">Export & Share</div>

          <div class="more-item" id="export-csv">
            <div class="more-item-icon" style="background:rgba(16, 185, 129, 0.08);color:#10b981"><i class="uil uil-file-share-alt"></i></div>
            <div class="more-item-text">
              <div class="more-item-title">Export to CSV</div>
              <div class="more-item-sub">Download all ${total} tasks as a spreadsheet</div>
            </div>
            <span class="more-item-arrow">→</span>
          </div>

          <div class="more-item" id="copy-pending">
            <div class="more-item-icon" style="background:rgba(56, 189, 248, 0.08);color:var(--accent)"><i class="uil uil-copy"></i></div>
            <div class="more-item-text">
              <div class="more-item-title">Copy Pending List</div>
              <div class="more-item-sub">Copy ${pending} pending tasks to paste in WhatsApp</div>
            </div>
            <span class="more-item-arrow">→</span>
          </div>
        </div>

        <!-- Manage data block -->
        <div class="more-section">
          <div class="more-section-title">Manage Data</div>

          <div class="more-item" id="clear-done">
            <div class="more-item-icon" style="background:rgba(239, 68, 68, 0.08);color:#f87171"><i class="uil uil-trash-alt"></i></div>
            <div class="more-item-text">
              <div class="more-item-title">Clear Completed Tasks</div>
              <div class="more-item-sub">Remove ${done} completed task${done !== 1 ? 's' : ''}</div>
            </div>
            <span class="more-item-arrow">→</span>
          </div>

          <div class="more-item" id="export-json">
            <div class="more-item-icon" style="background:rgba(59, 130, 246, 0.08);color:#3b82f6"><i class="uil uil-save"></i></div>
            <div class="more-item-text">
              <div class="more-item-title">Export Full Backup</div>
              <div class="more-item-sub">All data as a portable backup JSON file</div>
            </div>
            <span class="more-item-arrow">→</span>
          </div>

          <div class="more-item" id="import-json">
            <div class="more-item-icon" style="background:rgba(56, 189, 248, 0.08);color:var(--accent)"><i class="uil uil-import"></i></div>
            <div class="more-item-text">
              <div class="more-item-title">Import Backup</div>
              <div class="more-item-sub">Restore tasks, logs, and items from JSON backup</div>
            </div>
            <span class="more-item-arrow">→</span>
          </div>
        </div>

        <!-- Reminders block -->
        <div class="more-section">
          <div class="more-section-title">Reminders</div>

          <div class="more-item" style="cursor:default;align-items:flex-start;flex-direction:column;gap:16px;padding:20px 24px;border-bottom:none">
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
              <div>
                <div class="more-item-title">Due Date Reminders</div>
                <div class="more-item-sub" id="reminder-status-text">${remindersEnabled ? 'Reminders are on' : 'Get notified before tasks are due'}</div>
              </div>
              <label class="toggle-switch" aria-label="Toggle due date reminders">
                <input type="checkbox" id="reminders-toggle" ${remindersEnabled ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div id="reminder-lead-section" style="width:100%;${remindersEnabled ? '' : 'display:none'}">
              <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px">Remind me</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap" id="reminder-lead-chips">
                ${LEAD_OPTIONS.map(opt => `
                  <button class="filter-chip${currentLeadHours === opt.value ? ' active' : ''}" data-hours="${opt.value}" id="lead-opt-${opt.value}">${opt.label}</button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- About block (spans full width on desktop) -->
        <div class="more-section more-about-card">
          <div class="more-section-title">About FlowTask</div>
          <div style="padding:20px 24px">
            <div style="font-size:0.875rem;color:var(--text-secondary);line-height:1.8">
              <strong style="color:var(--text-primary)">FlowTask v2.0</strong> — Designed around the gaps in standard productivity tools.<br><br>
              <div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));gap: 12px;margin-top:8px">
                <div><i class="uil uil-history" style="color:var(--accent);margin-right:2px"></i> <strong>Created timestamp</strong> on tasks</div>
                <div><i class="uil uil-map-marker" style="color:var(--accent);margin-right:2px"></i> <strong>Location triggers</strong> by type</div>
                <div><i class="uil uil-fire" style="color:var(--accent);margin-right:2px"></i> <strong>Aging alerts</strong> (7+ days)</div>
                <div><i class="uil uil-exclamation-triangle" style="color:var(--accent);margin-right:2px"></i> <strong>Overdue indicators</strong></div>
                <div><i class="uil uil-users-alt" style="color:var(--accent);margin-right:2px"></i> <strong>Per-person tasks</strong> for meetings</div>
                <div><i class="uil uil-book-open" style="color:var(--accent);margin-right:2px"></i> <strong>Conversation logs</strong></div>
                <div><i class="uil uil-box" style="color:var(--accent);margin-right:2px"></i> <strong>Physical item memory</strong></div>
                <div><i class="uil uil-bolt" style="color:var(--accent);margin-right:2px"></i> <strong>Quick wins</strong> (2-min tasks)</div>
                <div><i class="uil uil-rss" style="color:var(--accent);margin-right:2px"></i> <strong>PWA support</strong> &amp; offline</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind click events
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
        showToast(`🗑 Cleared ${done} completed tasks.`, 'success');
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
              s.tasks = data.tasks || [];
              s.logs = data.logs || [];
              s.items = data.items || [];
              s.people = data.people || [];
            });
            showToast('✅ Data restored!', 'success');
          }
        } catch { showToast('Invalid backup file.', 'error'); }
      });
      input.click();
    });

    // ── Reminders ──────────────────────────────────────────────────────────
    const remindersToggle = container.querySelector('#reminders-toggle');
    const leadSection     = container.querySelector('#reminder-lead-section');
    const statusText      = container.querySelector('#reminder-status-text');

    if (remindersToggle) {
      remindersToggle.addEventListener('change', async e => {
        if (e.target.checked) {
          const permission = await requestNotificationPermission();
          if (permission === 'unsupported') {
            showToast('Browser notifications are not supported.', 'error');
            remindersToggle.checked = false;
            return;
          }
          if (permission === 'denied') {
            showToast('Notification permission denied — enable it in your browser settings.', 'error');
            remindersToggle.checked = false;
            return;
          }
          setRemindersEnabled(true);
          startDueDateReminders();
          if (leadSection) leadSection.style.display = '';
          if (statusText)  statusText.textContent = 'Reminders are on';
          showToast('Due date reminders enabled!', 'success');
        } else {
          setRemindersEnabled(false);
          stopDueDateReminders();
          if (leadSection) leadSection.style.display = 'none';
          if (statusText)  statusText.textContent = 'Get notified before tasks are due';
          showToast('Reminders disabled.', 'info');
        }
      });
    }

    container.querySelectorAll('[data-hours]').forEach(btn => {
      btn.addEventListener('click', () => {
        const hours = Number(btn.dataset.hours);
        setLeadHours(hours);
        container.querySelectorAll('[data-hours]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showToast(`Reminder lead time: ${btn.textContent.trim()}`, 'success');
      });
    });
  }

  const unsub = store.subscribe(render);
  render();
  return { unmount: unsub };
}
