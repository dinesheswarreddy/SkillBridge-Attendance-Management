# SkillBridge – Attendance Management System

A deployed, end-to-end attendance management system for the fictional SkillBridge state-level skilling programme. Supports five user roles with distinct responsibilities and access levels.

---

## Live URLs

| Service    | URL                                           |
|------------|-----------------------------------------------|
| Frontend   | `https://skillbridge.vercel.app` *(update)*   |
| Backend    | `https://skillbridge-api.railway.app` *(update)* |
| API Base   | `https://skillbridge-api.railway.app/api`     |
| Health     | `https://skillbridge-api.railway.app/health`  |

---

## Test Accounts

All accounts use the same password for ease of testing: `SkillBridge@2024`

| Role                | Email                              | Password            |
|---------------------|------------------------------------|---------------------|
| Student             | student@skillbridge.test           | SkillBridge@2024    |
| Trainer             | trainer@skillbridge.test           | SkillBridge@2024    |
| Institution Admin   | institution@skillbridge.test       | SkillBridge@2024    |
| Programme Manager   | manager@skillbridge.test           | SkillBridge@2024    |
| Monitoring Officer  | officer@skillbridge.test           | SkillBridge@2024    |

> Create these accounts in Clerk dashboard after deploying, then sign in via the app and select the appropriate role.

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Clerk account (free): https://clerk.com
- A Neon account (free PostgreSQL): https://neon.tech

### 1. Clone and install

```bash
git clone <your-repo>
cd skillbridge

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://..."   # from Neon console
CLERK_SECRET_KEY="sk_test_..."    # from Clerk dashboard
CLERK_WEBHOOK_SECRET="whsec_..."  # from Clerk webhooks (optional for local)
FRONTEND_URL="http://localhost:5173"
PORT=5000
NODE_ENV=development
```

### 3. Set up the database

```bash
cd backend
npx prisma generate
npx prisma db push   # pushes schema to Neon, no migration files
```

### 4. Configure frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."   # from Clerk dashboard
VITE_API_URL="http://localhost:5000"
```

### 5. Run both servers

```bash
# Terminal 1 – backend
cd backend && npm run dev

# Terminal 2 – frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000/health

---

## Deployment

### Backend (Railway)

