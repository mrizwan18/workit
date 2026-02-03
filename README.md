# Before Work

Minimal PWA: daily workout check-in, streak, zero friction. No calorie tracking, no social, no fancy analytics.

<img width="1508" height="770" alt="image" src="https://github.com/user-attachments/assets/db7ca038-5b6a-4725-a014-5dd716fe85f0" />
<img width="1511" height="768" alt="image" src="https://github.com/user-attachments/assets/15bd9548-dc5d-4f2f-a556-df9945cf3ac3" />
<img width="1508" height="767" alt="image" src="https://github.com/user-attachments/assets/d47f7a1b-c8fc-46d6-9e10-04da2b98b6e0" />



## What it does

- **Home**: Today’s date, workout status (Not logged / Completed), “Log Workout” button, streak counter. Optional “Streak at risk” warning.
- **Checklist**: Warm-up, Main lifts, Accessories, Stretch. Tick any 2 → counts as a workout. Only today is editable.
- **History**: Calendar view. Green = workout, gray = missed. No editing past days.

## Rules (enforcement)

- Can’t log yesterday or future days.
- Can’t log twice for the same day.
- “Low-energy mode” allowed (checklist with min 2 items).
- No skipping two days in a row → visual “Streak at risk” when applicable.

## Notifications (copy)

- **10:40** – “Workout = commute. Start now.”
- **11:45** – “Log your workout before work starts.”
- **12:15** – “Streak at risk. 10 minutes still counts.”

Notifications run when the app has been open; for exact times without opening the app, add a small backend + Web Push later.

## Tech

- Next.js 14, React 18, Tailwind CSS
- PWA: `manifest.json`, service worker (`public/sw.js`)
- Storage: localStorage
- No backend required to start

## Workout music

The home page shows a daily “Workout vibe” track from a hardcoded list. Punjabi / Desi Hip Hop entries are from [Hot Hits Punjabi](https://open.spotify.com/playlist/37i9dQZF1DWXVJK4aT7pmk) and [Desi Hip Hop](https://open.spotify.com/playlist/37i9dQZF1DX2RahGIyQXcJ). Clicking opens the track in Spotify.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Install to home screen for PWA behavior.

## PWA: install and home screen

**Is it a PWA?** Yes. The app has a Web App Manifest (`public/manifest.json`), a service worker (`public/sw.js`), and is served over HTTPS in production. It can be **installed on a device** (Add to Home Screen on iOS/Android, or “Install” in Chrome/Edge).

**After install:** The app opens in standalone mode (no browser UI). Offline: the service worker caches the main routes so the app can load from cache when offline.

**Home-screen “widget”:**  
Standard PWAs do **not** support a true home-screen **widget** (live tile showing today’s workout status). “Add to Home Screen” adds an **icon** that opens the app; it does not show status or color on the home screen.  
To get a real widget (today’s status + color, tap to open app), you’d need a native wrapper (e.g. Capacitor/Cordova) and platform widgets (iOS WidgetKit, Android App Widgets), or future web APIs (e.g. Web Widget API when available).

**Desired widget UI (for reference):**
- **Content:** Today’s workout status only (e.g. “Completed” / “Not logged” / “Rest day”).
- **Color:** Green = completed, grey = not logged / rest day, red = danger / at risk.
- **Tap:** Opens the app (deep link to home).

## Notifications (workout reminders)

The app **can publish notifications** for workouts:

- **When:** Scheduled at **10:40**, **11:45**, and **12:15** (same day) if the user has granted notification permission.
- **Copy:** “Workout = commute. Start now.” / “Log your workout before work starts.” / “Streak at risk. 10 minutes still counts.”
- **In-page:** Reminders run while the app (or its tab) is open via in-page timers.
- **Background (optional):** With env vars and an external cron, reminders can fire when the app is closed. Setup: (1) Run `npm run generate-vapid`, add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to Vercel env. (2) Add Upstash Redis: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. (3) Set `CRON_SECRET` in Vercel. (4) Use an external cron (e.g. [cron-job.org](https://cron-job.org)) to call `GET https://your-app.vercel.app/api/cron/send-reminders` every 10 minutes with header `Authorization: Bearer <CRON_SECRET>`. No `vercel.json` is used, so deployment is unaffected.

  **If cron returns `subs: 0`:** Subscriptions are stored in the Redis of the **origin that served the subscribe request**. Enable notifications from your **production** app URL (the same domain you use for cron). If you enabled them on localhost or a Preview URL, those subs live in that environment’s Redis. Call `GET /api/cron/check-redis` (same `Authorization: Bearer <CRON_SECRET>`) to see `redisOrigin` and confirm Production uses the Redis you expect.

  **Sub count = one per browser/device.** If you enable on mobile and the count stays the same, the mobile subscribe may have failed (check the `POST /api/push-subscribe` response in the mobile browser’s network tab; it should return 200 and `subsCount: 2`). **Desktop notifications:** Background push uses a single tag so the latest reminder is visible; clicking the notification focuses/opens the app.

## Icons (required for PWA install)

The repo includes **`public/icon-192.png`** (192×192) and **`public/icon-512.png`** (512×512), a green (#22c55e) rounded square. They were generated with:

```bash
npm run generate-icons
```

(Requires `sharp`; run `npm install` first.) To use your own art, replace the files in `public/` or edit `scripts/generate-icons.js` and run the script again.

**Important for deploy:** If these icons return 404 on your deployed site, Chrome will **not** offer “Install app” and will only add a **shortcut**. Ensure both files are deployed.

## Phase 2 (optional)

- Weight tracking
- Exercise presets per day
- Monthly PDF export
- Sleep-time nudge
