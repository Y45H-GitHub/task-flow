# FlowTask Folder Structure

FlowTask uses a highly structured, modular directory layout. Below is a directory tree of the workspace, followed by descriptions of each file's role in the system.

---

## 📁 Directory Tree

```
task-flow/
├── public/                 # Static assets and PWA assets
│   ├── favicon.svg         # Application vector icon
│   ├── manifest.json       # PWA installer specifications
│   └── sw.js               # Offline caching service worker
├── src/                    # Main JavaScript source directory
│   ├── main.js             # Global style bootstrap & application bootstrapper
│   ├── app.js              # Bento Shell controller, navigation manager, and toast system
│   ├── store/
│   │   └── store.js        # Reactive State Management store
│   ├── components/         # Tab views & dynamic modal layout components
│   │   ├── LogView.js      # Tab 4 — Meeting log and full-text search
│   │   ├── MoreView.js     # Tab 5 — Statistics, exports, and JSON backups
│   │   ├── PeopleView.js   # Tab 2 — Contact task grouping & meeting helper
│   │   ├── PlacesView.js   # Tab 3 — Geographic filters & physical item locator
│   │   ├── TaskCard.js     # Task DOM card generator (subtasks, keywords matcher)
│   │   ├── TaskForm.js     # Shared modal bottom-sheet for task CRUD operations
│   │   └── TasksView.js    # Tab 1 — List/Kanban board, search filters, and sorting
│   ├── utils/              # Pure utility functions (no store side effects)
│   │   ├── dateUtils.js    # Relative dates, aging status, and overdue flags
│   │   ├── exportUtils.js  # CSV converters, plain-text generators, and clipboards
│   │   └── locationUtils.js# GPS retrievers and OpenStreetMap query parameters
│   └── styles/             # Modular Vanilla CSS stylesheets
│       ├── cards.css       # Task cards, subtasks, and related badges
│       ├── components.css  # View panels, forms, log grids, and statistics blocks
│       ├── index.css       # CSS design tokens, reset parameters, and layout shell
│       ├── modal.css       # Backdrop filters and modal bottom sheets
│       └── tabs.css        # Desktop sidebars and mobile bottom navigation bars
├── index.html              # HTML entry point (Unicons line icon loader)
├── package.json            # Node project configuration
├── vite.config.js          # Vite configurations
└── .agents/
    └── AGENTS.md           # Project-level developer agent rules
```

---

## 📄 File Profiles & Roles

### Public Folder (`/public`)
- **[favicon.svg](file:///d:/task-flow/public/favicon.svg)**: The application logo, loaded as raw SVG.
- **[manifest.json](file:///d:/task-flow/public/manifest.json)**: The standard W3C manifest that registers the application as installable (Progressive Web App) for mobile platforms.
- **[sw.js](file:///d:/task-flow/public/sw.js)**: Basic Service Worker script. Caches essential structural assets (`index.html`, root page) to enable offline capabilities.

### Application Initialization (`/src`)
- **[main.js](file:///d:/task-flow/src/main.js)**: Imports all modular CSS files and coordinates page loading. Mounts the initial UI layer when DOM nodes are parsed.
- **[app.js](file:///d:/task-flow/src/app.js)**: The core controller. Manages tab switching via CSS classes, runs the toast notification engine, manages background geolocation check intervals, and handles the global FAB action listener.

### Components (`/src/components`)
- **[TasksView.js](file:///d:/task-flow/src/components/TasksView.js)**: Orchestrates the main Tasks tab. Manages search fields, filter-selection buttons (8 states), sorting indicators (4 sorting mechanisms), list-to-board layout toggling, and keyboard shortcut jump mechanisms.
- **[TaskCard.js](file:///d:/task-flow/src/components/TaskCard.js)**: Constructs individual task cards. Features inline checklists (subtask actions), and processes cross-assignee tags by comparing text tokens to suggest linked items.
- **[TaskForm.js](file:///d:/task-flow/src/components/TaskForm.js)**: Renders the modal dialog used to input/edit tasks. Allows configuring attributes (e.g., effort estimators, due dates, assignees, location triggers).
- **[PeopleView.js](file:///d:/task-flow/src/components/PeopleView.js)**: Generates the People tab. Collects active tasks, groups them per individual, provides quick actions to add new contacts, and features an "All Clear ✓" list for contacts with zero tasks.
- **[PlacesView.js](file:///d:/task-flow/src/components/PlacesView.js)**: Renders the Places view. Houses background GPS toggle options, lists tasks by business location categories, and supports tracking physical item locations.
- **[LogView.js](file:///d:/task-flow/src/components/LogView.js)**: Houses conversation logs. Handles journal uploads, type configurations (e.g., Call, WhatsApp, Email), search filters, and action item formatting.
- **[MoreView.js](file:///d:/task-flow/src/components/MoreView.js)**: Contains configuration tools. Calculates statistics, compiles CSV exports, copies plain-text summaries to the clipboard, and coordinates backup JSON transactions.

### Utilities (`/src/utils`)
- **[dateUtils.js](file:///d:/task-flow/src/utils/dateUtils.js)**: Pure time formatting library. Features logic to convert ISO dates into human-readable strings (e.g., `5m ago`), flags items older than 7 days, and checks for overdue tasks.
- **[exportUtils.js](file:///d:/task-flow/src/utils/exportUtils.js)**: Handles exporting/copying tasks. Compiles CSV rows, formats plain text for pasting, and implements a fallback clipboard writer.
- **[locationUtils.js](file:///d:/task-flow/src/utils/locationUtils.js)**: Manages geolocation. Configures search terms for OSM queries, executes location requests, and intersects returned arrays with defined categories.

### CSS Styling System (`/src/styles`)
- **[index.css](file:///d:/task-flow/src/styles/index.css)**: Declares custom properties (design tokens), standard font imports, CSS resets, and desktop layouts.
- **[tabs.css](file:///d:/task-flow/src/styles/tabs.css)**: Styles navigation bars for desktop sidebars and mobile bottom navigation.
- **[cards.css](file:///d:/task-flow/src/styles/cards.css)**: Configures layouts for task cards, inline checklists, search highlights, and collapsible item references.
- **[modal.css](file:///d:/task-flow/src/styles/modal.css)**: Handles overlay filters and bottom-sheet transition sliding effects.
- **[components.css](file:///d:/task-flow/src/styles/components.css)**: Styles specific view controls, dashboard grids, place categories, and physical locator items.
