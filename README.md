# FPL Pilot 🚀
**The Ultimate Mobile-First Fantasy Premier League Strategy & Optimization Engine**

Built for serious FPL managers who code from phones or desktops. Runs exclusively on free and unauthenticated official Fantasy Premier League data. **Zero API keys, zero logins, zero paid services, and zero databases required.**

---

## 🌟 Key Features

1. **Tactical Pitch & Best XI Optimizer**
   - Evaluates all valid FPL formations (`3-4-3`, `3-5-2`, `4-4-2`, `4-3-3`, `4-5-1`, `5-3-2`, `5-4-1`, `5-2-3`).
   - Automatically selects the starting XI that maximizes total Expected Points (`xPts`).
   - Auto-orders your bench by priority (Sub GK always in slot 12, outfield subs ordered by `xPts`).
   - Recommends Captain (`C`) and Vice-Captain (`V`), with an optional **Differential Captain** toggle (<15% owned).
   - Shows top 3 alternative formations and point differentials.
   - Interactive tactical pitch with club colors, captain armbands, fixture difficulty ratings (FDR), and injury alerts.

2. **Transparent, Explainable xPts Model**
   - **No black box**: click any player on the pitch or in the list to see the complete mathematical breakdown ("Why this score").
   - Balances recent form (30-day streak), underlying metrics (xG, xA, xGI, xGC, ICT index, starts/minutes), home/away advantage, and opponent strength.
   - Accurately accounts for **Blank Gameweeks** (0 points) and **Double Gameweeks** (summed across scheduled fixtures).
   - Configurable weight sliders in the Settings panel so you can personalize your model.

3. **Transfer Planner & Custom Sandbox**
   - Ranks the best 1-transfer and 2-transfer moves by net expected points benefit.
   - Automatically factors in transfer hits (-4 pts per extra transfer beyond your free transfers).
   - Enforces strict constraints: **budget (bank + selling price)** and **club limit (maximum 3 per Premier League team)**.
   - Interactive **Transfer Sandbox**: pick players from your squad to sell and test candidate signings with real-time budget, hit, and club-limit validation.

4. **Premier League Fixture Ticker**
   - 20-club FDR matrix across the next 5 to 8 gameweeks.
   - Sortable by overall FDR, attack difficulty (easiest defences to score against), and defence difficulty (best clean sheet odds).
   - Colorblind-safe FDR badges (1 to 5) with high-contrast numerals.
   - Highlights Double Gameweeks (`DGW`) and Blank Gameweeks (`BLANK`).

5. **Player Explorer & Head-to-Head Comparison**
   - Filter and sort all 650+ Premier League players by position, price, form, xPts, ownership %, and club.
   - **Low Ownership Gems**: filters high-xPts players under 10% owned for rapid rank climbing.
   - **Best Value**: points delivered per million pounds spent.
   - **Price Change Watch**: tracks net event transfers (`in - out`) to forecast potential price rises and falls.
   - **Compare 2 Players**: side-by-side head-to-head metric comparison.

6. **Chip Advisor & Strategy Hub**
   - Evaluates your remaining chips (**Wildcard**, **Free Hit**, **Bench Boost**, **Triple Captain**) against the upcoming fixture calendar.
   - Recommends whether to activate now or save for upcoming DGW/BGW blocks.
   - **Squad Health Assessment**: scores squad balance out of 100 with a letter grade, bench buffer check, and club-stacking exposure warnings.
   - **Season Review**: track record of your points, rank progression, and chip usage.

7. **Live Gameweek Tracker**
   - Real-time match center pulling live points, minutes, goals, assists, clean sheets, and provisional bonus points (`BPS`).
   - Tracks 2x captain multiplier and bench points.

8. **Shareable Summary**
   - Generates formatted, copy-ready summary text for WhatsApp, Reddit, Twitter, or Discord.

---

## 🔬 How the Prediction Model Works (Transparent & Explainable)

The expected points (`xPts`) for player $p$ in upcoming Gameweek $g$ is calculated as:

$$\text{xPts}(p) = \text{Availability}(p) \times \sum_{f \in \text{Fixtures}(g)} \left[ \text{Appearance}(p) + \text{Attacking}(p, f) + \text{Defensive}(p, f) + \text{Bonus}(p) \right] \times \text{FixtureMult}(f)$$

### Components:
1. **Blank & Double Gameweek Handling**:
   - If $\text{count}(\text{Fixtures}) = 0$, $\text{xPts} = 0.0$.
   - If $\text{count}(\text{Fixtures}) \ge 2$, returns for both matches are calculated and summed.
2. **Availability & Fitness**:
   - Ruled out (`i`, `u`): $0\%$.
   - Flagged (`chance_of_playing_next_round`): scaled by probability (e.g. $75\% \to 0.75$).
   - Bench impact / rotation risk: scaled down if starts $< 2$ and minutes $< 150$.
3. **Attacking Returns**:
   - Position-specific scoring: FWD (4 pts/goal), MID (5 pts/goal), DEF (6 pts/goal), GKP (6 pts/goal), Assist (3 pts).
   - Grounded in player's sample underlying stats: $\text{xG}/\text{match}$ and $\text{xA}/\text{match}$.
   - Set-piece boost: added value if primary penalty taker or direct free-kick/corner taker.
