# QuickFetch — Same-Day Price & Delivery Bot

A fast, mobile-first web app (PWA) and Node/TypeScript API for searching products (e.g. `"fancy feast cheddar"`), calculating **total landed cost** (item price + delivery fee + service fee), and ranking stores by **earliest arrival time to your door** (prioritizing Same-Day delivery) or **cheapest total**.

Runs on your laptop and is reachable from your phone over local Wi-Fi or Tailscale.

## Features

- **Total Landed Cost**: Breaks down `Item Price + Delivery Fee + Service Fee` per store.
- **Membership-Aware Fee Engine**: Adjusts fees & cutoffs for Amazon Prime, Woolworths Delivery Unlimited, Coles Plus, Uber One, and DoorDash DashPass.
- **Same-Day Priority**: Ranks `Best Match`, `Fastest (Same-Day)`, or `Cheapest Total`.
- **Live Web Search (Optional)**: Plug in `GEMINI_API_KEY` (Google Search grounding) or `SERPAPI_KEY` (Google Shopping AU) in `.env`. Works out-of-the-box in Smart Estimator mode without any keys.
- **Mobile & Laptop PWA**: Responsive dark UI installable to your phone's home screen.

## Setup

```bash
npm install
cp .env.example .env
```

### Development (Laptop + Phone on LAN)

```bash
npm run dev
```

- Laptop: `http://localhost:5173`
- Phone (same Wi-Fi / Tailscale): `http://<your-laptop-ip>:5173`

### Production Build & Start (Full-Stack Node + SQLite)

```bash
npm run build
npm start
```

Serves both the API and the built PWA on `http://0.0.0.0:3001` (configurable via `PORT` and `HOST`).

### Free Hosting via GitHub Pages (Static Client Mode)

This repo includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) to deploy the PWA to GitHub Pages:

1. Push this repo to GitHub (`main` branch).
2. In your GitHub repo, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. The workflow builds `dist/web` with `VITE_STATIC_MODE=true`, using browser `localStorage` for your delivery profile and recent searches.
4. Optionally open **Settings** in the web app to enter a personal `GEMINI_API_KEY` (stored only in your browser) for live web prices.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
