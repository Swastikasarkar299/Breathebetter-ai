# BreatheBetter AI — Smart Air Quality Monitoring & Health Intelligence Platform

A full-stack environmental intelligence SaaS platform powered by **React 19, Vite 8, Tailwind CSS v4, Recharts, Node.js/Express, SQLite/PostgreSQL**, and real-time **Open-Meteo + optional IQAir** APIs.

---

## Key Modules

| Module | Capabilities |
|---|---|
| **Dashboard** | Live US AQI gauge, PM2.5, PM10, NO₂, SO₂, CO, O₃ with WHO 2021 threshold indicators, full weather (Temp, Feels-like, Humidity, Wind speed & direction, Pressure, UV, Sky), pollutant comparison chart, hourly/daily trends, multi-day forecast, and CSV/PDF export |
| **AI Health Assistant** | Secure server-side `/api/ai/chat` endpoint supporting Google Gemini / OpenAI with live telemetry injection, multi-turn chat history, and contextual environmental fallback |
| **Smart Daily Planner** | Forecast-driven outdoor windows, walking/cycling/sports guidance, full CRUD activity scheduling (Create, Edit, Delete, Complete), and Daily/Weekly schedule views |
| **Indoor Air Quality** | Explicitly marks indoor readings as `Unavailable` unless a physical indoor PM2.5 sensor reading is connected; includes dynamic ventilation windows, CADR purifier sizing, and daily indoor checklist |
| **Eco Impact** | Interactive Carbon Footprint Calculator (distance, transport mode, fuel/EV powertrain, daily kWh), weekly/monthly CO₂ charts, sustainability score, and persistent action logs |
| **Community Platform** | Persistent discussions, pollution reports, categories, edit/delete ownership controls, likes, comments, and moderation reporting |
| **Analytics, Map & Education** | 7-day trends, 24h category distribution, stored snapshot archive, multi-city live comparison, interactive global/India station map, CSV/PDF reports, and AQI learning center |
| **Account, Alerts & Settings** | JWT auth (register, login, forgot/reset password), saved cities, Light/Dark themes, custom AQI threshold alerts, notification center, AQI standards, and privacy controls |

---

## Local Development

### 1. Install Dependencies
```bash
npm install
cp .env.example .env.local
```

### 2. Run API Server + Frontend Dev Server
Open two terminals:

**Terminal 1 — Node.js Express Backend (`http://localhost:8000`)**
```bash
npm run server
```

**Terminal 2 — Vite React Frontend (`http://localhost:5175`)**
```bash
npm run dev
```

Vite automatically proxies `/api/*` requests to `http://localhost:8000` so API keys remain strictly on the server.

### 3. Verify Automated Checks
```bash
npm run lint
npm run build
npm run test:api
```

---

## Vercel Production Deployment

This repository includes `vercel.json` and `api/index.js` so both the Vite SPA and Express `/api/*` backend deploy together seamlessly on Vercel:

1. Push updates to GitHub (`Swastikasarkar299/Breathebetter-ai`).
2. In **Vercel → Project Settings → Environment Variables**, configure:
   - `JWT_SECRET` *(required for auth tokens)*
   - `GEMINI_API_KEY` or `OPENAI_API_KEY` *(optional for external LLM responses)*
   - `IQAIR_API_KEY` *(optional for IQAir station data)*
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` *(optional hosted Postgres; apply `server/supabase-schema.sql`)*
3. Vercel runs `npm run build` (`dist/`) and routes `/api/*` through `api/index.js`.

---

## Transparency & Medical Disclaimer

- Live ambient air quality and weather come from **Open-Meteo** (and **IQAir** when `IQAIR_API_KEY` is configured). Offline/unavailable states are explicitly labeled and never disguised as live data.
- Indoor readings remain labeled **Unavailable** unless user sensor data is entered.
- Carbon footprint figures are estimates using standard DEFRA/EPA/grid factors. Guidance is informational and not a substitute for professional medical advice.
