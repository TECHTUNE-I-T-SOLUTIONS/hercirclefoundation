# HerCircle Foundation — Website

This repository contains the Next.js (App Router) website for HerCircle Foundation. It includes an admin UI for uploading gallery items and a public site to view photos and videos. The project uses Supabase for database and storage, and pnpm for package management.

## Features
- Next.js App Router with server and client components
- Admin panel with server-side actions for secure writes (service-role key stays server-side)
- Multi-file gallery uploads with support for Google Drive links and proxied external media
- Public gallery with lightbox viewer supporting images and hosted video playback
- Supabase integration for authentication, database, and storage

## Local development

Prerequisites:
- Node.js (18+ recommended)
- pnpm
- A Supabase project (for full admin features)

1. Install dependencies

```bash
pnpm install
```

2. Create a `.env.local` with your environment variables (example keys):

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

3. Run locally

```bash
pnpm dev
```

4. Build (production)

```bash
pnpm build
pnpm start
```

## CI / GitHub Actions
This repo includes a GitHub Actions workflow that runs `pnpm install` and `pnpm build` on pushes to the `main` branch. It uses Node.js 18 and caches pnpm store for faster runs.

## Contributing
- Create a branch for your feature or fix: `git checkout -b feat/your-feature`
- Open a pull request targeting `main`

## License
Add your license here (e.g., MIT) or change as needed.

---
Generated and maintained by the HerCircle Foundation development team.