1. Push `backend/` to a GitHub repo
2. Create new project on [Railway](https://railway.app)
3. Connect your GitHub repo, set root directory to `backend`
4. Add all environment variables from `.env.example` in Railway dashboard
5. Add a build command: `npm install && npx prisma generate && npx prisma db push`
6. Railway auto-detects `npm start` as start command

### Frontend (Vercel)

1. Push `frontend/` to a GitHub repo (or same repo, different directory)
2. Import project on [Vercel](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_URL` → your Railway backend URL
5. Vercel auto-deploys on push

### Clerk Webhooks (for user sync)

1. Go to Clerk Dashboard → Webhooks → Add Endpoint
2. URL: `https://your-railway-url.railway.app/api/webhooks/clerk`
3. Events to subscribe: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret to `CLERK_WEBHOOK_SECRET` in Railway env vars

---

## Schema Decisions

### Why a separate `users` table instead of relying only on Clerk?

Clerk handles authentication but we need to store application-specific data (role, institutionId, relationships) in our own database. The `clerkUserId` column links the two systems. On first sign-in, the frontend calls `POST /api/users/sync` to create the user record with their chosen role.

### Role assignment flow

Role is chosen by the user on their first sign-in via a role selector screen. It's then stored in our database and verified server-side on every API call. The frontend only shows role-appropriate UI, but the backend enforces access independently — a student cannot mark another student's attendance even if they craft a direct API call.

### Invite codes on the Batch model

Rather than a separate `invite_links` table, the invite code is stored directly on `Batch` as a nullable string. `POST /batches/:id/invite` generates a new code (using `nanoid`) and overwrites the previous one. This means invite codes are effectively "reusable but regeneratable". The tradeoff is you can only have one active code per batch at a time — acceptable for this scope.

### `batch_trainers` as many-to-many

A batch can have multiple trainers, and a trainer can manage multiple batches. The junction table `batch_trainers` with a composite primary key `(batch_id, trainer_id)` captures this correctly.

### Sessions store time as string

`start_time` and `end_time` are stored as `String` (e.g., `"09:00"`) rather than full timestamps. This is intentional: session time is a recurring schedule slot, not a UTC moment. The `date` field is a `@db.Date` (date only, no time).

### Attendance is an upsert

A student can update their attendance status (e.g., from LATE to PRESENT) via a re-submit — the backend uses `upsert` with a `(session_id, student_id)` unique constraint. This is realistic (a student might tap late and then get marked present by a trainer system).

---

## Stack Choices

| Layer     | Choice           | Why |
|-----------|-----------------|-----|
| Frontend  | Vite + React + TypeScript | Fast dev server, excellent DX, wide ecosystem |
| Styling   | Tailwind CSS     | Utility-first, zero runtime, fast to iterate with plain class names |
| Routing   | React Router v6 | Standard, well-documented, nested routes |
| Auth      | Clerk            | Assignment requirement; handles sign-up/sign-in, JWT, email verification out of the box |
| Backend   | Express + Node.js | Familiar, minimal boilerplate, fast to iterate |
| ORM       | Prisma           | Type-safe queries, excellent schema migration tooling, great Neon compatibility |
| Database  | Neon (PostgreSQL) | Assignment requirement; serverless Postgres with generous free tier |
| Deployment | Railway (API) + Vercel (frontend) | Both have free tiers, Railway supports Node apps natively, Vercel is purpose-built for React |

Divergences from the assignment's suggestions:
- Used **Express** instead of a more opinionated framework (e.g., NestJS) — faster to scaffold for this scope
- Chose **Prisma** over raw SQL — the type safety and migration workflow saves debugging time, especially under a 3-day window

---

## What Works / What's Partial / What's Skipped

### Fully working
- All five role sign-ups and logins via Clerk
- Role-based routing (each user lands on their own dashboard)
- Role-based API middleware (403 if wrong role attempts any endpoint)
- Student: view sessions for enrolled batches, self-mark attendance (PRESENT / LATE)
- Trainer: create sessions, generate batch invite links, view full session attendance
- Institution: view all batches and trainers, view per-batch attendance summary
- Programme Manager: view programme-wide summary, create institutions
- Monitoring Officer: read-only programme summary view (no create/edit/delete actions)
- Batch invite flow: Trainer generates link → Student opens link → Student joins batch

### Partially done
- Institution admin cannot directly create batches in the UI (API supports it, but no "Create Batch" button in the Institution dashboard). Batches are created by Trainers or seeded directly.
- No trainer-to-institution assignment UI — this must be done via API or database directly after creating an institution.
- Clerk webhook sync is implemented but optional for local dev (the `/users/sync` fallback covers sign-up without webhooks).

### Skipped
- Email notifications (e.g., session reminders)
- Pagination on long lists
- Real-time attendance updates (would use WebSockets or polling)
- Trainer batch creation via UI (only Institutions can currently create batches in UI)
- Admin role to manage all users

---

## One Thing I'd Do Differently With More Time

I'd move role assignment into **Clerk's `publicMetadata`** using a webhook + Clerk backend API call, so the role is embedded in the JWT itself. Currently the backend fetches the user from the DB on every request to check their role. Embedding it in the token would allow stateless role verification without a DB lookup per request — better performance at scale and eliminates the "user exists in Clerk but not in DB" edge case that the `/users/sync` route currently papers over.

---

## Project Structure

```
skillbridge/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── index.js               # Express server entry
│   │   ├── lib/prisma.js          # Prisma singleton
│   │   ├── middleware/auth.js     # Clerk JWT verification + role guard
│   │   └── routes/
│   │       ├── users.js           # User sync, Clerk webhook, /me
│   │       ├── batches.js         # CRUD, invite links, join
│   │       ├── sessions.js        # Create sessions, attendance view
│   │       ├── attendance.js      # Student marks attendance
│   │       └── institutions.js    # Institution + programme summaries
│   ├── .env.example
│   ├── package.json
│   └── railway.json
│
└── frontend/
    ├── src/
    │   ├── main.tsx               # ClerkProvider + React root
    │   ├── App.tsx                # Routing + auth state
    │   ├── lib/
    │   │   ├── api.ts             # Axios instance
    │   │   └── utils.ts           # cn() for Tailwind
    │   ├── pages/
    │   │   ├── SelectRole.tsx     # Post-signup role picker
    │   │   ├── JoinBatch.tsx      # Invite link landing page
    │   │   ├── student/Dashboard.tsx
    │   │   ├── trainer/Dashboard.tsx
    │   │   ├── institution/Dashboard.tsx
    │   │   ├── manager/Dashboard.tsx
    │   │   └── officer/Dashboard.tsx
    │   └── components/
    │       ├── layouts/DashboardLayout.tsx
    │       └── shared/StatCard.tsx
    ├── .env.example
    ├── vercel.json
    └── package.json
```
