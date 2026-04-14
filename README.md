<div align="center">
  <img src="./assets/logo.svg" alt="Annapurna AI" width="500"/>
</div>

<br/>

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10+-1D9E75?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-0F6E56?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-5DCAA5?style=flat-square&logo=react&logoColor=white)](https://reactjs.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-RandomForest-9FE1CB?style=flat-square&logo=scikit-learn&logoColor=black)](https://scikit-learn.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-1D9E75?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-0F6E56?style=flat-square&logo=firebase&logoColor=white)](https://firebase.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-5DCAA5?style=flat-square)](LICENSE)

</div>

<br/>

<div align="center">
  <strong>Intelligent demand forecasting for commercial kitchens, vendors & NGOs.</strong><br/>
  <sub>Cut waste · Predict smarter · Feed more</sub>
</div>

<br/>

---

## `$ whoami`

**Annapurna AI** is a production-ready full-stack platform that applies machine learning to one of the most underserved problems in food systems — **kitchen-level food waste**.

Operators log daily food quantities, receive AI-powered demand forecasts, and visualize waste trends through a live dashboard. The ML engine trains a `RandomForestRegressor` on historical data to predict how much of each menu item will actually be needed — so kitchens cook what gets eaten, not what gets thrown away.

> *Named after the Annapurna massif — a symbol of abundance and sustenance — built for those who feed communities at scale.*

<br/>

---

## `$ cat architecture.txt`

```
                        ┌─────────────────────────────────────────┐
                        │           ANNAPURNA AI PLATFORM          │
                        └─────────────────────────────────────────┘
                                            │
                  ┌─────────────────────────┼─────────────────────────┐
                  ▼                         ▼                         ▼
        ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
        │    Frontend     │      │   Backend API   │      │   ML Engine     │
        │                 │◀────▶│                 │◀────▶│                 │
        │  React + Vite   │      │ Flask + SQLAlch │      │  scikit-learn   │
        │  Tailwind CSS   │      │ Firebase Verify │      │ RandomForest    │
        │  Glassmorphism  │      │   Gunicorn      │      │  demand.pkl     │
        └─────────────────┘      └────────┬────────┘      └─────────────────┘
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                ┌──────────────────┐           ┌──────────────────┐
                │   PostgreSQL     │           │   Firebase       │
                │  (prod)          │           │   Auth           │
                │  SQLite (dev)    │           │                  │
                └──────────────────┘           └──────────────────┘
```

| Layer | Stack | Role |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | Dashboard, analytics, prediction UI |
| **Backend** | Flask, SQLAlchemy, Gunicorn | REST API + Firebase token verification |
| **Database** | PostgreSQL / SQLite fallback | Food log persistence |
| **Auth** | Firebase Authentication | Secure user identity |
| **ML Engine** | scikit-learn `RandomForestRegressor` | Demand forecasting + confidence scoring |

<br/>

---

## `$ ls -la`

```
ai-food-waste-management/
│
├── 📂 frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── pages/                  # Dashboard, Analytics, Prediction, DataEntry
│   │   ├── components/             # Reusable UI components
│   │   └── hooks/                  # Firebase auth hooks, API wrappers
│   ├── vercel.json                 # SPA routing — prevents 404 on refresh
│   └── .env.example
│
├── 📂 backend/                     # Flask REST API
│   ├── routes/                     # /api/logs  /api/predict  /api/menu
│   ├── models/                     # SQLAlchemy ORM definitions
│   ├── auth/                       # Firebase token middleware
│   ├── run.py                      # App entrypoint
│   └── Procfile                    # web: gunicorn --workers=4 run:app
│
├── 📂 ml_models/                   # ML pipeline
│   ├── training/
│   │   └── train_model.py          # --mode csv | --mode synthetic
│   ├── models/
│   │   ├── demand_model.pkl        # ← generated after training
│   │   └── model_meta.json         # feature names, training timestamp
│   └── data/
│       └── dataset.csv             # historical food quantity records
│
├── 📂 assets/                      # logo.svg and static media
├── 📂 database/                    # schema definitions + migration docs
├── .env.example                    # all required environment variables
└── README.md
```

<br/>

---

## `$ ./setup.sh`

### Prerequisites

```
Python  ≥ 3.10    →  python --version
Node.js ≥ 18      →  node --version
Firebase project  →  console.firebase.google.com
```

<br/>

### 01 — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

<br/>

### 02 — Train the ML Model

Run **once** from the project root before starting the server:

```bash
python -m ml_models.training.train_model --mode csv
```

Outputs:

```
ml_models/models/demand_model.pkl      # trained RandomForestRegressor
ml_models/models/model_meta.json       # feature map + training metadata
```

> Without this step the `/api/predict` endpoint will return `500`.

<br/>

### 03 — Environment

```bash
cp .env.example backend/.env
```

```env
# backend/.env

DATABASE_URL=sqlite:///./annapurna.db       # swap for postgres:// in prod
FIREBASE_CREDENTIALS_JSON='{...}'           # or drop firebase_service_account.json in /backend
SECRET_KEY=your-flask-secret-key
```

<br/>

### 04 — Run Backend

```bash
cd backend
flask run --port=5000
# → http://localhost:5000
```

Flask auto-creates the database schema and seeds default menu items on first run.

<br/>

### 05 — Run Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

```env
# frontend/.env

VITE_API_BASE_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

<br/>

---

## `$ git push origin production`

### Backend → Railway / Heroku

```bash
# 1. Provision PostgreSQL — DATABASE_URL injected automatically
# 2. Set env vars from .env.example in your platform dashboard
# 3. Firebase credentials — inject JSON content, never commit the file:

FIREBASE_CREDENTIALS_JSON='{"type":"service_account","project_id":"..."}'

# Deploy — Procfile takes over:
# web: gunicorn --workers=4 run:app
```

### Frontend → Vercel

```bash
# Root directory  : frontend/
# Framework preset: Vite
# Build command   : npm run build
# Output dir      : dist

# Required env vars in Vercel dashboard:
VITE_API_BASE_URL=https://your-backend.up.railway.app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...

# vercel.json handles SPA routing — no config needed beyond env vars
```

<br/>

---

## `$ npm test`

End-to-end smoke test — run through this after every deploy:

```
✦  Sign up via the auth flow
✦  Log quantities on the Data Entry page → confirm saved to DB
✦  Open Dashboard → verify live charts render from API
✦  Open Analytics → confirm waste trend visualization loads
✦  Open Prediction → select a menu item
         └─ expect: forecast value + confidence score returned by ML model
```

<br/>

---

## `$ cat features.md`

```
┌────────────────────────────────────────────────────────────────┐
│  ML DEMAND FORECASTING    RandomForestRegressor trained on     │
│                           historical logs — per-item demand    │
│                           prediction with confidence scoring   │
├────────────────────────────────────────────────────────────────┤
│  REAL-TIME DASHBOARD      Live charts — waste tracking,        │
│                           quantity trends, daily summaries     │
├────────────────────────────────────────────────────────────────┤
│  ROLE-BASED ACCESS        Firebase Auth — kitchen operators,   │
│                           vendors, and NGO accounts            │
├────────────────────────────────────────────────────────────────┤
│  DUAL DB SUPPORT          PostgreSQL in production,            │
│                           SQLite for zero-config local dev     │
├────────────────────────────────────────────────────────────────┤
│  SPA ARCHITECTURE         Vite + React — client-side routing,  │
│                           protected routes, fast HMR           │
└────────────────────────────────────────────────────────────────┘
```

<br/>

---

## `$ cat stack.lock`

```yaml
frontend:
  framework:  React 18
  bundler:    Vite
  styling:    Tailwind CSS  (Glassmorphism + Neobrutalism)

backend:
  language:   Python 3.10+
  framework:  Flask
  orm:        SQLAlchemy
  server:     Gunicorn (4 workers)

database:
  production: PostgreSQL 16
  local:      SQLite

auth:         Firebase Authentication

ml:
  library:    scikit-learn
  model:      RandomForestRegressor
  tooling:    Pandas · NumPy

deployment:
  frontend:   Vercel
  backend:    Railway  /  Heroku
```

<br/>

---

<div align="center">
  <sub>MIT © 2024 — built with purpose, for those who feed communities</sub><br/>
  <sub>🌿 &nbsp; less waste · better forecasts · more impact</sub>
</div>
