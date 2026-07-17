# FlowTask Tech Stack & Dependencies

FlowTask is engineered as an ultra-lightweight, high-performance web application. It features zero heavy frontend libraries or frameworks, which yields instant loading times and negligible compilation costs.

---

## 🛠️ Core Technologies

### 1. Frontend Languages
- **HTML5**: Leverages semantic layout elements (`<header>`, `<aside>`, `<main>`, `<nav>`, `<section>`, `<button>`) to construct an accessible document structure (compliant with screen readers).
- **ES Modules (JavaScript)**: Developed entirely with modern ECMAScript standards. Imports and exports are resolved natively in the browser via Vite's bundling engine.
- **CSS3 (Vanilla)**: Features a robust custom style system. There are **no CSS frameworks** (like TailwindCSS or Bootstrap) and **no preprocessors** (like Sass or Less). All styling is written as pure, modular CSS.

### 2. Build Tooling
- **Vite 6.x**: Used as the dev server and build compiler. Configured via [vite.config.js](file:///d:/task-flow/vite.config.js) with a relative base directory structure (`base: './'`) to allow build directories (`dist/`) to run from file protocols if necessary.

---

## 🎨 Design Tokens & UI Assets

### 1. Fonts (Google Fonts CDN)
- **Inter**: Loaded via Google Fonts inside [index.css](file:///d:/task-flow/src/styles/index.css) as the body font:
  `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap`
- **Space Grotesk**: Loaded via Google Fonts as the headings and display font:
  `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap`

### 2. Iconography (Unicons CDN)
- **Unicons Line Icons**: Loaded via CDN inside [index.html](file:///d:/task-flow/index.html):
  `https://unicons.iconscout.com/release/v4.0.8/css/line.css`
  - Instantiated dynamically using markup classes: `<i class="uil uil-clipboard-notes"></i>`.
  - Used strictly in place of emojis for primary actions, navigation, and badges to ensure a professional look.

---

## 🔌 Core Browser & External Web APIs

| API | Target / Endpoint | Description / Purpose |
|---|---|---|
| **Geolocation API** | `navigator.geolocation` | Retrieves latitude and longitude coordinates on user demand. |
| **Overpass OSM API** | `https://overpass-api.de/api/interpreter` | Executes Overpass queries to scan physical surroundings (shops, ATMs) within 500m. |
| **Clipboard API** | `navigator.clipboard` | Used by the WhatsApp pending-task export utility. Includes a fallback method via dynamic textarea selection. |
| **Service Worker** | `public/sw.js` | Intercepts HTTP requests to serve cached assets, enabling offline performance. |
| **Web App Manifest** | `public/manifest.json` | Configures PWA properties (App name, theme colors, icons) for installation on iOS/Android home screens. |

---

## 💾 Persistence Layer
- **Client-Side Storage**: Leverages browser `LocalStorage`.
- **Namespace Key**: `flowtask_data_v2`
- **Data Serialization**: Raw state is parsed to and from JSON string structures during boot and store update hooks.

---

## 📦 Package Dependencies

### Production Dependencies
FlowTask does not have any production runtime dependencies (`dependencies: {}` is empty in `package.json`). This protects the app against node package security concerns and keeps page load sizes under 150KB (including font loading).

### Development Dependencies
- **vite (`^6.3.5`)**: Compiles and serves the package.
