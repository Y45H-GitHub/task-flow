/**
 * exportUtils.js — CSV export and clipboard copy helpers
 */
import { formatDate, formatDateTime } from './dateUtils.js';

/**
 * Convert tasks array to CSV string
 */
export function tasksToCSV(tasks, people) {
  const headers = [
    'Title', 'Notes', 'Status', 'Priority', 'Effort',
    'Person', 'Category', 'Location Trigger', 'Due Date',
    'Created At', 'Completed At',
  ];

  const personMap = Object.fromEntries(people.map(p => [p.id, p.name]));

  const rows = tasks.map(t => [
    csvEscape(t.title || ''),
    csvEscape(t.notes || ''),
    t.status || 'todo',
    t.priority || 'P4',
    t.effort || '',
    csvEscape(personMap[t.person] || t.person || ''),
    csvEscape(t.category || ''),
    t.locationTrigger || '',
    t.dueDate ? formatDate(t.dueDate) : '',
    t.createdAt ? formatDateTime(t.createdAt) : '',
    t.completedAt ? formatDateTime(t.completedAt) : '',
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

function csvEscape(str) {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Download a string as a file
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export tasks as CSV file
 */
export function exportTasksCSV(tasks, people) {
  const csv = tasksToCSV(tasks, people);
  const date = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `flowtask-tasks-${date}.csv`);
}

/**
 * Generate a plain-text pending task list for WhatsApp paste
 */
export function pendingToText(tasks, people) {
  const personMap = Object.fromEntries(people.map(p => [p.id, p.name]));
  const pending = tasks.filter(t => t.status !== 'done');
  if (!pending.length) return 'No pending tasks 🎉';

  const lines = ['*FlowTask — Pending Tasks*', `_${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}_`, ''];

  // Group by person
  const byPerson = {};
  pending.forEach(t => {
    const name = personMap[t.person] || t.person || 'Self';
    if (!byPerson[name]) byPerson[name] = [];
    byPerson[name].push(t);
  });

  Object.entries(byPerson).forEach(([name, tasks]) => {
    lines.push(`*${name}:*`);
    tasks.forEach(t => {
      const due = t.dueDate ? ` (due ${formatDate(t.dueDate)})` : '';
      const pri = t.priority ? ` [${t.priority}]` : '';
      lines.push(`• ${t.title}${pri}${due}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}
