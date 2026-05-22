# Publishing OS

Enterprise-grade AI-powered publishing operating system with real Supabase Auth, PostgreSQL, Realtime, and Storage.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **Supabase** — Auth, PostgreSQL, Realtime, Storage, RLS
- **Tailwind CSS 4** + **Framer Motion** + **Recharts**

## Roles

| Role | Login | Dashboard |
|------|-------|-----------|
| Super Admin | `/admin/login` | `/admin` |
| Staff | `/staff/login` | `/staff` |
| Author | `/author/login` | `/author` |

No public registration. HQ provisions all accounts.

## Setup

### 1. Environment

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wdppaupdvxrbgfwtngka.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service_role key — required for creating users>
SETUP_SECRET=<random string for one-time super admin bootstrap>
```

### 2. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Create Super Admin (first time only)

```bash
curl -X POST http://localhost:3000/api/setup/super-admin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@yourcompany.com\",\"password\":\"YourSecurePass123\",\"full_name\":\"HQ Admin\",\"setup_secret\":\"YOUR_SETUP_SECRET\"}"
```

Then sign in at **/admin/login**.

### 4. Provision authors & staff

In Mission Control → **Authors** or **Staff** → **New author/staff** (requires `SUPABASE_SERVICE_ROLE_KEY`).

## Features

- **Mission Control** — metrics, pipeline kanban, analytics
- **Author workspace** — profile, books, royalties, bank details (syncs realtime to admin)
- **Book workspace** — 10 tabs: overview, publishing journey, manuscripts (version history), covers, sales, royalties, messages, documents, timeline, settings
- **Manuscripts** — upload, approve/reject/revise, version tracking
- **Royalties** — balances, withdrawal requests, admin approve/paid + UTR
- **Realtime** — books, profiles, messages, sales, royalties, activity logs
- **RLS** — role-based access on all tables

## Database

Schema applied via Supabase migration `publishing_os_initial_schema`. Tables: `profiles`, `books`, `manuscripts`, `manuscript_versions`, `cover_designs`, `sales`, `author_royalties`, `withdrawal_requests`, `messages`, `documents`, `activity_logs`, and more.

## Production

```bash
npm run build
npm start
```

Deploy to Vercel and set the same environment variables.
