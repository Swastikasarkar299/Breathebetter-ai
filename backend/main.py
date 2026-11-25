"""
BreatheBetter AI — FastAPI Backend
Provides AQI data, weather, and AI-powered recommendations via REST API.
Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os
import json
import random
from datetime import datetime, timedelta

app = FastAPI(
    title="BreatheBetter AI API",
    description="Backend API for the BreatheBetter AI air quality assistant",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Environment Variables ───────────────────────────────────────────────────
OPENWEATHER_KEY = os.getenv("OPENWEATHER_API_KEY", "")
IQAIR_KEY = os.getenv("IQAIR_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

# ─── Mock Data (used when API keys not configured) ───────────────────────────
MOCK_AQI = {
    "location": "New Delhi, India",
    "aqi": 187,
    "category": "Very Poor",
    "pm25": 142.3,
    "pm10": 234.8,
    "temperature": 14.2,
    "humidity": 68,
    "wind_speed": 4.2,
    "no2": 89.4,
    "o3": 42.1,
    "co": 2.8,
    "source": "demo",
    "last_updated": datetime.now().isoformat(),
}

MOCK_TREND = [
    {"day": "Mon", "aqi": 142, "pm25": 98},
    {"day": "Tue", "aqi": 168, "pm25": 124},
    {"day": "Wed", "aqi": 195, "pm25": 148},
    {"day": "Thu", "aqi": 187, "pm25": 142},
    {"day": "Fri", "aqi": 221, "pm25": 178},
    {"day": "Sat", "aqi": 198, "pm25": 155},
    {"day": "Sun", "aqi": 187, "pm25": 142},
]


# ─── Pydantic Models ─────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    location: Optional[str] = "New Delhi"
    aqi: Optional[int] = 187
    user_type: Optional[str] = "general"


class ChatResponse(BaseModel):
    response: str
    source: str  # "ai" or "fallback"


class UserPreferences(BaseModel):
    location: str
    user_type: str
    transport: str
    outdoor_activity: str
    indoor_env: str
    budget: str


# ─── AQI Category Helper ─────────────────────────────────────────────────────
def get_aqi_category(aqi: int) -> dict:
    if aqi <= 50:
        return {"label": "Good", "color": "#22c55e", "advice": "Air quality is satisfactory. Outdoor activities are safe."}
    elif aqi <= 100:
        return {"label": "Satisfactory", "color": "#86efac", "advice": "Acceptable. Sensitive groups should limit prolonged outdoor exposure."}
    elif aqi <= 150:
        return {"label": "Moderate", "color": "#eab308", "advice": "Members of sensitive groups may experience health effects."}
    elif aqi <= 200:
        return {"label": "Very Poor", "color": "#ef4444", "advice": "Everyone may begin to experience health effects."}
    elif aqi <= 300:
        return {"label": "Severe", "color": "#7c3aed", "advice": "Health alert: everyone may experience serious health effects."}
    else:
        return {"label": "Hazardous", "color": "#7f1d1d", "advice": "Emergency. Entire population likely affected."}


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "BreatheBetter AI API", "version": "1.0.0", "status": "running"}


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "apis_connected": {
            "openweather": bool(OPENWEATHER_KEY),
            "iqair": bool(IQAIR_KEY),
            "openai": bool(OPENAI_KEY) or bool(GEMINI_KEY),
        }
    }


@app.get("/api/aqi")
async def get_aqi(
    lat: Optional[float] = Query(28.6139, description="Latitude"),
    lon: Optional[float] = Query(77.2090, description="Longitude"),
    city: Optional[str] = Query(None, description="City name"),
):
    """Get live AQI data. Uses OpenWeatherMap if API key provided, else free Open-Meteo Live API."""
    if not OPENWEATHER_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                loc_name = city or "New Delhi, India"
                if city:
                    geo_resp = await client.get(
                        "https://geocoding-api.open-meteo.com/v1/search",
                        params={"name": city.split(",")[0].strip(), "count": 1, "language": "en", "format": "json"}
                    )
                    if geo_resp.status_code == 200 and geo_resp.json().get("results"):
                        place = geo_resp.json()["results"][0]
                        lat, lon = place["latitude"], place["longitude"]
                        loc_name = f"{place['name']}, {place.get('country', '')}".strip(", ")

                aq_resp = await client.get(
                    "https://air-quality-api.open-meteo.com/v1/air-quality",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current": "us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone",
                        "timezone": "auto",
                    }
                )
                w_resp = await client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
                        "timezone": "auto",
                    }
                )
                if aq_resp.status_code == 200 and w_resp.status_code == 200:
                    cur = aq_resp.json().get("current", {})
                    w_cur = w_resp.json().get("current", {})
                    aqi_val = int(round(cur.get("us_aqi") or 100))
                    cat = get_aqi_category(aqi_val)
                    return {
                        "location": loc_name,
                        "aqi": aqi_val,
                        "category": cat["label"],
                        "pm25": round(cur.get("pm2_5") or 0, 1),
                        "pm10": round(cur.get("pm10") or 0, 1),
                        "no2": round(cur.get("nitrogen_dioxide") or 0, 1),
                        "o3": round(cur.get("ozone") or 0, 1),
                        "co": round((cur.get("carbon_monoxide") or 0) / 1000, 2),
                        "temperature": round(w_cur.get("temperature_2m") or 20, 1),
                        "humidity": int(round(w_cur.get("relative_humidity_2m") or 50)),
                        "wind_speed": round(w_cur.get("wind_speed_10m") or 5, 1),
                        "source": "open-meteo-live",
                        "last_updated": datetime.now().isoformat(),
                    }
        except Exception as e:
            print(f"Open-Meteo error: {e}")
        return {**MOCK_AQI, "source": "demo_offline", "note": "Network unavailable — showing demo data"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get coordinates if city provided
            if city:
                geo_resp = await client.get(
                    f"http://api.openweathermap.org/geo/1.0/direct",
                    params={"q": city, "limit": 1, "appid": OPENWEATHER_KEY}
                )
                if geo_resp.status_code == 200 and geo_resp.json():
                    geo = geo_resp.json()[0]
                    lat, lon = geo["lat"], geo["lon"]

            # AQI data
            aqi_resp = await client.get(
                "http://api.openweathermap.org/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_KEY}
            )
            # Weather data
            weather_resp = await client.get(
                "http://api.openweathermap.org/data/2.5/weather",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_KEY, "units": "metric"}
            )

            if aqi_resp.status_code == 200 and weather_resp.status_code == 200:
                aqi_data = aqi_resp.json()
                weather = weather_resp.json()
                components = aqi_data["list"][0]["components"]
                raw_aqi = aqi_data["list"][0]["main"]["aqi"]  # 1-5 scale

                # Convert OpenWeather 1-5 AQI to 0-500 India AQI scale
                aqi_map = {1: 25, 2: 75, 3: 125, 4: 200, 5: 350}
                india_aqi = aqi_map.get(raw_aqi, 150)

                cat = get_aqi_category(india_aqi)
                return {
                    "location": f"{weather.get('name', 'Unknown')}, {weather.get('sys', {}).get('country', '')}",
                    "aqi": india_aqi,
                    "category": cat["label"],
                    "pm25": round(components.get("pm2_5", 0), 1),
                    "pm10": round(components.get("pm10", 0), 1),
                    "no2": round(components.get("no2", 0), 1),
                    "o3": round(components.get("o3", 0), 1),
                    "co": round(components.get("co", 0) / 1000, 2),
                    "temperature": round(weather["main"]["temp"], 1),
                    "humidity": weather["main"]["humidity"],
                    "wind_speed": round(weather["wind"]["speed"] * 3.6, 1),
                    "source": "openweathermap",
                    "last_updated": datetime.now().isoformat(),
                }
    except Exception as e:
        print(f"AQI API error: {e}")

    return {**MOCK_AQI, "source": "demo_fallback", "note": "API error — showing demo data"}


@app.get("/api/aqi/trend")
async def get_aqi_trend(
    lat: Optional[float] = Query(28.6139),
    lon: Optional[float] = Query(77.2090),
):
    """Get 7-day AQI trend. Uses OpenWeatherMap historical API or returns mock data."""
    if not OPENWEATHER_KEY:
        return {"data": MOCK_TREND, "source": "demo"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            trend = []
            for i in range(6, -1, -1):
                day = datetime.now() - timedelta(days=i)
                start = int(day.replace(hour=0, minute=0, second=0).timestamp())
                end = int(day.replace(hour=23, minute=59, second=59).timestamp())
                resp = await client.get(
                    "http://api.openweathermap.org/data/2.5/air_pollution/history",
                    params={"lat": lat, "lon": lon, "start": start, "end": end, "appid": OPENWEATHER_KEY}
                )
                if resp.status_code == 200:
                    items = resp.json().get("list", [])
                    if items:
                        avg_pm25 = sum(item["components"]["pm2_5"] for item in items) / len(items)
                        avg_aqi_raw = sum(item["main"]["aqi"] for item in items) / len(items)
                        aqi_map = {1: 25, 2: 75, 3: 125, 4: 200, 5: 350}
                        india_aqi = aqi_map.get(round(avg_aqi_raw), 150)
                        trend.append({
                            "day": day.strftime("%a"),
                            "aqi": india_aqi,
                            "pm25": round(avg_pm25, 1),
                        })
            if trend:
                return {"data": trend, "source": "openweathermap"}
    except Exception as e:
        print(f"Trend API error: {e}")

    return {"data": MOCK_TREND, "source": "demo_fallback"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """AI chatbot endpoint. Uses OpenAI/Gemini if key provided, else rule-based fallback."""
    message_lower = req.message.lower()
    aqi_category = get_aqi_category(req.aqi)

    # Try AI API
    if GEMINI_KEY:
        try:
            system_prompt = f"""You are BreatheBetter AI, a helpful, friendly air quality assistant.
