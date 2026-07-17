/**
 * notificationUtils.js — Browser Notification API wrapper for due-date reminders.
 * Pure utility — no store side effects.
 */

const NOTIFIED_KEY = 'flowtask_notified_v1';
const LEAD_KEY     = 'flowtask_reminder_lead_hours';
const ENABLED_KEY  = 'flowtask_reminders_enabled';

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function sendNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // eslint-disable-next-line no-new
  new Notification(title, { body, tag, icon: './favicon.svg' });
}

// ── Settings (LocalStorage) ───────────────────────────────────────────────────

export function isRemindersEnabled() {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export function setRemindersEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

/** Default: 24 hours (1 day before) */
export function getLeadHours() {
  const val = localStorage.getItem(LEAD_KEY);
  return val !== null ? Number(val) : 24;
}

export function setLeadHours(hours) {
  localStorage.setItem(LEAD_KEY, String(hours));
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function getNotifiedMap() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveNotifiedMap(map) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
}

export function isAlreadyNotified(taskId, dueDate) {
  return !!getNotifiedMap()[`${taskId}|${dueDate}`];
}

export function markNotified(taskId, dueDate) {
  const map = getNotifiedMap();
  map[`${taskId}|${dueDate}`] = Date.now();
  saveNotifiedMap(map);
}

/**
 * Remove entries for past due dates to prevent localStorage bloat.
 * Call this once per check cycle.
 */
export function clearExpiredNotifications() {
  const today = new Date().toISOString().slice(0, 10);
  const map   = getNotifiedMap();
  const cleaned = {};
  for (const [key, ts] of Object.entries(map)) {
    const [, dueDate] = key.split('|');
    if (dueDate && dueDate >= today) cleaned[key] = ts;
  }
  saveNotifiedMap(cleaned);
}

// ── Core check logic ──────────────────────────────────────────────────────────

/**
 * Returns the subset of tasks that should fire a notification right now.
 *
 * leadHours = 0  → fire any time today (same calendar day as dueDate)
 * leadHours > 0  → fire when dueDate start-of-day is ≤ leadHours away,
 *                  also fires for tasks up to 24 h overdue (so you still get
 *                  notified if the app was closed during the window).
 */
export function checkDueDateReminders(tasks, leadHours) {
  const now      = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  return tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    if (isAlreadyNotified(task.id, task.dueDate)) return false;

    // Parse dueDate as local midnight to avoid UTC-offset issues
    const [y, m, d] = task.dueDate.split('-').map(Number);
    const dueStart     = new Date(y, m - 1, d, 0, 0, 0, 0);
    const hoursUntilDue = (dueStart - now) / (1000 * 60 * 60);

    if (leadHours === 0) {
      return task.dueDate === todayStr;
    }

    // Fire if task falls within [now - 24h, now + leadHours]
    return hoursUntilDue >= -24 && hoursUntilDue <= leadHours;
  });
}
