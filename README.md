# DailyRead - Personal News Reader

A clean, fast personal news reader that aggregates articles from multiple RSS sources. No ads, no tracking, no popups.

## Features

- 📰 RSS/Atom feed aggregation
- 🌙 Dark/Light/Sepia themes  
- 📱 Mobile-first, PWA ready
- 📖 Clean reader mode
- 🔖 Bookmark articles (localStorage)
- 🔍 Full-text search
- 📂 14 categories
- 👑 Admin dashboard
- 🚀 Next.js API Routes + Turso (libSQL) DB
- ⚡ 100% Free Vercel Deployment

## Architecture (Vercel + Turso)

```
Frontend (Next.js on Vercel)
    ↓
API Routes (Next.js /app/api/)
    ↓
Database (Turso DB - Serverless SQLite)
    ↑
cron-job.org → GET /api/cron → RSS Collector
```

## Tech Stack

- **Frontend & Backend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- **Database**: Turso DB / libSQL (SQLite)
- **Scheduler**: API Route triggered by cron-job.org
- **Deploy**: Vercel

---

## Quick Start (Local Development)

### 1. Clone & Install

```bash
git clone <your-repo>
cd dailyread
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

By default, without Turso credentials, it will use a local SQLite file (`local.db`).

### 3. Initialize Local Database

```bash
npm run db:migrate
# This will create local.db and apply the schema + seed data
```

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Production Deployment (100% Free)

### Step 1: Create Turso Database

1. Go to https://turso.tech and create a free account
2. Install Turso CLI or use their dashboard to create a database:
   ```bash
   turso db create dailyread
   ```
3. Get the Database URL:
   ```bash
   turso db show dailyread --url
   ```
4. Get the Auth Token:
   ```bash
   turso db tokens create dailyread
   ```

### Step 2: Push to GitHub & Vercel

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and import your repository.
3. In the **Environment Variables** section, add:
   - `TURSO_DATABASE_URL`: Your Turso DB URL
   - `TURSO_AUTH_TOKEN`: Your Turso DB token
   - `ADMIN_SECRET`: A strong password to access your `/admin` dashboard
   - `CRON_SECRET`: A secret token for your cron job (optional)
4. Click **Deploy**.

### Step 3: Apply Database Schema to Production

1. On your local machine, update `.env.local` temporarily with your production Turso credentials.
2. Run the migration to apply schema to production:
   ```bash
   npm run db:migrate
   ```
3. Once done, revert `.env.local` back to `file:./local.db` for local dev.

### Step 4: Setup Auto-Fetching (Cron Job)

Vercel Serverless Functions do not run background processes. To automatically fetch news:

1. Go to [cron-job.org](https://cron-job.org) (Free)
2. Create a new Cronjob:
   - URL: `https://your-vercel-domain.vercel.app/api/cron`
   - Schedule: **Every 30 minutes**
   - If you set a `CRON_SECRET`, add an HTTP Header: `Authorization: Bearer YOUR_CRON_SECRET`
3. Save. Now news will automatically update every 30 minutes!

---

## Admin Panel

Access: `https://your-domain.com/admin`

Login with your `ADMIN_SECRET`.

Features:
- Dashboard with stats
- Manage sources (add/edit/delete/test)
- View all articles
- View fetch logs

---

## Scripts Reference

```bash
npm run dev              # Start Next.js dev server
npm run build            # Build Next.js for production
npm run start            # Start production server
npm run lint             # Lint code
npm run db:migrate       # Apply database migrations to Turso/SQLite
```

---

## Popular Vietnamese RSS Feeds

| Source | RSS URL |
|--------|---------|
| VnExpress | `https://vnexpress.net/rss/tin-moi-nhat.rss` |
| VnExpress Tech | `https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss` |
| BBC Tiếng Việt | `https://feeds.bbci.co.uk/vietnamese/rss.xml` |
| Tuổi Trẻ | `https://tuoitre.vn/rss/tin-moi-nhat.rss` |

## Free Tier Limits

- **Vercel Hobby**: 100GB Bandwidth, unlimited requests, great for personal use.
- **Turso Free**: 9GB Storage, 1 Billion reads/month, 25 Million writes/month.
- **cron-job.org**: 100% Free.

Combined, this stack will handle tens of thousands of articles and readers per month at **$0 cost**.
