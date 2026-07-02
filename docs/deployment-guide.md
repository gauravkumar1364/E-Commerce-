# Deployment Guide

## Frontend Deployment

Build the React app with Vite:

```bash
cd frontend
npm install
npm run build
```

Deploy the generated `dist` output to your static hosting platform of choice.

## Backend Deployment

Deploy the Flask API behind a production WSGI server such as Gunicorn or Waitress.

Recommended runtime concerns:

- Use production environment variables for secrets and database credentials.
- Disable debug mode.
- Configure secure cookie settings and JWT settings for your domain.
- Place the backend behind a reverse proxy such as Nginx or a managed app platform.

## Database Deployment

- Use a managed MySQL 8 instance when possible.
- Ensure the schema is applied before the backend starts.
- Back up the database regularly.
- Restrict network access to trusted application hosts.

## Environment Variables

Common variables for deployment include:

- `FLASK_ENV`
- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `DATABASE_URL`
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

## Operational Checks

Before publishing a new release, verify:

1. Login and token refresh work.
2. Catalog and checkout flows load correctly.
3. Admin dashboard charts and forensic endpoints respond.
4. Database migrations or schema updates are applied.
