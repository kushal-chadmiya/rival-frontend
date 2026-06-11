# Rival Task Manager — Frontend

Next.js frontend for the Rival task management assessment. It provides authentication, a task dashboard, and real-time updates against the Go API in `../backend`.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, standalone output)
- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) + [Base UI](https://base-ui.com)
- [Lucide](https://lucide.dev) icons, [Sonner](https://sonner.emilkowal.ski) toasts

## Features

- Email/password sign-up and sign-in via the backend API
- Session persistence in `localStorage` with token refresh
- Task list with filtering, search, sorting, and pagination
- Create, edit, delete, and quick-complete tasks
- Task detail view with activity history and file attachments
- Server-sent events for live task updates across tabs
- Admin view toggle for users with the `admin` role
- Light/dark theme support

## Prerequisites

- Node.js 22+
- npm
- Running [backend API](../backend) (locally or via Docker)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Go API | `http://localhost:8080` |

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Docker

The frontend can be run with the full stack from the repository root:

```bash
cd ..
docker compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8080](http://localhost:8080)

The Docker image uses a multi-stage build (`deps` → `builder` → `runner`) and serves the Next.js standalone output. Set `NEXT_PUBLIC_API_URL` at build time via the `docker-compose.yml` build arg.

## Project Structure

```text
frontend/
├── app/                  # Next.js App Router pages and layout
├── components/
│   ├── tasks/            # Auth panel, dashboard, forms, detail views
│   └── ui/               # shadcn/ui primitives
├── hooks/
│   ├── use-auth.ts       # Auth state, sign-in/out, session restore
│   └── use-task-events.ts# SSE subscription for live task updates
├── lib/
│   ├── api.ts            # Task and attachment API client
│   ├── auth-api.ts       # Auth API client
│   ├── auth-session.ts   # localStorage session helpers
│   └── types.ts          # Shared TypeScript types
├── Dockerfile
└── next.config.ts        # Standalone output enabled
```

## API Integration

All requests go to `NEXT_PUBLIC_API_URL`. The access token from login is sent as a `Bearer` header on protected routes.

**Auth**

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

**Tasks**

- `GET /tasks` — supports `status`, `search`, `sort_by`, `sort_dir`, `page`, `page_size`
- `POST /tasks`
- `GET /tasks/{id}`
- `PATCH /tasks/{id}`
- `DELETE /tasks/{id}`
- `GET /tasks/events` — SSE stream for live updates
- `GET /tasks/{id}/activity`
- `GET|POST|DELETE /tasks/{id}/attachments`

## Full-Stack Setup

For Supabase configuration, database schema, backend setup, and API details, see the [root README](../README.md).
