# Wedding invitation website

A responsive, long-scrolling React + Vite wedding invitation with Supabase-backed RSVP, guest wishes/ratings, and guest photo uploads.

## 1. Run locally

Install Node.js (LTS), then in this folder:

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite.

## 2. Connect Supabase

1. Create a project at https://supabase.com.
2. Open **Project Settings → API** and copy the Project URL and `anon` / publishable key.
3. Put them in `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

4. In Supabase **SQL Editor**, run all of `supabase/schema.sql`.
5. Restart the Vite server after editing `.env`.

Never put a Supabase `service_role` / secret key in this frontend project. The browser must use only the anon/publishable key; RLS policies protect the tables.

## 3. Moderate guest content

Guest RSVPs are private and visible to the project owner in Supabase Table Editor → `wedding_rsvps`.

Guest wishes and photos are inserted with `approved = false`. Review them in Table Editor and change `approved` to `true` to publish them on the public page. Do not approve content without checking it. The public photo bucket means approved image URLs are publicly viewable; do not upload private or sensitive images.

## 4. Personalize the invitation

Edit `src/config.js`:
- `bride`, `groom`
- `date` (ISO date/time with correct local offset), `dateLabel`
- event names, dates, times and venues
- venue address and `mapQuery`
- sample gallery image URLs

Replace the two portrait image URLs in `src/App.jsx`, and the venue image URL, with your own hosted image URLs.

For background music, add a licensed MP3 you have permission to use at `public/music/wedding.mp3`. The music starts only after a guest taps the music toggle (browser autoplay rules).

## 5. Build and deploy

```bash
npm run build
```

Deploy the generated `dist/` folder to Vercel, Netlify, or another static hosting provider. Add the two `VITE_SUPABASE_*` environment variables in the hosting dashboard and redeploy.

## Security and production notes

- Do not expose the RSVP table with a public SELECT policy.
- Public submissions can be spammed. Before a public launch, add CAPTCHA/Turnstile or a server-side Edge Function with rate limiting and stricter validation.
- The included guest content workflow uses manual approval for wishes and photos. Consider image moderation, abuse reporting, retention rules, and a privacy notice before launch.
- A public Storage bucket is used so approved photos can display without signed URLs. Uploaded photos should be treated as public once their URL is shared.
- For a production event, consider adding a private admin dashboard or using the Supabase dashboard to moderate entries.
