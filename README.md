# BreatheBetter AI — Smart Air Quality Monitoring & Health Assistant

A modern, full-stack environmental intelligence web application built with **React, Tailwind CSS, Recharts, and FastAPI**, powered by real-time **Open-Meteo Air Quality & Weather APIs**.

---

## Features

| Module | Capabilities |
|---|---|
| **Dashboard** | Live US AQI gauge, PM2.5, PM10, NO₂, O₃, CO, SO₂ with WHO 2021 threshold bars, live weather conditions, global city autocomplete, browser geolocation, and 24h/7-day trend charts |
| **AI Health Assistant** | Context-aware conversational assistant covering air pollution health risks, sensitive groups (children, seniors, asthma), plain-language pollutant breakdowns, and optional Gemini / OpenAI / FastAPI integration |
| **Daily Planner** | Computes the cleanest outdoor hour from hourly AQI data, walking/cycling/exercise suitability, daily pollution alerts, indoor alternatives, and a morning/midday/evening routine schedule |
| **Indoor Air Quality** | Clearly separates mathematically estimated indoor AQI from optional user home PM2.5 sensor input, dynamic ventilation schedules, room-size CADR purifier calculator, and room-by-room tips |
| **Eco Impact** | Personal commute carbon footprint comparison (Car, Two-Wheeler, Bus, Metro, Walk/Cycle), interactive low-emission checklist, and live Eco Score & CO₂ progress charts |
| **Community** | Regional AQI updates, categorized local pollution reporting (waste burning, construction dust, vehicle smoke, industrial), clean-air challenges, and leaderboard |
| **Settings & Alerts** | User personalization profile, **Light & Dark mode**, °C/°F units, custom AQI alert threshold slider/presets, weather stagnation alerts, API key testing, and AQI measurement reference guide |

---

## Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS v4
- **Charts & Icons:** Recharts, Lucide React
- **Live Data APIs:** Open-Meteo Air Quality API & Weather Forecast API (zero API key required), Open-Meteo Geocoding API, OpenStreetMap Nominatim reverse geocoding, optional OpenWeatherMap overlay
- **Backend (Optional):** Python FastAPI (`backend/main.py`)
- **AI Chat:** Google Gemini / OpenAI API (optional) + built-in live context-aware engine

---

## Quick Start

### 1. Frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Runs at **http://localhost:5175**

### 2. Backend (Optional)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

API docs available at **http://localhost:8000/docs**

---

## Environment Variables

Copy `.env.example` to `.env.local` (frontend) and `backend/.env.example` to `backend/.env` (backend).

- Live global AQI, pollutants, and weather work **out of the box via Open-Meteo** with no API keys required.
- Optional keys (`VITE_OPENWEATHER_API_KEY`, `VITE_GEMINI_API_KEY`, `OPENAI_API_KEY`) can also be configured directly inside **Settings → API Keys** in the UI.

---

## Project Structure

```text
breathebetter-ai/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── data/mockData.js
│   ├── services/airQualityService.js
│   └── components/
│       ├── Navbar.jsx
│       ├── AQIGauge.jsx
│       ├── Dashboard.jsx
│       ├── ChatAssistant.jsx
│       ├── DailyPlanner.jsx
│       ├── IndoorAir.jsx
│       ├── EcoImpact.jsx
│       ├── Community.jsx
│       └── Settings.jsx
└── backend/
    ├── main.py
    ├── requirements.txt
    └── .env.example
```

---

## Disclaimer

- Indoor AQI estimates (unless entered from a physical home monitor) and carbon/fuel savings are **estimates** based on standard reference factors.
- AI Health Assistant guidance is informational and **not a substitute for professional medical advice**.
