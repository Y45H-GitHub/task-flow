# FlowTask Current Progress & Roadmap

FlowTask v2.0.0 is a stable, fully functional release. Below is an overview of what is currently built, what is actively running, and the future development backlog.

---

## ✅ Completed & Shipped (v2.0.0)

### 📋 1. Core Tasks View
- **8 Filter States**: All, Pending, Today, Overdue, Location, Quick Wins (<= 2min effort), Waiting, and Done.
- **4 Sorting States**: Added Date (default), Due Date, Priority, and Person.
- **Layout Toggles**: Seamless transition between traditional List view and a 5-column Kanban Board (`To Do`, `In Progress`, `Waiting`, `Blocked`, `Done`).
- **Context Indicators**: Created timestamp (e.g. `Added 2d ago`) + 7-day Aging Fire alert (🔥) + Overdue alert indicator (⚠️).
- **Subtasks System**: In-context checklists with completion progress bars and inline step addition.
- **Cross-Assignee Linking**: Automatic keyword analysis linking related tasks across different people.
- **Jump Anchors**: Top and bottom quick scroll buttons for ease of navigation.

### 👥 2. People Tab (Meeting Prep)
- **Assignee Groupings**: Tasks are organized under assignees (e.g., self, KJ, AJ) to prepare for meetings.
- **Quick-Add Contact**: Form to append new people with unique hex color swatches.
- **"All Clear" List**: Horizontal array highlighting people with zero pending items.

### 📍 3. Places & Geolocation
- **Business Groupings**: Tasks are grouped under location categories (Grocery, Medical, Bank, Print, Tailor, Electronics, Courier, Hardware, Restaurant, Other).
- **📡 Near Me? Geolocation**: Integrates with the browser Location API and OpenStreetMap (Overpass API) to locate shops matching these business categories within a 500m radius of the user.
- **Background Sync**: Option to check coordinates in the background (every 60s) and show matching tasks.
- **🗃 Physical Item Locator**: Registry to log exactly where physical assets (e.g., Passport, HDD keys) are stored.

### 📓 4. Conversation & Sync Log
- **Journal Entries**: Log meetings, calls, emails, WhatsApp messages, or in-person interactions.
- **Searchable Database**: Real-time full-text search across who, summary notes, action items, and tags.
- **Action Lists**: Renders comma-separated action items as distinct lists.

### ⚙️ 5. More / Settings Hub
- **Metric Analytics**: A 6-block dashboard displaying real-time task counts.
- **CSV Data Exporter**: Compiles and downloads task history in spreadsheet-ready formats.
- **WhatsApp pending-task formatter**: Groups pending items by person and copies a markdown list to the clipboard for pasting.
- **Backup & Restore**: Import and export the entire state as a single JSON file.

---

## ⚡ Current System State

As of the handoff, the development environment is live:
- **Dev Command**: `npm run dev` is active.
- **Development Server Port**: Running on [http://localhost:5173](http://localhost:5173).
- **State Store Namespace**: Active storage key in browser is `flowtask_data_v2`.

---

## 🗺️ Roadmap & Future Backlog

These features are planned for future releases. The codebase is architected to allow these additions without major structural changes:

### 1. Recurring Tasks
- **Objective**: Allow tasks to recur daily, weekly, monthly, or on custom schedules.
- **Suggested Strategy**: Add `recurrence` metadata (e.g., `daily`, `weekly`) to the task schema in [store.js](file:///d:/task-flow/src/store/store.js). When a recurring task is toggled to `done`, the store should automatically generate the next occurrence with a calculated `dueDate` and archive the current one.

### 2. Google Sheets Sync
- **Objective**: Real-time backup or two-way sync with a Google Sheet.
- **Suggested Strategy**: Create an export script mapping sheets coordinates, using a lightweight Google Apps Script endpoint or direct Google Sheets API integration inside [exportUtils.js](file:///d:/task-flow/src/utils/exportUtils.js).

### 3. Shared Collaborative Task Lists
- **Objective**: Let multiple users collaborate on shared task lists.
- **Suggested Strategy**: Introduce a WebRTC coordination system or a simple serverless database (e.g., Supabase or Firebase) to sync state. The store subscription model in [store.js](file:///d:/task-flow/src/store/store.js) is already built to handle remote updates seamlessly.

### 4. Background GPS Notifications (Native PWA Sync)
- **Objective**: Fire background location notifications even when the browser is closed.
- **Suggested Strategy**: Upgrade the service worker ([sw.js](file:///d:/task-flow/public/sw.js)) to support Background Sync APIs or integrate Geofencing APIs (where browser engines permit).

### 5. Calendar View
- **Objective**: Display tasks on a calendar grid.
- **Suggested Strategy**: Create a calendar component mapping task `dueDate` properties to a monthly/weekly grid layout.
