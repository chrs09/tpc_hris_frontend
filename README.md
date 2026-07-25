# TYTAN HRIS — Frontend

A Vite + React Single Page Application (SPA) for the TYTAN HRIS system. Provides authentication, attendance (including selfie kiosk), onboarding/application forms, trip management (maps), payroll utilities, and admin dashboards.

## Tech stack
- React 19 + Vite
- Tailwind CSS, MUI (@mui/material), shadcn/ui + Radix primitives
- Axios for HTTP, ag-grid for tables
- Leaflet / react-leaflet for maps
- react-webcam for selfie attendance
- react-router-dom for routing, react-hot-toast for notifications

## Quick start

Prerequisites:
- Node.js (18+) and npm/yarn

1. Install dependencies

```bash
npm install
# or
yarn
```

2. Provide environment variables

Create a `.env` or `.env.local` file in the project root with the API base URL. Example:

```
VITE_API_URL=https://api.example.com
```

The frontend composes the API base as `${VITE_API_URL}/api` (see [src/api/config.js](src/api/config.js)).

3. Run in development

```bash
npm run dev
```

4. Build for production

```bash
npm run build
npm run preview   # preview the production build
```

5. Linting

```bash
npm run lint
```

## Project layout (high level)
- `src/main.jsx` — app bootstrap and router provider
- `src/App.jsx` — top-level routes (public and protected)
- `src/pages/` — page views grouped by domain (Dashboard, Payroll, Attendance, Finance, Driver, Public forms, Admin)
- `src/components/` — shared components and domain UI
- `src/api/` — axios instance, per-domain API wrappers (login, payroll, trips, etc.)
- `src/hooks/`, `src/utils/`, `src/constants/` — helpers and utilities

## Auth & routing
- Access token is stored in `localStorage` under `access_token`.
- Protected routes mounted under `/dashboard/*` and guarded by token presence and `must_change_password` logic (see [src/App.jsx](src/App.jsx)).
- Public endpoints include `/login`, application and onboarding forms, and `/attendance-kiosk`.

## PWA & service worker
- `public/manifest.json` is included for PWA configuration. Service worker registration is present but commented out in `src/main.jsx`; enable registration if you want offline caching.

## Deployment notes
- SPA rewrite is configured for Vercel and Azure Static Web Apps via `vercel.json` and `staticwebapp.config.json`.
- Ensure `VITE_API_URL` is set in the environment for the deployed site.

## Useful files
- [package.json](package.json) — scripts and dependencies
- [vite.config.js](vite.config.js) — Vite config and aliases

## Next steps / suggestions
- Enable the service worker if you need PWA offline support.
- Add a `.env.example` with required env vars for contributors.
- Optionally add a simple health-check route or an API mock for local development.

---
If you want, I can also generate a detailed route/component inventory or add a `.env.example` file. 
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
