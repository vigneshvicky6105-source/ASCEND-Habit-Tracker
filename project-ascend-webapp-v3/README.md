# PROJECT ASCEND

Offline-first personal productivity web app.

## Current architecture

- React + Vite
- Responsive desktop/mobile UI
- Local browser persistence via localStorage
- PWA service worker shell caching
- Editable main quests
- Daily quest completion
- Reading tracker
- Wishlist
- Analytics
- Supabase-ready Google OAuth + PostgreSQL schema

## Run locally

```bash
npm install
npm run dev
```

## Enable Google login + cloud sync

1. Create a Supabase project.
2. Run `supabase.sql` in the Supabase SQL editor.
3. In Supabase Auth → Providers → Google, enable Google.
4. Add your site URL and redirect URL in Supabase Auth settings.
5. Copy `.env.example` to `.env` and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. `npm run build`
7. Deploy to Vercel.

## Important next implementation step

The UI already supports local/offline state. The next pass should add the Supabase repository layer so authenticated users sync tasks, completions, books and wishlist between devices. The database schema and RLS policies are included.


## Task locking

Every quest has an independent lock.

- 🔓 Unlocked: rename, change target, and delete.
- 🔒 Locked: protected from accidental editing/deletion.
- Completion remains available even while locked.
- Lock state is stored with the task and is ready for cloud synchronization.
