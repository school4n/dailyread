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
- 🚀 Cloudflare Workers + D1 backend
- ⚡ Near-zero cost deployment

## Architecture

```
Frontend (Next.js on Cloudflare Pages)
    ↓
API (Cloudflare Worker)
    ↓
Database (Cloudflare D1 - SQLite)
    ↑
Cron Trigger → RSS Collector
```

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Scheduler**: Cloudflare Cron Triggers
- **Deploy**: Cloudflare Pages + Workers

---

## Quick Start (Development)

### 1. Clone & Install

```bash
git clone <your-repo>
cd dailyread
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

### 3. Start Worker (Terminal 1)

```bash
# Install Wrangler globally if not installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create dailyread

# Copy the database_id from output and update wrangler.toml

# Apply database schema
wrangler d1 execute dailyread --local --file=db/schema.sql

# Seed initial data
wrangler d1 execute dailyread --local --file=db/migrations/0001_init.sql

# Start Worker dev server
npm run worker:dev
```

### 4. Start Frontend (Terminal 2)

```bash
npm run dev
```

Open http://localhost:3000

---

## Production Deployment

### Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com
2. Create free account
3. Install Wrangler: `npm install -g wrangler`
4. Login: `wrangler login`

### Step 2: Create D1 Database

```bash
wrangler d1 create dailyread
```

Copy the `database_id` from output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "dailyread"
database_id = "YOUR_DATABASE_ID_HERE"
```

### Step 3: Apply Database Schema

```bash
# Apply to production D1
wrangler d1 execute dailyread --file=db/schema.sql
wrangler d1 execute dailyread --file=db/migrations/0001_init.sql
```

### Step 4: Set Admin Secret

```bash
wrangler secret put ADMIN_SECRET
# Enter your admin password when prompted
```

### Step 5: Deploy Worker

```bash
npm run deploy:worker
```

Note the Worker URL: `https://dailyread-worker.YOUR_SUBDOMAIN.workers.dev`

### Step 6: Configure Frontend

Create `.env.production.local`:

```env
NEXT_PUBLIC_API_URL=https://dailyread-worker.YOUR_SUBDOMAIN.workers.dev/api
API_URL=https://dailyread-worker.YOUR_SUBDOMAIN.workers.dev/api
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Step 7: Deploy Frontend to Cloudflare Pages

**Option A: GitHub (Recommended)**

1. Push code to GitHub
2. Go to Cloudflare Dashboard → Pages
3. Create new project → Connect to GitHub
4. Select your repository
5. Build settings:
   - Framework preset: Next.js
   - Build command: `npm run build`
   - Build output: `.next`
6. Add environment variables from Step 6
7. Deploy!

**Option B: Direct Deploy**

```bash
npm run build
wrangler pages deploy .next --project-name dailyread
```

### Step 8: Custom Domain (Optional)

1. Cloudflare Dashboard → Pages → Your project → Custom domains
2. Add your domain
3. Update DNS to Cloudflare nameservers
4. SSL/TLS is automatic

### Step 9: Verify Cron

1. Cloudflare Dashboard → Workers → dailyread-worker
2. Triggers tab → Cron Triggers
3. Should show: `*/30 * * * *`

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
npm run test             # Run tests
npm run worker:dev       # Start Cloudflare Worker dev server
npm run deploy:worker    # Deploy Worker to Cloudflare
npm run db:migrate       # Apply database migrations
npm run db:seed          # Seed initial data
```

---

## Adding News Sources

### Via Admin UI

1. Go to `/admin/sources`
2. Click "Thêm nguồn"
3. Fill in:
   - **Name**: Source display name
   - **Website URL**: Main website
   - **RSS Feed URL**: RSS/Atom feed URL
   - **Category**: Select category
   - **Fetch interval**: How often to fetch (minutes)
4. Click "Test" to validate the feed
5. Save

### Popular Vietnamese RSS Feeds

| Source | RSS URL |
|--------|---------|
| VnExpress | `https://vnexpress.net/rss/tin-moi-nhat.rss` |
| VnExpress Tech | `https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss` |
| BBC Tiếng Việt | `https://feeds.bbci.co.uk/vietnamese/rss.xml` |
| Tuổi Trẻ | `https://tuoitre.vn/rss/tin-moi-nhat.rss` |

### Popular Tech RSS Feeds

| Source | RSS URL |
|--------|---------|
| Hacker News | `https://hnrss.org/frontpage` |
| TechCrunch | `https://techcrunch.com/feed/` |
| The Verge | `https://www.theverge.com/rss/index.xml` |
| NASA | `https://www.nasa.gov/feed/` |

---

## Cloudflare Free Tier Limits

| Resource | Free Limit | Usage Estimate |
|----------|-----------|----------------|
| Workers requests | 100,000/day | ~100 users = safe |
| D1 reads | 5 million/day | Very safe |
| D1 writes | 100,000/day | ~1000 articles/fetch |
| D1 storage | 5 GB | ~50M articles |
| Pages bandwidth | Unlimited | ✅ |
| Cron triggers | Unlimited | ✅ |

---

## Privacy & Legal

- No user tracking
- No analytics (unless you add it)
- Bookmark/history stored locally in browser
- Article content: Only title, excerpt, thumbnail from RSS
- Full content only if RSS provides it
- Always links back to original source
- Respects robots.txt and HTTP caching headers

---

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run `npm run lint && npm test`
5. Submit PR

---

## License

MIT
