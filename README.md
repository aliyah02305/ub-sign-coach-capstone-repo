# UB-Sign Coach — Next.js / React

AI-Powered Filipino Sign Language Learning Platform for UB CCELL.

## Project Structure

```
ub-sign-coach/
├── pages/
│   ├── _app.js          # Global fonts & styles import
│   ├── _document.js     # Custom HTML document
│   └── index.js         # Main landing page (assembles all sections)
│
├── components/
│   ├── ModalContext.js   # React Context for modal open/close state
│   ├── Navbar.js         # Sticky navigation bar + mobile hamburger
│   ├── Navbar.module.css
│   ├── Hero.js           # Hero section with live gesture analysis card
│   ├── Hero.module.css
│   ├── About.js          # About / highlights section
│   ├── About.module.css
│   ├── Features.js       # 6 core feature cards
│   ├── Features.module.css
│   ├── Technology.js     # Tech stack grid
│   ├── Technology.module.css
│   ├── Audience.js       # Target audience cards
│   ├── Audience.module.css
│   ├── SDG.js            # SDG alignment section
│   ├── SDG.module.css
│   ├── CTAStrip.js       # Call-to-action banner
│   ├── CTAStrip.module.css
│   ├── Footer.js         # Footer with links
│   ├── Footer.module.css
│   ├── Modals.js         # Login, Register, Contact modals
│   └── Modals.module.css
│
├── styles/
│   └── globals.css       # CSS variables, resets, shared utilities
│
├── next.config.js
└── package.json
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Architecture Decisions

- **CSS Modules** — Each component has its own `.module.css` for scoped styles, avoiding conflicts.
- **ModalContext** — A React Context (`ModalContext.js`) manages which modal is open, shared across `Navbar`, `Hero`, `CTAStrip`, `Footer`, and `Modals` components.
- **Global CSS** — `styles/globals.css` defines CSS custom properties (`:root` variables), resets, and shared utility classes like `.btn-primary`, `.section`, `.section-alt`.
- **Google Fonts** — Loaded via `<link>` in `_app.js` Head (Playfair Display + DM Sans).

## Backend Integration Points

Replace the `alert(...)` placeholders in `components/Modals.js` with your actual API calls:

- `handleLogin()` → POST `/api/auth/login`
- `handleRegister()` → POST `/api/auth/register`
- `handleContact()` → POST `/api/contact`
