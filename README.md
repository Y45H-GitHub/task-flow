# FlowTask v2 — Smart Task Manager

> The task app built around what every other app is missing.

[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?logo=vite)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-Ready-5a0fc8)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🚀 Getting Started

```bash
git clone https://github.com/Y45H-GitHub/task-flow.git
cd task-flow
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for production
```bash
npm run build
npm run preview
```

---

## ✨ Features — What's Missing From Every Other App

### 📋 Tasks Tab
| Feature | Description |
|---|---|
| **Created Timestamp** | Every card shows "Added 2h ago · 14 Jul, 10:30 PM" — no more "when did I add this?" |
| **Overdue Badges** | Past-due tasks show ⚠️ in red automatically |
| **Aging Alert** | 🔥 if a task has been pending 7+ days |
| **Notes / Why field** | "Why did I add this?" context for future you |
| **8 Filter Modes** | All · Pending · Today · Overdue · Location · Quick Wins (⚡2min) · Waiting · Done |
| **4 Sort Modes** | By Added / Due Date / Priority / Person |
| **Jump buttons** | Jump to first or last task instantly |

### 👥 People Tab
- All pending tasks grouped by person
- Perfect for meeting prep — open People → see everything for KJ/AJ/PLJ/HJ
- Add custom people with color avatars
- "All clear" section shows people with no pending tasks

### 📍 Places Tab
- Location-tagged tasks grouped by place type (Medical, Print Shop, Bank, Grocery, etc.)
- **📡 Near Me?** button per group — uses browser Geolocation API
- **🗃 Physical Item Locator** — track where you left your passport, HDD, charger

### 📓 Log Tab
- Meeting / Call / WhatsApp / Email / In-person log
- Fields: Who, Type, Date, Summary, Action Items, Tags
- **Full text search** across all logs
- Action items shown as arrow list for clarity

### ⚙️ More Tab
- Stats: Total / Pending / Done / Overdue / Location / Log entries
- **Export CSV** — all tasks as spreadsheet
- **Copy Pending** — WhatsApp-ready text (grouped by person)
- **JSON Backup + Restore** — full data portability
- **Clear Completed** — declutter in one tap

---

## 🎨 Design System
- **Dark mode** — deep navy (`#0B1120`) background
- **Accent** — sky cyan (`#38BDF8`) — single accent, used only on CTAs/highlights/active states
- **Typography** — Space Grotesk (headings) + Inter (body)
- **Glassmorphism** cards with `backdrop-filter: blur`
- **Priority colors** — P1=🔴 P2=🟠 P3=🔵 P4=⚪
- **Micro-animations** — slide-in cards, modal bottom-sheet, tab transitions

---

## 📁 Project Structure

```
task-flow/
├── public/
│   ├── favicon.svg          # App icon
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker (offline)
├── src/
│   ├── main.js              # Entry point
│   ├── app.js               # Root controller (tabs, FAB, toasts)
│   ├── store/
│   │   └── store.js         # LocalStorage state (reactive)
│   ├── components/
│   │   ├── TaskForm.js      # Add/edit task modal
│   │   ├── TaskCard.js      # Task card renderer
│   │   ├── TasksView.js     # Tasks tab
│   │   ├── PeopleView.js    # People tab
│   │   ├── PlacesView.js    # Places + item locator
│   │   ├── LogView.js       # Meeting log tab
│   │   └── MoreView.js      # Settings/export tab
│   ├── utils/
│   │   ├── dateUtils.js     # timeAgo, isOverdue, isAging
│   │   ├── locationUtils.js # Place types, Geolocation
│   │   └── exportUtils.js   # CSV, JSON, clipboard
│   └── styles/
│       ├── index.css        # Design tokens + global
│       ├── tabs.css         # Navigation
│       ├── cards.css        # Task cards
│       ├── modal.css        # Modals
│       └── components.css   # Tab-specific components
├── index.html
├── vite.config.js
├── package.json
└── .agents/AGENTS.md        # AI coding rules
```

---

## 🗂 Data Schemas

```js
// Task
{ id, title, notes, priority, status, effort, person, category,
  locationTrigger, dueDate, createdAt, completedAt }

// Log entry
{ id, with, type, date, summary, actionItems, tags, createdAt }

// Physical item
{ id, name, location, createdAt }

// Person
{ id, name, color }
```

---

## 📡 PWA / Location

- **Installable** — Add to home screen from browser menu
- **Offline** — Service worker caches the app shell
- **Geolocation** — Browser permission required; used only on demand (tap "Check Location")
- Real GPS push notifications require a native app or backend (planned)

---

## 🗺 Roadmap

- [ ] Recurring tasks (daily / weekly / monthly)
- [ ] Google Sheets sync
- [ ] Shared task lists (multi-user)
- [ ] Real GPS push reminders (native app / PWA background sync)
- [ ] Calendar view

---

## 📄 License

MIT — use it however you want.
