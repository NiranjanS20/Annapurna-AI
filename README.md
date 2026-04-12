# Annapurna AI — Food Waste Management Platform

Annapurna AI is a complete full-stack web application designed to help commercial kitchens, vendors, and NGOs track and minimize food waste using Machine Learning demand forecasting.

## Architecture

- **Frontend:** React, Vite, Tailwind CSS (Glassmorphism & Neobrutalism design)
- **Backend:** Python, Flask, SQLAlchemy
- **Database:** PostgreSQL (with SQLite fallback for local development)
- **Authentication:** Firebase Auth
- **ML Engine:** Scikit-learn (RandomForestRegressor for demand forecasting)

## Directory Structure

```text
ai-food-waste-management/
│
├── frontend/                # React App (Vite)
├── backend/                 # Flask Backend API
├── ml_models/               # ML logic, data, and trained `.pkl` models
├── database/                # Schema definitions and migration docs
└── .env.example             # Template for environment variables
```

## Setup & Local Development

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- A Firebase project (for Authentication)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

### 3. ML Model Training
To generate the necessary demand forecasting model, you must train it using the provided dataset.
```bash
# From the project root, train the model using the actual CSV dataset:
python -m ml_models.training.train_model --mode csv
```
This will generate `ml_models/models/demand_model.pkl` and a metadata JSON file.

### 4. Database Setup
Copy the `.env.example` into `backend/.env`.
The Flask app will auto-create the database schema and seed default menu items on its first run using the provided `DATABASE_URL` (SQLite by default for local dev).

### 5. Running the Backend
```bash
cd backend
flask run --port=5000
```
*Note: Make sure to drop your `firebase_service_account.json` inside the `backend/` directory or configure `FIREBASE_CREDENTIALS_JSON` in your `.env`.*

### 6. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Define your Vite environment variables in `frontend/.env` based on the `.env.example`.

## Deployment

### Backend (Railway / Heroku)
1. Add a PostgreSQL database to your project. The platform should automatically expose `DATABASE_URL`.
2. Configure environment variables (see `.env.example`).
3. For Firebase authentication in production, inject the JSON content of your service account into the `FIREBASE_CREDENTIALS_JSON` environment variable (rather than committing the JSON file).
4. The deployment will automatically use the `Procfile`: `web: gunicorn --workers=4 run:app`.

### Frontend (Vercel)
1. Import the `frontend/` directory as a new project in Vercel.
2. The framework preset should correctly identify it as a Vite application (`npm run build` / `dist`).
3. Include the environment variables (`VITE_API_BASE_URL` pointing to the deployed backend URL, and `VITE_FIREBASE_*` keys).
4. A custom `vercel.json` ensures that Single Page Application (SPA) routing behaves correctly without throwing 404 errors.

## Testing & Validation
1. Create a user via the signup flow.
2. In the **Data Entry** page, log some quantities for different food items. This saves data to PostgreSQL.
3. Check the **Dashboard** and **Analytics** pages to ensure live charts render data correctly via the API.
4. Navigate to the **Prediction** page, select a meal item, and verify that the ML model returns a valid prediction along with its confidence score.
