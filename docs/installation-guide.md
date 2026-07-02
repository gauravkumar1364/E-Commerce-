# Installation Guide

## Prerequisites

- Node.js 18 or later
- Python 3.11 or later
- MySQL 8+

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on the Vite development server.

## Backend

Create a Python environment, install backend dependencies, then run the Flask app using the project entry point.

Typical setup:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python wsgi.py
```

If your backend uses environment variables, configure them before starting the app.

## Database

Import the schema into MySQL:

```bash
mysql -u root -p < database/schema.sql
```

## Recommended Startup Order

1. Start MySQL.
2. Import the schema.
3. Start the Flask backend.
4. Start the Vite frontend.
