<div align="center">
  <img src="public/logo.png" alt="Sadbhawana Publication Emblem" width="160" height="160" style="border-radius: 50%; border: 3px solid #f59e0b; margin-bottom: 12px;" />
  <h1 style="font-size: 2.2rem; font-weight: 800;">SADBHAWANA PUBLICATION</h1>
  <p style="font-size: 1.1rem; color: #64748b; font-weight: 600;">Enterprise Author & Book Management Portal</p>
  
  <p align="center">
    <strong>Crafted & Developed with ❤️ by <a href="https://github.com/thekrishna7">@krishnaaa.builds</a></strong>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-15.1.6-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/Nodemailer-SMTP-EA4335?style=for-the-badge&logo=gmail" alt="Nodemailer" />
  </p>
</div>

---

## 📖 Overview

**Sadbhawana Publication Author's Dashboard & Management System** is a modern, full-stack enterprise publishing platform designed to streamline book cataloging, author assignments, manuscript file versioning, review approvals, and real-time communications between **Publishing Administrators** and **Authors**.

Built with state-of-the-art web technologies (**Next.js 15**, **TypeScript**, **Prisma ORM**, **Supabase PostgreSQL**, **Tailwind CSS**, and **Nodemailer SMTP**), this application delivers an ultra-smooth, high-performance experience with glassmorphism UI aesthetics, dark/light themes, instant session caching, and live notifications.

---

## 🌟 Key Platform Capabilities

### 🔐 1. Security & Role-Based Control (RBAC)
- **Zero Public Registration**: Per enterprise publishing policy, public registration is strictly disabled. Accounts are created and issued exclusively by Administrators.
- **Dual Login Support**: Login via Email (`Sadbhawanapublication@gmail.com`) or Username (`admin`).
- **Protected Sessions**: Secure JWT session cookies with 7-day persistence, password hashing via `bcryptjs`, and Next.js middleware route guards (`/admin/*` and `/author/*`).
- **Profile Avatar System**: Direct image file uploader (`public/uploads/avatars/`) to avoid session cookie payload limits.

---

### 👑 2. Administrative Console (`/admin`)
- **Executive Analytics Dashboard**:
  - Real-time stat cards (Total Books, Total Authors, Pending Reviews, Approved Files, Storage Used).
  - Interactive Recharts analytics for upload trends and status breakdowns.
  - Live activity audit log feed and notification logs.
- **Book Catalog Management**:
  - Full CRUD operations with ISBN validation, language, edition, paperback/hardcover classification, and status tracking.
  - Multi-author assignment with real-time author portal sync.
- **Author Account Center**:
  - Create and manage author accounts, issue credentials, reset passwords, and toggle active/inactive account status.
- **2-Step Upload & Review Center**:
  - **Step 1**: Interactive grid displaying all catalog books.
  - **Step 2**: Selecting a book opens its dedicated file uploader and Received/Sent files tabs.
  - **Review Actions**: Approve manuscripts (with celebratory confetti) or Request Changes (with revision feedback comments).
- **Dedicated File History (`/admin/history`)**:
  - Filterable audit view of all Received Files, Sent Files, and complete Version Iterations (`v1`, `v2`, `v3`...).

---

### ✍️ 3. Author Workspace (`/author`)
- **Personalized Dashboard**:
  - Summary of assigned books, pending review items, and quick action cards.
- **Interactive 2-Step File Upload**:
  - **Step 1**: Display grid of assigned books.
  - **Step 2**: Upload files specifically assigned to the selected book with **10MB size limit validation** and support for formats (`PDF`, `DOCX`, `PNG`, `JPG`, `PSD`, `AI`, `INDD`, `ZIP`, `RAR`, `XLSX`).
  - File categorization (Manuscript, Cover Design, ISBN Page, Index, Certificate, Interior PDF, Source Files).
- **Dedicated File History (`/author/history`)**:
  - Track all sent manuscripts, received feedback from admin, and version iteration history.
- **Realtime Notification Center (`/author/notifications`)**:
  - Live notification alerts with auto-mark-as-read on click, real-time unread badge counter decrement (`10` ➔ `9`), single item deletion, and bulk clear options.

---

## 🔑 Administrative Access Setup

Administrators access the system via the secure `/login` portal using credentials issued in environment configuration or initialized via the database seed script.

---

## 🛠️ Technology Stack

| Component | Technology Used |
| :--- | :--- |
| **Frontend Framework** | [Next.js 15.1.6](https://nextjs.org/) (App Router, React 19) |
| **Language** | [TypeScript 5.0](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS 3.4](https://tailwindcss.com/), Lucide Icons, Canvas Confetti |
| **Theme System** | Dark & Light mode via `next-themes` |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io/) + [Supabase PostgreSQL](https://supabase.com/) |
| **Authentication** | JWT Cookies (`jose`), `bcryptjs` password hashing |
| **Email Service** | [Nodemailer](https://nodemailer.com/) + Gmail SMTP Service |
| **Analytics Charts** | [Recharts](https://recharts.org/) |

---

## 📂 Project Architecture

```
├── public/
│   ├── logo.png                # Official Sadbhawana Publication Emblem Logo
│   └── uploads/                # File uploads & profile avatar storage
├── prisma/
│   ├── schema.prisma           # Complete PostgreSQL Prisma Database Schema
│   └── seed.ts                 # Clean production database reset & seed script
├── src/
│   ├── app/
│   │   ├── admin/              # Admin Portal (Dashboard, Books, Authors, Uploads, History, Settings)
│   │   ├── author/             # Author Workspace (Dashboard, Books, Upload, History, Notifications)
│   │   ├── api/                # REST API Routes (Auth, Books, Authors, Files, Profile, Notifications)
│   │   ├── login/              # Secure Authentication Login Page
│   │   ├── globals.css         # Tailwind Design System & Theme Directives
│   │   └── layout.tsx          # Root Layout & Metadata Configuration
│   ├── components/             # Reusable UI Components (ThemeToggle, ToastContext, Modals)
│   └── lib/                    # Core Libraries (Prisma db client, JWT Auth, Nodemailer, Supabase)
└── .env                        # Environment Configuration (Keep Secret!)
```

---

## 🚀 Quick Setup & Installation

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/thekrishna7/Sadbhawana-Author-Dashbaord.git
cd Sadbhawana-Author-Dashbaord
npm install
```

### 2. Configure Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
DATABASE_URL="your_postgresql_database_url"
JWT_SECRET="your_secure_jwt_secret_key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email Notification Configuration
ADMIN_EMAIL="admin@yourdomain.com"
SMTP_USER="your_smtp_email@gmail.com"
SMTP_PASS="your_16_digit_app_password"
SMTP_FROM="Sadbhawana Publication <your_smtp_email@gmail.com>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
```

### 3. Initialize Database & Seed Admin
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run Local Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📜 License

Distributed under the **MIT License**. Copyright © 2026 **Sadbhawana Publication**. All rights reserved.

---

<div align="center">
  <p><strong>Designed & Developed with Passion by <a href="https://github.com/thekrishna7">@krishnaaa.builds</a></strong></p>
  <p><em>Building modern, high-performance digital experiences.</em></p>
</div>
