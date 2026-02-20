# HamLog

**AI-Powered Ham Radio Logbook & Contact Analyzer**

HamLog lets amateur radio operators log QSOs (contacts) by typing natural language descriptions — Claude Haiku extracts the structured fields, HamQTH fills in callsign details, and the operator reviews before saving.

## Status

> 🚧 In active development — not yet production ready

| Feature | Status | Notes |
|---------|--------|-------|
| Backend scaffolding, auth, QSO model | ✅ Complete | FastAPI, SQLite/PostgreSQL, JWT |
| Auth pages & manual QSO entry form | ✅ Complete | React + Vite, keyboard-driven |
| Claude Haiku NL parsing endpoint | ✅ Complete | Few-shot prompt, structured JSON |
| AI parsing confirmation UI | ✅ Complete | Highlighted fields, confidence bar |
| HamQTH callsign lookup | ✅ Complete | Session-based XML API, 30-day cache, graceful degradation |
| Contact log view, search & ADIF export | ✅ Complete | Sortable columns, callsign search, ADIF 3.1.4 download |
| Code review & release | ✅ Complete | Tagged v0.1.0, 20 tests passing |

## Feedback & Ideas

> **This project is being built in public and we want to hear from you.**
> Found a bug? Have a feature idea? Something feel wrong or missing?
> **[Open an issue](../../issues)** — every piece of feedback directly shapes what gets built next.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.10+, FastAPI, FastAPI-Users, SQLAlchemy (async), aiosqlite / asyncpg |
| AI | Anthropic Claude Haiku via `anthropic` SDK |
| Callsign lookup | HamQTH XML API |
| Frontend | React 18, Vite, Axios |
| Auth | JWT (FastAPI-Users) |

## Quick Start

### Backend

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env
# Edit .env — set SECRET_KEY, ANTHROPIC_API_KEY, and optionally HAMQTH_USERNAME/PASSWORD

uvicorn backend.main:app --reload
# API at http://localhost:8000  |  docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server at http://localhost:5173
```

### Tests

```bash
pytest -q
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | PostgreSQL URL (defaults to SQLite for development) |
| `SECRET_KEY` | Yes | JWT signing secret — `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Yes | For Claude Haiku NL parsing |
| `HAMQTH_USERNAME` | No | HamQTH account username — enables callsign auto-fill |
| `HAMQTH_PASSWORD` | No | HamQTH account password |

The app runs without HamQTH credentials — callsign lookup degrades gracefully with a status message and operators can enter contact details manually.

## Key Features

- **Natural language entry** — paste "Worked W1AW on 20m SSB, 59/57, name Art, CT" and Claude extracts all fields
- **AI field highlighting** — AI-populated fields are visually distinguished; every field is editable before saving
- **Callsign auto-fill** — on callsign blur, HamQTH is queried for name, QTH, grid, and DXCC entity
- **Graceful degradation** — HamQTH unavailable? No problem. Claude API error? Manual form still works.
- **Keyboard-driven** — tab order optimized, Ctrl+Enter to save, UTC timestamps default automatically
- **Sortable contact log** — click any column header to sort; smart band ordering (160m→70cm)
- **ADIF export** — one-click download of the full log as a standards-compliant ADIF 3.1.4 `.adi` file