4. **Defensive Returns & Clean Sheets**:
   - Baseline clean sheet probability ($\sim 28\%$ average) modulated by club defence strength and opponent attack strength.
   - Goal concession deduction for DEFs and GKPs ($-1$ pt per 2 goals conceded based on xGC).
5. **Fixture & Venue Multipliers**:
   - FDR 1 (1.28x), FDR 2 (1.15x), FDR 3 (1.00x), FDR 4 (0.84x), FDR 5 (0.68x).
   - Home advantage multiplier: 1.12x at home vs 0.89x away.

---

## 🗂️ Project Structure

```
├── /docs
│   └── api-notes.md              # Verified FPL API field dictionary from live endpoints
├── /server.ts                    # Express proxy with memory caching (bypasses CORS)
├── /src
│   ├── /components
│   │   ├── PitchView.tsx         # Tactical grass pitch with formation tiers & dugout
│   │   ├── TransfersView.tsx     # 1 & 2 transfer optimizer and interactive sandbox
│   │   ├── FixturesView.tsx      # 20-club FDR ticker grid across 5-8 GWs
│   │   ├── PlayerExplorerView.tsx# Filter/sort, compare mode, differentials, price watch
│   │   ├── ChipsView.tsx         # Chip recommendations & squad health review
│   │   ├── LiveTrackerView.tsx   # Live gameweek match points & provisional bonus
│   │   ├── PlayerModal.tsx       # "Why this score" breakdown modal
│   │   ├── SettingsModal.tsx     # Model weight sliders & cache purge
│   │   └── ShareModal.tsx        # WhatsApp / text summary generator
│   ├── /lib
│   │   ├── /fpl
│   │   │   └── api.ts            # Client interface for FPL proxy endpoints
│   │   ├── /model
│   │   │   └── xpts.ts           # Pure explainable expected points algorithm
│   │   ├── /optimizer
│   │   │   ├── teamOptimizer.ts  # Best XI formation solver and bench ordering
│   │   │   └── transfers.ts      # Budget & 3-per-club transfer search
│   │   ├── /fixtures
│   │   │   └── ticker.ts         # Multi-gameweek difficulty generator
│   │   ├── /chips
│   │   │   └── advisor.ts        # Dynamic chip timing heuristics
│   │   ├── /analytics
│   │   │   └── healthAndMarket.ts# Squad score & market mover projections
│   │   ├── /constants
│   │   │   └── teams.ts          # Club colors & FDR badges
│   │   └── /__tests__
│   │       └── optimizer.test.ts # Vitest suite (formations, budget, blanks/doubles)
│   ├── /types
│   │   └── fpl.ts                # TypeScript types mapped from real API
│   ├── App.tsx                   # Master mobile-first application shell
│   └── index.css                 # Tailwind CSS v4 setup
├── package.json
└── vite.config.ts
```

---

## ⚡ Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run Unit Tests (Vitest)
```bash
npm test
```
Runs the test suite verifying:
- Valid FPL formation constraints (3-5-2, 3-4-3, etc.)
- Strict 3-player-per-club rule enforcement
- Double Gameweek and Blank Gameweek expected points calculation
- Budget constraints (bank + selling price) in transfer planning
- Bench ordering logic (Sub GK in slot 12, outfield subs ordered by xPts)

---

## 🚢 Deployment (Free Tier)

### Option A: Vercel
1. Push this repository to GitHub and import it into [Vercel](https://vercel.com).
2. Vercel uses the included `vercel.json` to build the Vite app and serve it from `dist`.
3. The `/api/fpl/*` proxy runs as a Node.js serverless function. No API keys or additional environment variables are required.
4. Use Node.js 22.x for local development and deployments.

### Option B: Cloudflare Pages / Workers
1. Connect repository in Cloudflare Dashboard > Pages.
2. Build command: `npm run build`, Output directory: `dist`.
3. Use a lightweight Cloudflare Worker for `/api/fpl/*` proxying to attach custom `User-Agent` and bypass browser CORS.

### Option C: Render / Railway / Fly.io (Single Container)
1. Run `npm run build` followed by `npm start`.
2. Port 3000 will serve both the `/api/fpl/*` proxy and the built SPA bundle.

---

## ⚠️ Known Limitations & API Behaviors

1. **Browser CORS**: The official FPL API at `fantasy.premierleague.com` does not send `Access-Control-Allow-Origin` headers. Direct browser fetches are blocked; all requests must flow through the built-in server proxy (`/api/fpl/*`).
2. **Game Update Lockout**: During the 1-2 hours around the gameweek deadline when FPL processes points, the official API returns HTTP 503 or an HTML "The game is being updated" maintenance page. FPL Pilot automatically detects this and serves cached data with an explanatory banner.
3. **Proprietary Price Change Formula**: FPL's official transfer algorithm includes hidden thresholds and anti-bot dampening. FPL Pilot's Price Watch calculates net transfers as a strong directional indicator, clearly labeled as an estimate.
4. **Mini-League Privacy**: Some private mini-leagues require authentication cookies which are excluded in unauthenticated mode. Public and classic leagues are fully supported.