Current conditions: AQI {req.aqi} ({aqi_category['label']}) in {req.location}.
User type: {req.user_type}.
Provide evidence-based, actionable advice. Keep responses concise (under 200 words).
Use emojis sparingly. Format key points with bullet points."""

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_KEY}",
                    json={
                        "contents": [{"parts": [{"text": f"{system_prompt}\n\nUser: {req.message}"}]}],
                        "generationConfig": {"maxOutputTokens": 400, "temperature": 0.7}
                    }
                )
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    return ChatResponse(response=text, source="gemini")
        except Exception as e:
            print(f"Gemini error: {e}")

    if OPENAI_KEY:
        try:
            system_prompt = f"""You are BreatheBetter AI, a helpful air quality assistant.
Current AQI: {req.aqi} ({aqi_category['label']}) in {req.location}.
Provide evidence-based, actionable advice in under 200 words."""

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_KEY}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": req.message}
                        ],
                        "max_tokens": 400,
                    }
                )
                if resp.status_code == 200:
                    text = resp.json()["choices"][0]["message"]["content"]
                    return ChatResponse(response=text, source="openai")
        except Exception as e:
            print(f"OpenAI error: {e}")

    # Rule-based fallback
    response = generate_fallback_response(message_lower, req.aqi, req.location, aqi_category)
    return ChatResponse(response=response, source="fallback")


def generate_fallback_response(message: str, aqi: int, location: str, cat: dict) -> str:
    """Smart rule-based response generation."""
    if any(kw in message for kw in ["morning walk", "jog", "run outside", "exercise outside"]):
        if aqi > 150:
            return f"🚶 AQI is {aqi} ({cat['label']}) — outdoor exercise is NOT recommended. Opt for indoor yoga or stretching instead. If you must go out, wear N95 mask and choose late morning (11 AM-1 PM) when smog is slightly lighter."
        else:
            return f"✅ AQI is {aqi} ({cat['label']}) — a morning walk is acceptable. Prefer parks with dense vegetation and avoid main roads."

    if any(kw in message for kw in ["children", "kids", "child", "play outside"]):
        if aqi > 100:
            return f"👨‍👩‍👧 With AQI at {aqi} ({cat['label']}), keep children indoors. Children breathe 50% more air per body weight — they're highly vulnerable to PM2.5 damage to developing lungs."
        else:
            return f"✅ AQI is {aqi} ({cat['label']}). Children can play outside, but limit to 1-2 hours and choose open areas away from traffic."

    if any(kw in message for kw in ["indoor air", "home air", "purifier", "without purifier"]):
        return f"🏠 Free indoor air tips:\n• Keep windows closed 7-10 AM and 6-9 PM (peak pollution)\n• Wet mop floors daily\n• Place snake plant, peace lily near windows\n• Avoid incense/candles\n• DIY purifier: HEPA filter + box fan (₹300-500)"

    if any(kw in message for kw in ["commute", "travel", "drive", "bike"]):
        return f"🚌 Best commute options (AQI {aqi}):\n1. Metro/Train — enclosed, filtered\n2. AC Bus — recirculated air\n3. AC Car — windows closed, recirculate mode\nAvoid two-wheelers today — open exposure is 3-5x higher than enclosed vehicles."

    return f"🤖 BreatheBetter AI: AQI is {aqi} ({cat['label']}) in {location}. {cat['advice']} Ask me about outdoor safety, indoor air improvement, commuting tips, or family health precautions!"


@app.get("/api/recommendations")
def get_recommendations(
    aqi: int = Query(187),
    user_type: str = Query("general"),
    transport: str = Query("public_transport"),
):
    """Get personalized daily recommendations based on AQI and user profile."""
    cat = get_aqi_category(aqi)
    recommendations = []

    if aqi > 150:
        recommendations.extend([
            {
                "category": "outdoor",
                "priority": "critical" if aqi > 200 else "high",
                "action": "Avoid outdoor exercise and unnecessary outdoor trips",
                "why": f"AQI {aqi} ({cat['label']}) causes respiratory inflammation with prolonged exposure.",
                "benefit": "Significantly reduces PM2.5 inhalation",
                "difficulty": "Easy"
            },
            {
                "category": "family",
                "priority": "critical",
                "action": "Keep children and senior citizens indoors",
                "why": "Vulnerable groups are 3-5x more susceptible to PM2.5 health effects",
                "benefit": "Prevents acute respiratory events",
                "difficulty": "Easy"
            }
        ])

    if transport in ["two_wheeler", "car"]:
        recommendations.append({
            "category": "travel",
            "priority": "high",
            "action": "Switch to metro or carpool today",
            "why": "Open two-wheelers expose riders to 3-5x more pollution than enclosed vehicles",
            "benefit": "Reduces personal exposure AND citywide emissions",
            "difficulty": "Medium"
        })

    recommendations.extend([
        {
            "category": "indoor",
            "priority": "high",
            "action": "Keep windows closed between 7-10 AM and 6-9 PM",
            "why": "These are peak AQI hours — outdoor air significantly worsens indoor air quality",
            "benefit": "Maintains indoor AQI up to 40% lower than outdoor",
            "difficulty": "Easy"
        },
        {
            "category": "sustainable",
            "priority": "high",
            "action": "Avoid all open burning — leaves, garbage, biomass",
            "why": "Open burning is a primary contributor to winter smog formation",
            "benefit": "Each avoided burn prevents ~20kg PM2.5 from entering local air",
            "difficulty": "Easy"
        }
    ])

    return {
        "aqi": aqi,
        "category": cat["label"],
        "user_type": user_type,
        "recommendations": recommendations,
        "generated_at": datetime.now().isoformat(),
    }


@app.get("/api/indoor-tips")
def get_indoor_tips(budget: str = Query("low")):
    """Get indoor air quality tips based on budget."""
    tips = {
        "ventilation": [
            {"time": "6–9 AM", "action": "Keep windows closed — morning rush peak"},
            {"time": "9–11 AM", "action": "Brief ventilation OK — 10 minutes"},
            {"time": "11–2 PM", "action": "Best window for ventilation"},
            {"time": "4–9 PM", "action": "Keep closed — evening spike"},
        ],
        "free": [
            "Wet-mop floors instead of dry sweeping",
            "Seal window gaps with wet cloth strips",
            "Place water bowls near heat sources for humidity",
            "Cook with exhaust fan on always",
        ],
        "low_budget": [
            "DIY HEPA purifier (box fan + filter, ₹300-500)",
            "Activated charcoal sachets near windows (₹100-200)",
            "Snake plant or money plant (₹80-200 each)",
        ],
        "medium_budget": [
            "Basic HEPA air purifier (₹2000-5000) for bedroom",
            "Cabin air filter replacement if driving daily",
        ]
    }
    return tips


@app.get("/api/eco-impact")
def get_eco_impact():
    """Return user eco impact stats (would be from DB in production)."""
    return {
        "trips_avoided": 12,
        "fuel_saved_litres": 8.4,
        "co2_avoided_kg": 19.6,
        "actions_completed": 28,
        "eco_score": 74,
        "week_start": (datetime.now() - timedelta(days=6)).strftime("%b %d"),
        "week_end": datetime.now().strftime("%b %d, %Y"),
        "note": "Values are estimates. See methodology in app.",
    }


@app.get("/api/community")
def get_community_data():
    """Return community stats."""
    return {
        "community_score": 68,
        "participants": 1247,
        "active_challenge": {
            "title": "Zero-Burn Week",
            "description": "No waste or leaf burning for 7 days",
            "progress_pct": 73,
            "days_left": 4,
        },
        "top_actions": [
            "892 families avoided open burning this week",
            "234 participants chose public transport",
            "156 DIY air purifiers built",
        ]
    }

