# Developer AI Handover Notes

Hello! If you are reading this, you are the next AI agent or software engineer taking over the FlowTask project. This document outlines the technical constraints, coding rules, and conventions that you **must follow without exception** to maintain codebase integrity.

---

## ⚠️ Non-Negotiable Coding Rules

These rules are extracted from the user's global constraints and the project-level [.agents/AGENTS.md](file:///d:/task-flow/.agents/AGENTS.md). **Read them carefully before writing any code.**

### 1. Technology Constraints
- **No Frameworks**: Do not introduce React, Vue, Angular, Svelte, or any other library. The application must remain pure Vanilla JS (ES Modules).
- **No Tailwind / Bootstrap**: Do not install CSS frameworks. All styles must be written in Vanilla CSS using CSS custom properties.
- **Dark Mode Only**: The interface is dark mode by default. Do not implement a light mode toggle.

### 2. Styling Conventions
- **Global Variables**: All design tokens (colors, spacing, border radii, transitions) must be defined under `:root` in [index.css](file:///d:/task-flow/src/styles/index.css).
- **No Inline Styles in JS**: Do not add styles inline within JavaScript. Instead, declare a class in a CSS file and assign it to the DOM node.
- **Line Icons Only**: Do not use emojis in primary navigation, headers, or actions. Use Unicons vector icon classes (`uil uil-*`) from the CDN stylesheet loaded in `index.html`. Emojis are permitted only for status flags (like 🔥 for aging or ⚠️ for overdue) or within user-generated notes.
- **CSS Animations**: All visual effects must use CSS `transition` or `@keyframes`. **Never** use JavaScript `setInterval` or `requestAnimationFrame` for rendering animations.

### 3. File Naming Rules
- **Component Files**: PascalCase (e.g., [TasksView.js](file:///d:/task-flow/src/components/TasksView.js)).
- **Utility Files**: camelCase (e.g., [dateUtils.js](file:///d:/task-flow/src/utils/dateUtils.js)).
- **CSS Files**: camelCase (e.g., [cards.css](file:///d:/task-flow/src/styles/cards.css)).

### 4. Data & State Management Rules
- **Centralized State**: All application state resides in [store.js](file:///d:/task-flow/src/store/store.js).
- **No Direct Mutation**: Never mutate the store state directly from outside the store (e.g., do not write `store.state.tasks.push(task)`). You must use the provided helper methods (e.g., `store.addTask()`) or execute mutations inside `store.update(state => { ... })`.
- **Unique IDs**: Generate all entity IDs using the native browser API: `crypto.randomUUID()`. **Never** use `Math.random()`.
- **Timestamps**: All timestamps must be formatted as ISO 8601 strings: `new Date().toISOString()`.
- **Persistence Namespace**: The LocalStorage key must remain `flowtask_data_v2`.

---

## 🏛️ Architectural Guardrails

### Component Mount / Unmount Pattern
When creating new views or tabs, export a single default mount function:
```javascript
export function mountMyNewView(container) {
  container.innerHTML = `...`; // Inject HTML
  
  // Set up DOM event listeners...

  function render() {
    // Read state and update elements
  }
  
  // Subscribe to the store
  const unsub = store.subscribe(render);
  render();
  
  // Always return the unmount hook to clear subscriptions when switching tabs
  return {
    unmount: () => {
      unsub();
      // clean up other listeners if necessary
    },
    refresh: render // Optional: for manual triggers
  };
}
```

---

## 💡 Technical Gotchas & Implementation Tips

### 1. Geolocation Permissions & Protocol
- The Geolocation API (`navigator.geolocation`) requires a **secure context (HTTPS)** in production.
- For local development, the browser permits geolocation on `localhost`.
- If the browser blocks GPS access, the Overpass API search fails. Always handle this case gracefully by displaying a helpful error message instead of crashing.

### 2. Overpass API Rate Limits
- The Overpass API (`https://overpass-api.de/api/interpreter`) is a public service. If queried too frequently, it will return HTTP `429 Too Many Requests`.
- The background location-check loop uses a 60-second interval. **Do not** reduce this duration to avoid rate-limiting issues.
- If you extend location alerts, implement request caching or deduplication to minimize network overhead.

### 3. CSV & File Downloading Fallbacks
- The CSV exporter in [exportUtils.js](file:///d:/task-flow/src/utils/exportUtils.js) uses dynamic anchor element insertion (`a.click()`).
- In certain strict sandboxed environments or legacy mobile webviews, dynamic clicking might be blocked. Ensure file download helpers are well-wrapped and capture click issues cleanly.
