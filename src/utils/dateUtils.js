/**
 * dateUtils.js — Pure date/time formatting helpers
 */

/**
 * "2h ago", "3d ago", "just now"
 */
export function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days === 1)  return 'yesterday';
  if (days < 7)    return `${days}d ago`;
  if (days < 30)   return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * "14 Jul, 10:30 PM"
 */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * "14 Jul 2026"
 */
export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "14 Jul"
 */
export function formatDateShort(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Returns true if dueDate is in the past (and task is not done)
 */
export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate) < new Date(today());
}

/**
 * Returns true if task was created 7+ days ago and is not done
 */
export function isAging(createdAt, status) {
  if (!createdAt || status === 'done') return false;
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  return days >= 7;
}

/**
 * Today's date as YYYY-MM-DD
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Is date today (YYYY-MM-DD string)
 */
export function isToday(dateStr) {
  return dateStr === today();
}

/**
 * Days pending since creation
 */
export function daysPending(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}
