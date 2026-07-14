# FlowTask — Agent Coding Rules

## Tech Stack
- Vanilla JS (ES Modules), no framework
- Vite for bundling and dev server
- Vanilla CSS only — no Tailwind, no Bootstrap
- LocalStorage for persistence (key: `flowtask_data`)

## Architecture Rules
- All state lives in `src/store/store.js` — never mutate state directly outside the store
- Each tab is a self-contained component in `src/components/`
- Components export a single default function: `mount(container)` and optionally `unmount()`
- Keep utility functions pure — no side effects in `src/utils/`

## Style Rules
- All CSS variables are defined in `src/styles/index.css` under `:root`
- No inline styles in JS — add a class and style it in CSS
- Dark mode is the only mode (no light mode toggle)
- Animations use `transition` or `@keyframes` — never JS-based timers for visual effects
- No emojis for primary UI elements or navigation. Use Unicons (or similar SVG/webfont line icon packs) with clean, consistent vector aesthetics.

## Data Conventions
- Task schema: `{ id, title, notes, createdAt, dueDate, priority, effort, person, status, category, locationTrigger, completedAt }`
- Log schema: `{ id, date, with, type, summary, actionItems, tags, createdAt }`
- Item schema: `{ id, name, location, createdAt }`
- Person schema: `{ id, name, color }`
- All IDs: `crypto.randomUUID()`
- Timestamps: ISO 8601 strings (new Date().toISOString())

## Commit Style
- Use Conventional Commits: `feat:`, `fix:`, `style:`, `docs:`, `chore:`
- Keep commits focused and atomic

## File Naming
- Components: PascalCase (e.g. `TaskCard.js`)
- Utilities: camelCase (e.g. `dateUtils.js`)
- CSS files: camelCase (e.g. `cards.css`)
