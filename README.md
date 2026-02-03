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
- **Background (Vercel Cron):** Reminders can fire when the app/tab is closed (Android Chrome, etc.). `vercel.json` defines a cron that runs every minute and calls `GET /api/send-due-notifications`. **Env vars:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (base64url from `npm run generate-vapid`), `PUSH_CONTACT_EMAIL` (e.g. `mailto:you@example.com`), `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. The cron is protected by `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`.

  **If cron returns `subs: 0`:** Subscriptions are stored in the Redis of the **origin that served the subscribe request**. Enable notifications from your **production** app URL (the same domain you use for cron). If you enabled them on localhost or a Preview URL, those subs live in that environment’s Redis. Call `GET /api/cron/check-redis` (same `Authorization: Bearer <CRON_SECRET>`) to see `redisOrigin` and confirm Production uses the Redis you expect.

  **Sub count = one per browser/device.** If you enable on mobile and the count stays the same, the mobile subscribe may have failed (check the `POST /api/push-subscribe` response in the mobile browser’s network tab). **Reset notifications:** Use “Reset notifications” in the Reminders section to unsubscribe and resubscribe (fixes stuck or expired state).

  **Testing:** (1) Enable notifications on production, close the tab/app. (2) Set a reminder time 1–2 minutes from now, wait for that minute; cron runs every minute and sends if local HH:mm matches. (3) Dedupe: each reminder slot is sent at most once per day per subscription (`lastSent`). (4) Expired subs: if the push service returns 404/410, the subscription is removed from Redis automatically.

### After deploying to Vercel

**1. Set environment variables** (Vercel → Project → Settings → Environment Variables). Add these for **Production** (and Preview if you want push there too):

| Variable | Where to get it | Notes |
|----------|-----------------|--------|
| `VAPID_PUBLIC_KEY` | Run `npm run generate-vapid` locally; copy the **public** key | Base64url string |
| `VAPID_PRIVATE_KEY` | Same command; copy the **private** key | Base64url; keep secret |
| `PUSH_CONTACT_EMAIL` | Use your email, e.g. `mailto:you@example.com` | Required by Web Push spec |
| `CRON_SECRET` | Generate a random string (e.g. `openssl rand -hex 24`) | Protects cron endpoint |
| `UPSTASH_REDIS_REST_URL` | [Upstash Console](https://console.upstash.com/) → create Redis → copy REST URL | |
| `UPSTASH_REDIS_REST_TOKEN` | Same Upstash Redis → copy REST Token | |

Redeploy after adding or changing env vars (or trigger a new deployment so they’re picked up).

**2. Post-deployment checks**

- **Cron is registered:** Vercel → Project → Settings → Crons. You should see `/api/send-due-notifications` with schedule `* * * * *` (every minute). Vercel injects `CRON_SECRET` when it calls the cron; no extra setup needed.
- **VAPID and Redis:** Open `https://your-app.vercel.app/api/push-vapid`. You should get `{"publicKey":"..."}` (not 500). Then call `GET https://your-app.vercel.app/api/cron/check-redis` with header `Authorization: Bearer <YOUR_CRON_SECRET>`. You should get `{"redis":"ok","subsCount":0,...}` (or `subsCount` &gt; 0 if someone already subscribed).
- **End-to-end:** On the **production** URL, click “Enable notifications”, allow in the browser, optionally set a reminder time 1–2 minutes from now. Close the tab. After that minute, you should get a push (and `check-redis` should show `subsCount: 1`).

**3. Optional: manual cron test**

To trigger the cron by hand (e.g. to test without waiting):  
`curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-app.vercel.app/api/send-due-notifications"`  
You should get `{"processed":1,"sent":0,"deleted":0,"failed":0}` (or similar). Use the same header for `GET .../api/cron/check-redis`.

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
