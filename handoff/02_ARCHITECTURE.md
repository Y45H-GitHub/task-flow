# FlowTask System Architecture

FlowTask is designed as a single-page application (SPA) built using pure ES Modules and Vanilla JavaScript. It has zero runtime dependencies and relies on a clean, reactive state container.

---

## 🏛️ Overall Component & System Flow

```mermaid
graph TD
    index.html[index.html] --> main_js[src/main.js]
    main_js --> app_js[src/app.js]
    app_js --> store_js[src/store/store.js]
    
    subgraph Layout Shell
        app_js --> Header[Header Stats]
        app_js --> Sidebar[Desktop Sidebar]
        app_js --> MainPane[Main Pane Container]
        app_js --> FAB[Floating Action Button]
        app_js --> BottomNav[Mobile Bottom Nav]
    end

    subgraph Component Views (Lazy Loaded)
        MainPane --> TasksView[src/components/TasksView.js]
        MainPane --> PeopleView[src/components/PeopleView.js]
        MainPane --> PlacesView[src/components/PlacesView.js]
        MainPane --> LogView[src/components/LogView.js]
        MainPane --> MoreView[src/components/MoreView.js]
    end

    TasksView --> TaskCard[src/components/TaskCard.js]
    TasksView --> TaskForm[src/components/TaskForm.js]
    
    store_js --> LocalStorage[(LocalStorage)]
```

---

## ⚡ Application Boot & Lifecycle

1. **DOM Load**: [index.html](file:///d:/task-flow/index.html) initializes and includes `<script type="module" src="/src/main.js"></script>`.
2. **Setup Styles & Boot**: [main.js](file:///d:/task-flow/src/main.js) imports all necessary stylesheets (`index.css`, `tabs.css`, `cards.css`, `modal.css`, `components.css`) and calls `initApp()` passing the `#app` root container.
3. **Shell Construction**: [app.js](file:///d:/task-flow/src/app.js) draws the application structure (Sidebar navigation, top header containing real-time statistics, tab panes, global FAB, bottom navigation, and a container for toast notifications).
4. **Initial Mount**: The default tab (`tasks`) is mounted.
5. **PWA Registration**: The service worker (`sw.js`) is registered asynchronously.

---

## 🔄 Reactive State Management

FlowTask utilizes a centralized, single source of truth store modeled in [store.js](file:///d:/task-flow/src/store/store.js).

### State Schema
```javascript
const DEFAULT_STATE = {
  tasks: [],  // Array of Tasks
  logs: [],   // Array of Conversation Logs
  items: [],  // Array of Tracked Physical Items
  people: [], // Array of People metadata
};
```

### Store Implementation Patterns
- **Read-only State**: The state is exposed via a getter. Direct modifications are discouraged.
- **Subscriptions**: Views subscribe to store updates. `store.subscribe(listener)` returns an unsubscribe function.
- **Mutations**: All updates occur inside `store.update(mutatorFn)`.
  ```javascript
  update(mutatorFn) {
    if (!_state) load();
    mutatorFn(_state);
    save(); // Writes to LocalStorage
    _listeners.forEach(fn => fn(_state)); // Notifies all UI components
  }
  ```

### Data Synchronization Flow
Whenever a state mutation function is completed:
1. State changes are serialized into a JSON string.
2. Saved synchronously to `LocalStorage` under the namespace key `flowtask_data_v2`.
3. All registered listeners (such as active views and header statistics indicators) are triggered.

---

## 🧩 Component Lifecycle (Mount / Unmount)

Each view (tab component) implements a strict mount/unmount pattern to prevent memory leaks and handle tab switches cleanly:
1. **Lazy Loading**: Tabs are not mounted until they are selected by the user.
2. **Mounting**: The tab-switch trigger invokes the view's default mount function:
   ```javascript
   export function mountTasksView(container) {
     container.innerHTML = `...`; // Inject HTML shell
     // Bind local DOM listeners
     
     function render() {
       // Pull state and update DOM
     }
     
     const unsub = store.subscribe(() => render());
     render();
     
     return { unmount: unsub, refresh: render };
   }
   ```
3. **Caching**: The resulting helper object is stored inside the `_mounted` cache in [app.js](file:///d:/task-flow/src/app.js).
4. **State Tracking**: When the tab is switched, the store listener remains active, but subsequent renders are highly optimized. When the page is unloaded, the component can clean up listeners via the returned `unmount` hooks.

---

## 🔗 Related Tasks linking Engine

To establish connectivity across different task assignees, a text search linking engine is integrated directly inside the card rendering script [TaskCard.js](file:///d:/task-flow/src/components/TaskCard.js).

### Keyword Extraction Logic
When rendering a task card, it tokenizes the title:
1. Title is converted to lowercase.
2. String is split by whitespace.
3. Non-alphanumeric characters are stripped.
4. Tokens shorter than 4 characters (e.g., "the", "and", "for") are discarded.
   ```javascript
   function getKeywords(title) {
     if (!title) return [];
     return title.toLowerCase()
       .split(/\s+/)
       .map(w => w.replace(/[^a-z0-9]/g, ''))
       .filter(w => w.length > 3);
   }
   ```

### Matching Algorithm
A task $T_b$ is deemed related to task $T_a$ if:
- $T_b$ is not completed (`status !== 'done'`).
- The assignee is different ($T_b.person \neq T_a.person$).
- EITHER: They share the exact same category ($T_b.category == T_a.category$).
- OR: There is an intersection of at least one keyword between their titles.

If matches exist, a collapsible "Related Tasks (N)" block is rendered inside the card, allowing users to coordinate cross-person tasks.

---

## 📡 Geolocation & Overpass API Engine

FlowTask features a location check module located in [locationUtils.js](file:///d:/task-flow/src/utils/locationUtils.js).

### Place Definition Adapter
`PLACE_TYPES` map location triggers (e.g., `medical`, `print`, `bank`) to:
- A descriptive label
- A Unicons class (e.g., `uil-print`)
- Search keywords passed to query engines (e.g., `['print', 'xerox', 'copy', 'stationery']`)

### Geolocation Fetch Lifecycle
1. **Device Query**: Queries browser Location API via a Promise:
   `navigator.geolocation.getCurrentPosition(...)`
2. **Overpass Query**: Builds a location-search Overpass query (Radius: 500m) for node tags:
   `[shop]`, `[amenity=pharmacy]`, `[amenity=bank]`, `[amenity=atm]`, `[amenity=restaurant]`, `[amenity=cafe]`.
3. **Keyword Intersection**: Iterates over elements returned from `https://overpass-api.de/api/interpreter`. If a tag's shop or amenity attribute matches keyword definitions, the corresponding `PLACE_TYPE` id is collected.
4. **Trigger Surface**: Matches tasks requiring those location IDs. Surface match results in real time or fires background toast indicators.
5. **Background Sync Loop**: When "Always-on background alerts" is enabled, [app.js](file:///d:/task-flow/src/app.js) executes `runLocationCheck` on a `setInterval` of 60 seconds. A local deduplication `Set` (`_alertedTaskIds`) prevents repeating alerts for the same task.
