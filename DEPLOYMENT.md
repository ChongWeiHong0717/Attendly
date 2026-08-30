# Attendly deployment guide

This repository is a monorepo with three clients/services:

- `backend/` — NestJS API + Prisma + MySQL
- `frontend/` — React/Vite website
- `desktop/` — Electron NFC-X administration/check-in client

The website and desktop app must point to the **same backend API**. The desktop app never connects directly to MySQL.

## Recommended first deployment: staging

Use a hosted MySQL database and treat it as **staging** until NFC, yearly rollover, imports and school workflows are fully proven.

## 1. Push this repository to GitHub

Do not add real `.env` files. Only `.env.example` files belong in Git.

## 2. Deploy the MySQL database

Create a MySQL 8-compatible database with your hosting provider and copy its connection string.

## 3. Deploy `backend/`

Create a backend service from the GitHub repository and set its root directory to `backend`.

Build command:

```text
npm install && npm run build
```

Start command:

```text
npm run start:deploy
```

Required environment variables:

```text
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET=<long-random-secret-at-least-32-characters>
FRONTEND_URL=https://YOUR-WEBSITE-DOMAIN
ALLOWED_ORIGINS=https://YOUR-WEBSITE-DOMAIN
BOOTSTRAP_ADMIN_NAME=School Admin
BOOTSTRAP_ADMIN_EMAIL=YOUR-ADMIN-EMAIL
BOOTSTRAP_ADMIN_PASSWORD=YOUR-STRONG-PASSWORD
BOOTSTRAP_ACADEMIC_YEAR=2026
```

The deploy start command does three things:

1. `prisma db push` — applies the current schema to the staging database.
2. `prisma/bootstrap.ts` — ensures the student sequence, an active academic year, and optionally your first admin account exist.
3. Starts the compiled NestJS API.

The bootstrap is idempotent and **does not create demo students/classes/teachers**. If the admin already exists, its password is not overwritten.

Check:

```text
https://YOUR-BACKEND-DOMAIN/api/health
```

Expected response includes `"status":"ok"`.

## 4. Deploy `frontend/`

For Vercel, create a project from the same GitHub repository and set the root directory to `frontend`.

Set:

```text
VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN/api
```

Build command:

```text
npm run build
```

Output directory:

```text
dist
```

`frontend/vercel.json` already contains the SPA rewrite needed for React Router.

After Vercel gives the final website URL, make sure the backend's `FRONTEND_URL` and `ALLOWED_ORIGINS` use that exact origin, then redeploy/restart the backend if necessary.

## 5. Test the website before the desktop client

1. Open `/api/health` on the backend.
2. Sign into the website with your bootstrap admin account.
3. Create a class.
4. Add a student.
5. Refresh and confirm the records remain.

Only continue once these work.

## 6. Point the desktop app at the hosted API

The desktop app supports a runtime API URL. On the login screen open **Server settings** and enter:

```text
https://YOUR-BACKEND-DOMAIN/api
```

It is stored locally on that PC. Administrators can also change it later under **System settings**.

This means the desktop app does not need to be rebuilt just because the backend domain changes.

Then verify:

1. Admin login.
2. Existing website students appear in desktop.
3. Add a student in desktop and verify it appears on the website.
4. Assign an NFC card.
5. Transfer/reassign a card and verify ownership.
6. Teacher login.
7. Start NFC check-in.
8. Scan a known card and confirm a daily check-in is created.
9. Open website attendance and confirm the NFC-arrived student is prefilled as Present before final submission.

## Production later

Do not use your staging database for real student data. Once the system is stable, create a separate production MySQL database, set new production secrets, deploy the same schema, and create the real admin account there.

For a mature production deployment, replace `prisma db push` with versioned Prisma migrations. During the current staging/development phase, `db push` keeps the workflow simple while the schema is still changing frequently.
