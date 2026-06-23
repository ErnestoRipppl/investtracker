# InvestTracker

InvestTracker is a premium, private, and local personal investment tracker. It replaces generic spreadsheets with institutional-grade risk metrics, quantitative analytics, custom broker commission modeling, and automated asset allocation recommendations powered by a MiFID II investor profiling questionnaire.

---

## 🚀 Key Features

- **Premium Dark UI**: A modern interface featuring an emerald/teal dark palette with glassmorphism, responsive designs (mobile bottom navigation bar + desktop collapsible sidebar), and smooth animations.
- **Institutional-Grade Financial Math**: High-fidelity quantitative metrics calculated directly from historical prices:
  - **Sharpe, Sortino, Treynor, and Calmar Ratios** for risk-adjusted performance.
  - **Value at Risk (VaR)** (Parametric & Historical) and **Conditional Value at Risk (CVaR)** to estimate tail-risk.
  - **Annualized Volatility, Beta, and Kelly Criterion** for position sizing.
  - All metrics render with live LaTeX math formulas (using KaTeX) and detailed explanations.
- **Monte Carlo Simulator**: Native HTML5 Canvas-based path generator rendering 5,000+ paths step-by-step using `requestAnimationFrame` for high-performance fluid visualizations.
- **MiFID II Investor Profile**: Multi-step animated wizard to evaluate risk tolerance, time horizon, and financial situation, recommending target asset allocations.
- **Flexible Transaction Management**: Full CRUD for transactions (Buy, Sell, Dividends) with automatic asset creation and integration with yfinance to pull real-time market values.
- **Excel Importer**: Drag-and-drop Excel/CSV file uploader with a detailed preview dashboard highlighting processed sheets, skipped duplicates, and warnings.
- **Custom Broker Management**: Configure commissions (fixed, percentage, minimums/maximums), custody fees, and FX spreads, displaying real-time fee calculations.

---

## 🛠 Technology Stack

### Backend
- **FastAPI**: Asynchronous high-performance web framework.
- **SQLAlchemy 2.0 & SQLite**: Robust ORM mapping database records. High-precision monetary calculations using `Decimal`/`Numeric` types.
- **NumPy, SciPy & pandas**: Financial calculations and quantitative algorithms.
- **yfinance**: Real-time market prices with client-side caching and exponential backoff.

### Frontend
- **Next.js 15 (App Router)** & **React 19**: Modern React framework.
- **Tailwind CSS v4**: Sleek, modern utility styling.
- **Shadcn/ui & Radix UI**: High-quality accessible components.
- **TanStack React Query**: Server state caching, background refetching, and mutations.
- **Motion (motion/react)**: Fluent micro-animations respecting `prefers-reduced-motion`.
- **HTML5 Canvas & Recharts**: Performant custom simulations and responsive data charts.

---

## 📁 Directory Structure

```
gallant-hawking/
├── backend/                  # FastAPI Application
│   ├── app/                  # Application source code
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # API Route handlers
│   │   ├── schemas/          # Pydantic schemas (request/response validation)
│   │   ├── services/         # Core business logic & Quantitative Engine
│   │   └── utils/            # Financial math & formula registers
│   ├── data/                 # SQLite database storage (portfolio.db)
│   └── tests/                # Comprehensive backend pytest suite
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # Custom React components (UI, dashboard, analytics)
│   │   ├── hooks/            # Custom React hooks (React Query integrations)
│   │   └── lib/              # API clients, types, and utility formatters
├── scripts/                  # Command line scripts
│   ├── seed-sample-data.py   # Seeding script for sample transactions & profile
│   └── start-dev.sh          # Concurrent startup script
└── README.md                 # Project documentation
```

---

## 🏃 Setup & Run

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Virtual Environment Setup
Ensure the Python virtual environment is configured:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend Dependencies Installation
Install dependencies in the frontend folder:
```bash
cd ../frontend
npm install
```

### 3. Seed Database
Run the seed script to populate the database with realistic sample transactions, assets, brokers, and an investor profile:
```bash
cd ..
source backend/venv/bin/activate
PYTHONPATH=backend python scripts/seed-sample-data.py
```

### 4. Run Development Servers
Use the concurrent start script to spin up both the FastAPI backend and Next.js frontend:
```bash
./scripts/start-dev.sh
```

- **Backend API**: Running on [http://localhost:8000](http://localhost:8000)
- **Frontend App**: Running on [http://localhost:3000](http://localhost:3000)

---

## 🧪 Running Tests

To verify that the backend's quantitative engine and API endpoints are functioning correctly, run the Python test suite:
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

---

## ☁️ Deployment Guide

This application is configured to be deployed on **Render** (for the backend + PostgreSQL database) and **Vercel** (for the frontend).

### 1. Database Migrations (PostgreSQL)
Alembic is initialized for managing migrations. On the first deployment (or whenever database models are updated), you must execute database migrations to set up the schema:
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

### 2. Environment Variables Configuration

Configure the following environment variables in your hosting environments:

#### Backend (Render / VPS)
| Variable | Description | Example / Recommended Value |
|---|---|---|
| `DATABASE_URL` | Connection string to your PostgreSQL instance. | `postgresql://user:pass@host:port/db` (Auto-generated by Render) |
| `JWT_SECRET` | Secret key used to sign and verify JWT authorization tokens. | Generate with `openssl rand -hex 32` |
| `AUTH_PASSWORD_HASH` | Bcrypt hash of your login password (generate with CLI helper). | Hash from `python scripts/generate-password-hash.py` |
| `ALLOWED_ORIGINS` | Comma-separated list of CORS-permitted origins. | `https://your-frontend.vercel.app,http://localhost:3000` |

#### Frontend (Vercel)
| Variable | Description | Example / Recommended Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Absolute URL of your hosted backend FastAPI service. | `https://your-backend.onrender.com` |
