/**
 * store.js — FlowTask LocalStorage State Management
 * Single source of truth. All mutations go through store.update().
 */
import {
  insertAtPath,
  updateAtPath,
  deleteAtPath,
  setAllDescendantsStatus,
} from '../utils/subtaskUtils.js';

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

  // ── Nested Subtask helpers (infinite depth via path arrays) ──
  // path: array of subtask IDs from root task's subtasks down to the parent.
  // e.g. [] means add/modify a direct child of the root task;
  //      ['sub1']  means add/modify a child of subtask sub1;
  //      ['sub1', 'sub2'] means child of sub1 > sub2, etc.

  /**
   * Add a subtask at `path` inside task `taskId`.
   * path = [] → direct child of root task.
   */
  addNestedSubtask(taskId, path, subtask) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task) return;
      const newNode = {
        ...subtask,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: subtask.status || 'todo',
        subtasks: [],
      };
      task.subtasks = insertAtPath(task.subtasks || [], path, newNode);
    });
  },

  /**
   * Update (patch) a subtask located at `path` inside task `taskId`.
   * path must point to the node itself (the last ID in path is the node's ID).
   */
  updateNestedSubtask(taskId, path, patch) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task) return;
      task.subtasks = updateAtPath(task.subtasks || [], path, patch);
    });
  },

  /**
   * Delete the subtask at `path` (and all its descendants).
   */
  deleteNestedSubtask(taskId, path) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task) return;
      task.subtasks = deleteAtPath(task.subtasks || [], path);
    });
  },

  /**
   * Toggle done/todo for the subtask at `path`.
   * If markChildren is true, also recursively mark all descendants done.
   */
  toggleNestedSubtask(taskId, path, markChildren = false) {
    this.update(s => {
      const task = s.tasks.find(t => t.id === taskId);
      if (!task) return;
      task.subtasks = updateAtPath(task.subtasks || [], path, (node) => {
        const nowDone = node.status !== 'done';
        const updated = {
          ...node,
          status: nowDone ? 'done' : 'todo',
          completedAt: nowDone ? new Date().toISOString() : undefined,
        };
        if (nowDone && markChildren) {
          updated.subtasks = setAllDescendantsStatus(node.subtasks, 'done');
        }
        return updated;
      });
    });
  },

  // ── Legacy shim — keep addSubtask / toggleSubtask signatures working ──
  // (existing inline adder on TaskCard still calls these at path=[])
  addSubtask(taskId, subtask) {
    this.addNestedSubtask(taskId, [], subtask);
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
