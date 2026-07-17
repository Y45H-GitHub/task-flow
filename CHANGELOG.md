# Changelog

All notable changes to FlowTask are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] — 2026-07-14

### Added
- Complete rebuild as Vite + Vanilla JS project
- **Tasks tab**: 8 filter modes, 4 sort modes, jump-to buttons
- **Created timestamp** on every task card (`timeAgo` + full datetime)
- **Aging alert** 🔥 for tasks pending 7+ days
- **Overdue badge** ⚠️ with red highlighting for past-due tasks
- **Notes / Why field** — context field so future-you knows why the task was added
- **Status field** — Todo / In Progress / Waiting / Blocked / Done
- **Effort field** — 2min / 15min / 1hr / half-day / full-day
- **People tab** — all pending tasks grouped by person (KJ, AJ, PLJ, HJ, Self + custom)
- **Places tab** — location-tagged tasks by place type + 📡 Near Me? GPS check
- **Physical item locator** — track where you left physical objects
- **Log tab** — meeting/call/conversation log with action items, tags, full text search
- **More tab** — 6-stat grid, CSV export, WhatsApp copy, JSON backup/restore
- **PWA support** — manifest + service worker (offline + installable)
- **Geolocation API** integration (on-demand, permission-based)
- Default people: Self, KJ, AJ, PLJ, HJ with distinct colors
- All data stored in LocalStorage (no backend required)
- `.agents/AGENTS.md` — project-scoped AI coding rules

### Design
- Dark mode with indigo-violet accent gradient
- Glassmorphism cards with `backdrop-filter: blur`
- Inter font via Google Fonts
- Micro-animations: slide-in cards, bottom-sheet modal, tab fade
- Priority color stripes on task cards
- Full CSS design token system in `src/styles/index.css`

---

## [1.0.0] — (prototype, not committed)

- Initial FlowTask concept with basic task CRUD
- real time updates of taks as per location, as i move i must get a notifcation of the tasks that were in my todos accd to the location . ye saman lene ka tha, lia ki nhi ? 

- possibilty of infinite sub tasks (also the ui) 

- ality to check and uncheck the tasks at once
