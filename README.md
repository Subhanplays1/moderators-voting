# MODERATORS — Instagram Story Poll Management Platform

A private, enterprise-grade team platform for analyzing Instagram Story polls, coordinating verified account participation, detecting poll questions, and monitoring live campaign telemetry without relying on brittle private APIs or unauthorized credentials.

---

## 1. Product Overview

**MODERATORS** is designed for social media operations, digital marketing agencies, and campaign moderation teams who need to orchestrate and audit Instagram Story poll workflows at scale.

### Key Highlights
- **Zero-Tolerance Anti-Abuse Compliance**: Never extracts session cookies, never saves raw passwords, and isolates all provider operations behind an abstract `InstagramProvider` bridge.
- **Provider Pattern**: Toggle between a high-fidelity development `mock` provider and official Graph API `production` integrations via environment variables (`INSTAGRAM_PROVIDER=mock`).
- **Real-Time Telemetry**: WebSockets (`@fastify/websocket`) provide live per-account progress updates and event feeds without requiring dashboard refreshes.
- **Role-Based Access Control (RBAC)**: Support for `OWNER`, `ADMIN`, `MODERATOR`, and `VIEWER` roles across isolated multi-tenant workspaces.
- **Futuristic Dark Aesthetic**: Styled with Tailwind CSS, custom glassmorphism surfaces, subtle borders, and accessible Radix UI primitives.

---

## 2. Tech Stack

### Frontend (`apps/web`)
- **React 19** + **Vite 6** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** primitives (Radix UI)
- **TanStack Query v5** (React Query)
- **React Router v7**
- **Motion (Framer Motion v12)**
- **Lucide Icons**
- **Axios** with automatic 401 session redirection

### Backend (`apps/api`)
- **Node.js** + **TypeScript**
- **Fastify 5** REST API
- **@fastify/websocket** for real-time campaign broadcasting
- **Zod** + **fastify-type-provider-zod** for end-to-end request/response validation
- **Argon2id** password hashing (OWASP recommended memory-hard hashing)
- **AES-256-GCM** hardware-friendly encryption for stored authentication tokens

### Database (`packages/database`)
- **PostgreSQL**
- **Prisma ORM 6**
- 11 Models: `User`, `Workspace`, `WorkspaceMember`, `InstagramAccount`, `Story`, `Poll`, `VotingSession`, `VotingSessionAccount`, `ActivityLog`, `Invitation`, `AuthenticationRecord`

---

## 3. Architecture & Monorepo Structure

```text
moderators/
├── apps/
│   ├── web/                     # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/      # UI components & shadcn/ui primitives
│   │   │   ├── hooks/           # useAuth, useWebSocket, etc.
│   │   │   ├── layouts/         # AppLayout (Sidebar + Shell), AuthLayout
│   │   │   ├── lib/             # Axios API client, WebSocket client
│   │   │   ├── pages/           # Dashboard, Accounts, Analyzer, Sessions, Team, Logs, etc.
│   │   │   └── routes/          # Protected client routing table
│   │   └── vite.config.ts
│   │
│   └── api/                     # Fastify backend API
│       ├── src/
│       │   ├── config/          # Environment configuration & RBAC permissions
│       │   ├── middleware/      # Auth (JWT cookie), Workspace tenant check, Error handler
│       │   ├── modules/         # Auth, Accounts, Stories, Sessions, Team, Logs, Analytics
│       │   ├── providers/       # InstagramProvider interface, Mock, and Production stub
│       │   ├── services/        # Activity audit logging, AES-256 token encryption
│       │   ├── websocket/       # WebSocket workspace manager and connection multiplexer
│       │   └── server.ts        # Server entrypoint
│
├── packages/
│   ├── database/                # Prisma schema, client singleton, and seed logic
│   └── shared/                  # Common TypeScript types, constants, and Zod schemas
│
├── turbo.json                   # Turborepo task pipeline
├── pnpm-workspace.yaml          # Monorepo workspace configuration
└── .env.example                 # Environment variables specification
```

---

## 4. Getting Started

### Prerequisites
- **Node.js**: v20.9.0 or higher
- **pnpm**: v9.x or **npm**
- **PostgreSQL**: Local instance or cloud database (Neon, Supabase, Railway)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository_url>
cd moderators

# Install dependencies across all packages and apps
pnpm install
# or: npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root and configure your values:
```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: Random 32+ character string.
- `ENCRYPTION_KEY`: 32-byte hex key for encrypting stored integration tokens.
- `INSTAGRAM_PROVIDER`: Set to `mock` for local development.

### 3. Database Generation & Migration
```bash
# Generate Prisma Client
pnpm run db:generate

# Push schema to PostgreSQL or run migrations
pnpm run db:migrate
# or: pnpm run db:push

# (Optional) Seed with default admin and demo records
pnpm run db:seed
```

> **Default Seed Credentials**:
> - Email: `admin@moderators.dev`
> - Default Workspace: `Default Workspace` (slug: `default`)

### 4. Run Development Servers
```bash
# Starts both Backend (Port 3001) and Frontend (Port 5173) concurrently
pnpm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **WebSocket Gateway**: `ws://localhost:3001/ws`

---

## 5. Core Platform Workflows

### 1. Instagram Story Analysis
1. Navigate to `/analyzer`.
2. Paste an Instagram Story URL (e.g. `https://www.instagram.com/stories/username/12345/`).
3. The platform calls the `InstagramProvider.analyzeStory()` endpoint to detect if a poll sticker exists, extract the question, and list all voting options.
4. If automated detection is inconclusive, a manual entry fallback is immediately available.

### 2. Campaign Voting Sessions
1. After detecting or confirming the poll, select the target option (e.g., Option A vs Option B).
2. Click **Create Voting Session**.
3. In `/sessions`, start the session. Background worker tasks simulate real-time account verification and progress updates, streaming completions, errors, and progress bars over WebSockets.

### 3. Bulk Account Import
1. Navigate to `/accounts` and click **Bulk Import**.
2. Paste account handles or upload a `.csv` / `.txt` file.
3. Accounts enter the `PENDING AUTHORIZATION` state, ensuring zero raw credentials or unofficial logins are handled.

---

## 6. Deployment Guide

### Frontend (Vercel / Cloudflare Pages)
- Root directory: `apps/web`
- Build command: `pnpm run build`
- Output directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: Points to your deployed API URL.

### Backend (Railway / Render / Fly.io / VPS)
- Root directory: `apps/api`
- Build command: `pnpm run build`
- Start command: `node dist/server.js`
- Set all production environment variables from `.env.example`.

---

## 7. Security & Compliance Notes

1. **No Scraping or Reverse-Engineering**: The platform strictly conforms to modern security standards by isolating external provider calls. No unofficial private endpoints or anti-bot bypassing mechanisms are included.
2. **Token Security at Rest**: Integration tokens are encrypted using AES-256-GCM. Decryption keys are stored strictly in server-side environment variables and are never transmitted to clients.
3. **Audit Trails**: Every administrative action, member invite, session execution, and account status shift is automatically recorded in the `ActivityLog` table.
