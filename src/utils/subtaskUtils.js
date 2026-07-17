/**
 * subtaskUtils.js — Pure recursive helpers for infinite subtask trees.
 * No side effects. All functions take plain data and return plain data.
 */

/**
 * Walk a subtask tree by an array of IDs.
 * path[0] is an ID inside task.subtasks, path[1] inside that node's subtasks, etc.
 * Returns the node or null if not found.
 * @param {object} taskOrNode  — any node with a `subtasks` array
 * @param {string[]} path      — array of IDs to traverse
 * @returns {object|null}
 */
export function getNodeByPath(taskOrNode, path) {
  if (!path || path.length === 0) return taskOrNode;
  const [head, ...rest] = path;
  const child = (taskOrNode.subtasks || []).find(s => s.id === head);
  if (!child) return null;
  return getNodeByPath(child, rest);
}

/**
 * Build a breadcrumb trail for a given subtask path inside a root task.
 * @param {object}   task      — root task object
 * @param {string[]} path      — IDs path into subtask tree (not including task itself)
 * @returns {{ label: string, path: string[] }[]}  — array from root → current node
 */
export function buildBreadcrumb(task, path) {
  const crumbs = [{ label: task.title, path: [] }];
  let node = task;
  const traversed = [];
  for (const id of path) {
    const child = (node.subtasks || []).find(s => s.id === id);
    if (!child) break;
    traversed.push(id);
    crumbs.push({ label: child.title, path: [...traversed] });
    node = child;
  }
  return crumbs;
}

/**
 * Count all descendants recursively (not including the node itself).
 * @param {object} node
 * @returns {number}
 */
export function countDescendants(node) {
  if (!node.subtasks || node.subtasks.length === 0) return 0;
  return node.subtasks.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

/**
 * Count only DIRECT children of a node.
 * @param {object} node
 * @returns {number}
 */
export function countDirectChildren(node) {
  return (node.subtasks || []).length;
}

/**
 * Count done DIRECT children.
 * @param {object} node
 * @returns {number}
 */
export function countDoneDirectChildren(node) {
  return (node.subtasks || []).filter(s => s.status === 'done').length;
}

/**
 * Return true if every descendant (at all depths) is marked done.
 * @param {object} node
 * @returns {boolean}
 */
export function allDescendantsDone(node) {
  if (!node.subtasks || node.subtasks.length === 0) return true;
  return node.subtasks.every(s => s.status === 'done' && allDescendantsDone(s));
}

/**
 * Recursively set all descendants to a given status.
 * Returns a NEW subtasks array (immutable-safe).
 * @param {object[]} subtasks
 * @param {string}   status
 * @returns {object[]}
 */
export function setAllDescendantsStatus(subtasks, status) {
  if (!subtasks) return [];
  return subtasks.map(s => ({
    ...s,
    status,
    completedAt: status === 'done' ? new Date().toISOString() : undefined,
    subtasks: setAllDescendantsStatus(s.subtasks, status),
  }));
}

/**
 * Immutably insert a new subtask at the given path inside a root task's subtask tree.
 * Returns a new root subtasks array.
 * @param {object[]} subtasks  — root task's subtasks array
 * @param {string[]} path      — path of IDs to the PARENT node (empty = add to root)
 * @param {object}   newNode   — the new subtask object to insert
 * @returns {object[]}
 */
export function insertAtPath(subtasks, path, newNode) {
  if (path.length === 0) {
    return [...(subtasks || []), newNode];
  }
  const [head, ...rest] = path;
  return (subtasks || []).map(s => {
    if (s.id !== head) return s;
    return { ...s, subtasks: insertAtPath(s.subtasks, rest, newNode) };
  });
}

/**
 * Immutably update a node at the given path.
 * `patchOrFn` can be a plain patch object OR a function (node) => newNode.
 * @param {object[]} subtasks
 * @param {string[]} path      — path of IDs to the target node
 * @param {object|function} patchOrFn
 * @returns {object[]}
 */
export function updateAtPath(subtasks, path, patchOrFn) {
  if (path.length === 0) return subtasks;
  const [head, ...rest] = path;
  return (subtasks || []).map(s => {
    if (s.id !== head) return s;
    if (rest.length === 0) {
      return typeof patchOrFn === 'function' ? patchOrFn(s) : { ...s, ...patchOrFn };
    }
    return { ...s, subtasks: updateAtPath(s.subtasks, rest, patchOrFn) };
  });
}

/**
 * Immutably delete a node at the given path.
 * @param {object[]} subtasks
 * @param {string[]} path      — path of IDs to the target node
 * @returns {object[]}
 */
export function deleteAtPath(subtasks, path) {
  if (path.length === 0) return subtasks;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return (subtasks || []).filter(s => s.id !== head);
  }
  return (subtasks || []).map(s => {
    if (s.id !== head) return s;
    return { ...s, subtasks: deleteAtPath(s.subtasks, rest) };
  });
}
