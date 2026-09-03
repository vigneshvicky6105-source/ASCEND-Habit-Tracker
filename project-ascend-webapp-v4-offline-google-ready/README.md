# Project Ascend — Personal Productivity OS

**🌐 Live Production App**: [https://project-ascend-webapp-v4-offline-go.vercel.app/](https://project-ascend-webapp-v4-offline-go.vercel.app/)

Project Ascend is your offline-first personal productivity operating system designed for laptop and mobile (installable PWA). It manages daily main quests, core learning concepts, reading progress, wishlist rewards, real performance analytics, and cloud synchronization with Supabase PostgreSQL and Google OAuth.

---

## 🚀 Quick Start (Run Locally)

Open your terminal in the project directory and run:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Start local development server
npm run dev
```

Then open your browser to `http://localhost:5173`.

To build the production bundle:
```bash
npm run build
```

---

## ⚡ Features Implemented

1. **Offline-First & Data Isolation**
   - IndexedDB stores all data locally on your device.
   - Data is scoped per account (`guest` mode when offline/unauthenticated, or `user_id` when signed in via Google OAuth).
   - Switching users instantly loads the correct isolated dataset without data leakage.

2. **Main Quests & Lock System 🔒/🔓**
   - 12 pre-configured starter quests (LeetCode, Check Mail, Job Applications, Reading, Python, Water, Running, etc.).
   - Quests can be unlocked 🔓 or locked 🔒.
   - **Locked Quests**: Protected against accidental editing, deletion, or reordering, but **CAN still be completed daily on the Dashboard**.

3. **EDIT QUESTS Page**
   - Explicitly named **"EDIT QUESTS"**.
   - Strictly reserved for task management: Add quest, Edit title/category/target/XP, Lock/Unlock toggle 🔒/🔓, Delete, and Reorder (Up/Down).
   - **NO daily completion checkboxes on this page** (daily completion is strictly on the Dashboard).

4. **Core Concepts Manager**
   - Track daily learning focus areas (Python, SQL, AI/ML/DL, Excel, Web Development).
   - Fully editable & customizable (Add/Edit/Delete concepts).

5. **Daily Dashboard**
   - Today's date & animated completion ring percentage.
   - Streak counters (Current & Best Streak).
   - XP earned today & Level progression bar (Level 1, 2, 3...).
   - Quick "+10 Pages" reading logger.

6. **Real Analytics & History**
   - 90-Day GitHub-style Completion Heatmap.
   - 14-Day Completion Rate trend chart.
   - Category performance breakdown pie chart.
   - Accumulated XP tracker.

7. **Reading Command Center**
   - Manage books (Title, Author, Total Pages, Current Page, Status, Notes).
   - Integrated "+10 Pages Logged Today" button that auto-completes the "Read 10 Pages" quest.

8. **Wishlist ("Things to Buy")**
   - Goal-based reward system with item name, cost (₹), category, priority (High/Medium/Low), notes, and purchase toggle.

9. **PWA & Mobile Ready**
   - Installable PWA with Service Worker (`sw.js`) and Web Manifest.
   - Responsive touch-friendly mobile interface.

---

## 🔑 Supabase Setup Steps

1. Go to [Supabase](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, open the **SQL Editor**.
3. Copy the entire contents of [`supabase.sql`](file:///d:/Tracker/project-ascend-webapp-v4-offline-google-ready/supabase.sql) and paste it into the editor, then click **RUN**.
4. Configure **Google OAuth**:
   - Go to **Authentication -> Providers -> Google**.
   - Enable Google provider.
   - Go to [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID, and paste the Client ID & Secret into Supabase.
   - Set the Redirect URI in Google Cloud Console to: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`.

---

## 🌐 Vercel Deployment Steps

1. Push this project repository to GitHub / GitLab / Bitbucket.
2. Go to [Vercel](https://vercel.com) and click **Add New -> Project**.
3. Import your Project Ascend repository.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://your-project-ref.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-public-key`
5. Click **Deploy**. Vercel will build and host your PWA!
