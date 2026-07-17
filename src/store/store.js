/**
 * store.js — FlowTask LocalStorage State Management
 * Single source of truth. All mutations go through store.update().
 */

const KEY = 'flowtask_data_v2';

const DEFAULT_PEOPLE = [
  { id: 'self', name: 'Self', color: '#38BDF8' },
  { id: 'kj', name: 'KJ', color: '#ec4899' },
  { id: 'aj', name: 'AJ', color: '#3b82f6' },
  { id: 'plj', name: 'PLJ', color: '#22c55e' },
  { id: 'hj', name: 'HJ', color: '#f97316' },
];

const DEFAULT_STATE = {
  tasks: [],
  logs: [],
  items: [],   // physical item locator
  people: DEFAULT_PEOPLE,
};

let _state = null;
const _listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge default people if new keys were added
      const existingIds = (parsed.people || []).map(p => p.id);
      const missingPeople = DEFAULT_PEOPLE.filter(p => !existingIds.includes(p.id));
      _state = {
        ...DEFAULT_STATE,
        ...parsed,
        people: [...(parsed.people || []), ...missingPeople],
      };
    } else {
      _state = structuredClone(DEFAULT_STATE);
    }
  } catch {
    _state = structuredClone(DEFAULT_STATE);
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(_state));
}

export const store = {
  /** Read-only snapshot of state */
  get state() {
    if (!_state) load();
    return _state;
  },

  /** Subscribe to state changes */
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  /** Mutate state and notify listeners */
  update(mutatorFn) {
    if (!_state) load();
    mutatorFn(_state);
    save();
    _listeners.forEach(fn => fn(_state));
  },

  // ── Task helpers ──
  addTask(task) {
    this.update(s => s.tasks.unshift({
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      subtasks: task.subtasks || []
    }));
  },
  updateTask(id, patch) {
    this.update(s => {
      const idx = s.tasks.findIndex(t => t.id === id);
      if (idx !== -1) s.tasks[idx] = { ...s.tasks[idx], ...patch };
    });
  },
  deleteTask(id) {
    this.update(s => { s.tasks = s.tasks.filter(t => t.id !== id); });
  },
  toggleTask(id) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === id);
      if (!task) return;
      if (task.status === 'done') {
        task.status = 'todo';
        delete task.completedAt;
      } else {
        task.status = 'done';
        task.completedAt = new Date().toISOString();
      }
    });
  },

  // ── Subtask helpers ──
  addSubtask(taskId, subtask) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task) return;
      if (!task.subtasks) task.subtasks = [];
      task.subtasks.push({
        ...subtask,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: subtask.status || 'todo'
      });
    });
  },
  updateSubtask(taskId, subtaskId, patch) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return;
      const sub = task.subtasks.find(sub => sub.id === subtaskId);
      if (sub) Object.assign(sub, patch);
    });
  },
  deleteSubtask(taskId, subtaskId) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return;
      task.subtasks = task.subtasks.filter(sub => sub.id !== subtaskId);
    });
  },
  toggleSubtask(taskId, subtaskId) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return;
      const sub = task.subtasks.find(sub => sub.id === subtaskId);
      if (!sub) return;
      if (sub.status === 'done') {
        sub.status = 'todo';
        delete sub.completedAt;
      } else {
        sub.status = 'done';
        sub.completedAt = new Date().toISOString();
      }
    });
  },

  // ── Log helpers ──
  addLog(log) {
    this.update(s => s.logs.unshift({ ...log, id: crypto.randomUUID(), createdAt: new Date().toISOString() }));
  },
  updateLog(id, patch) {
    this.update(s => {
      const idx = s.logs.findIndex(l => l.id === id);
      if (idx !== -1) s.logs[idx] = { ...s.logs[idx], ...patch };
    });
  },
  deleteLog(id) {
    this.update(s => { s.logs = s.logs.filter(l => l.id !== id); });
  },

  // ── Item helpers ──
  addItem(item) {
    this.update(s => s.items.unshift({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }));
  },
  deleteItem(id) {
    this.update(s => { s.items = s.items.filter(i => i.id !== id); });
  },

  // ── People helpers ──
  addPerson(person) {
    this.update(s => s.people.push({ ...person, id: crypto.randomUUID() }));
  },
  deletePerson(id) {
    this.update(s => { s.people = s.people.filter(p => p.id !== id); });
  },

  // ── Bulk ops ──
  clearCompleted() {
    this.update(s => { s.tasks = s.tasks.filter(t => t.status !== 'done'); });
  },
};
