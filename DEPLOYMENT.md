# Production Deployment Guide — AI Autonomous SOC

This guide provides instructions for deploying the **AI Autonomous SOC** across local environments, Docker Compose, Neon Serverless PostgreSQL, and cloud PaaS providers like Render.

---

## 1. Environment Variables Configuration

Copy `.env.example` to `.env` in the `backend/` directory:

```env
# Application Runtime
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=generate_a_64_char_secure_random_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database Connection (Neon PostgreSQL or SQLite)
# Neon: postgresql://username:password@ep-cool-fog-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=sqlite:///./soc.db

# CORS Allowed Origins (Comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend.onrender.com

# External Threat Intelligence & AI APIs
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
ABUSEIPDB_API_KEY=your_abuseipdb_api_key_here
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here

# Risk Engine Thresholds
RISK_THRESHOLD_LOW=40
RISK_THRESHOLD_MEDIUM=60
RISK_THRESHOLD_HIGH=80
```

---

## 2. Neon Serverless PostgreSQL Setup

1. Create a free account at [neon.tech](https://neon.tech).
2. Provision a new PostgreSQL project (e.g., `autonomous-soc-db`).
3. Under **Dashboard > Connection Details**, copy the connection string:
   ```
   postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
   ```
4. Set `DATABASE_URL` in your backend environment variables to this URI.
5. Execute schema migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

---

## 3. Docker Compose Orchestration

To run PostgreSQL, the FastAPI backend, and the Nginx-hosted React frontend simultaneously:

```bash
# 1. Build and launch all services in detached mode
docker-compose up --build -d

# 2. View container logs
docker-compose logs -f backend

# 3. Access applications:
# Frontend SPA: http://localhost:3000
# Backend API:  http://localhost:8000
# Postgres:     localhost:5432
```

To stop and remove containers:
```bash
docker-compose down
```

---

## 4. Render Cloud Deployment (`render.yaml`)

The repository includes a ready-to-deploy `render.yaml` blueprint:

### Backend Service (Web Service)
- **Environment**: Python 3.11
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt && alembic upgrade head`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend Service (Static Site)
- **Environment**: Static Site
- **Root Directory**: `frontend`
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `dist`
- **Rewrite Rule**: `/*` &rarr; `/index.html` (SPA routing)
- **Environment Variable**: `VITE_BACKEND_URL` &rarr; URL of your Render backend service.

---

## 5. Health Check & Validation

Verify the deployed backend health endpoint:
```bash
curl https://your-backend.onrender.com/api/health
```
Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "ml_model": "loaded",
  "version": "1.0.0",
  "timestamp": "2026-09-28T14:40:00Z"
}
```
