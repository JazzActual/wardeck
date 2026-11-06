# Wardeck

Elgato Stream Deck plugin that shows live wardriving statistics from **WiGLE**, **WDGWars**, and **Wardrift**.

This plugin is developed for **local sideload** with a temporary UUID (`com.jazzactual.wardeck`) — not yet submitted to Elgato Marketplace / Maker.

## Requirements

- [Node.js 24+](https://nodejs.org/) (Stream Deck Node plugins require 24+)
- [Stream Deck software 7.1+](https://www.elgato.com/stream-deck)
- A Stream Deck device (or Stream Deck Mobile for UI testing)

## Quick start (sideload / link-debug)

```bash
git clone https://github.com/JazzActual/wardeck.git
cd wardeck
npm install
npm run build
```

Install the Stream Deck CLI (if you do not already have it):

```bash
npm install -g @elgato/cli@latest
```

Enable developer mode and link the plugin into Stream Deck:

```bash
streamdeck dev
npm run link
# or: streamdeck link com.jazzactual.wardeck.sdPlugin
streamdeck restart com.jazzactual.wardeck
```

For iterative development (rebuild + restart on change):

```bash
npm run watch
```

After linking, open Stream Deck → add Wardeck actions from the category list → configure credentials in the Property Inspector. There is **no bundled Stream Deck profile** — lay out keys and dials yourself (or keep your own profile).

### Manual symlink (if `streamdeck link` is unavailable)

**macOS**

```bash
ln -s "$(pwd)/com.jazzactual.wardeck.sdPlugin" \
  "$HOME/Library/Application Support/com.elgato.StreamDeck/Plugins/com.jazzactual.wardeck.sdPlugin"
```

**Windows** (cmd.exe)

```bat
mklink /D "%APPDATA%\Elgato\StreamDeck\Plugins\com.jazzactual.wardeck.sdPlugin" "%CD%\com.jazzactual.wardeck.sdPlugin"
```

Restart Stream Deck after creating the link.

### Debug Property Inspector / plugin

```bash
streamdeck dev
```

Then open `http://localhost:23654/` in a browser. With the PI visible in Stream Deck, the inspector page appears in the list. Plugin Node debugging uses the manifest `Nodejs.Debug` flag (`enabled`).

## Credentials

Secrets are stored in **global settings only** (never action settings / profiles).

| Platform | Fields | Where to get them |
| --- | --- | --- |
| WiGLE | API Name + API Token | [wigle.net](https://wigle.net/) account → API |
| WDGWars | `X-API-Key` (64-char hex) | [wdgwars.pl](https://wdgwars.pl/) profile after login |
| Wardrift | Username + password | [wardrift.net](https://wardrift.net/) account |

### Configure Wardrift in the Property Inspector

1. Select any Wardeck key (Stat or Platform Summary).
2. Under **API Credentials (global)**, enter **Wardrift Username** and **Wardrift Password**.
3. Click **Test Wardrift** to verify sign-in + dashboard fetch.
4. On a **Stat** key, set Platform → **Wardrift** and pick a metric (Networks, Routes, Threats, Streak, Level, Coin, To next, Name, Faction).
5. On **Platform Summary**, set Platform → **Wardrift** (shows Networks / APs discovered).

Wardrift uses session auth: the plugin signs in to `POST /v1/auth/sign-in/username`, stores the session token in global settings, and polls `GET /v1/dashboard` with `Authorization: Bearer`. On `401` it clears the token and re-signs in once (same flow as CYDesk). Password is persisted for unattended re-auth — never logged.

Without credentials, keys show `—` and the plugin still runs (no crash). CI / smoke tests do not require live Wardrift credentials.

## Actions

| Action | Behavior |
| --- | --- |
| **Stat** | Configurable platform + metric (WiGLE / WDGWars / Wardrift). Press = manual refresh for that platform. |
| **Platform Summary** | Logo-style key with primary metric (WiGLE WiFi all / WDGWars Total / Wardrift Networks). Press = open platform site. |
| **Wardrift Banner** | Encoder-only. Full-strip Wardrift dashboard (name / faction / level·class, networks, routes, threats, streak, coin, to next). Display-only. Empty/error state without credentials. Streak `0` shows as `0`. |
| **WiGLE Banner** | Encoder-only. Sample A: WIFI · RANK + MONTHLY RANK · MONTHLY EVENTS · BT. Labels spell **MONTHLY** (never `MO`). Display-only. |
| **WDGWars Banner** | Encoder-only. Sample A: TOTAL · WIFI + BLE · AIRCRAFT · MESH + BADGES (badge count). Display-only. |

Auto-update: WDGWars + Wardrift every **4 hours**; WiGLE once per day at a PI-configured time of day + timezone (`local` or IANA). Last successful fetch timestamps are persisted in global settings. Stat press still refreshes that platform immediately. Cache + exponential backoff on `429` / `5xx`.

### Stream Deck+ dial banners

Composed 800×100 banners are sliced into four 200×100 Encoder pixmaps (display-only — no rotate / press / touch). The strip only reads as one banner when **every** dial on the page uses the **same** banner action:

1. Select your Stream Deck+ device and any profile.
2. Drag **WiGLE Banner**, **WDGWars Banner**, or **Wardrift Banner** onto dials 1–4.
3. Leave dial settings empty — banners have no Property Inspector; credentials stay on keypad actions.
4. Mixing actions (or leaving a dial empty) breaks the full-strip illusion.

## Icons

Lucide-only monochrome marks (`lucide-static`, ISC), white/light on near-black keys:

| Mark | Lucide | Meaning |
| --- | --- | --- |
| `imgs/marks/wifi` | `wifi` | Wi‑Fi–specific stats |
| `imgs/marks/bluetooth` | `bluetooth` | Bluetooth (WDGWars BLE) |
| `imgs/marks/combo` | `wifi` + `bluetooth` | WDGWars banner / combo compose |
| `imgs/marks/radio` | `radio` | Platform summaries / totals / Wardrift Networks |
| `imgs/marks/podium` | `podium` | WiGLE Rank / Month rank |
| `imgs/marks/car` | `car` | Wardrift Routes |
| `imgs/marks/calendar` | `calendar` | Wardrift Streak |
| `imgs/marks/swords` | `swords` | Wardrift Threats |
| `imgs/marks/coins` | `coins` | Wardrift Coin |
| `imgs/marks/biceps-flexed` | `biceps-flexed` | Wardrift Level |
| `imgs/marks/zap` | `zap` | Wardrift To next |
| `imgs/marks/user-round-group` | `user-round-group` | Wardrift Faction |
| `imgs/marks/plane` | `plane` | WDGWars Aircraft |
| `imgs/marks/network` | `network` | WDGWars Mesh |
| `imgs/marks/award` | `award` | WDGWars Badges (count) |
| `imgs/marks/radio-tower` | `radio-tower` | WiGLE Cell |

Category uses wifi; marketplace uses combo compose; platform summaries use radio. Regenerate with `npm run icons` (requires Pillow, cairosvg, and `npm install` for lucide-static).

## Project layout

```
com.jazzactual.wardeck.sdPlugin/   # packaged plugin (manifest, UI, imgs, layouts, built bin/)
  layouts/composed-banner.json         # Shared Encoder full-canvas pixmap layout
src/
  plugin.ts
  actions/           # stat, platform-summary, *-banner
  banner/            # shared 800×100 compose + dial sync
  services/          # cache, wigle, wdgwars, wardrift
  settings.ts        # Zod schemas
  icons.ts           # key image paths
  formatting.ts
scripts/
  smoke.mjs
  icons/             # PNG generator
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run build` | Compile `src/` → `com.jazzactual.wardeck.sdPlugin/bin/plugin.js` |
| `npm run watch` | Rebuild on change and `streamdeck restart` |
| `npm run link` | Symlink plugin into Stream Deck Plugins folder |
| `npm run validate` | Validate plugin package via CLI |
| `npm run smoke` | Offline schema / formatting / icon checks (no API keys) |
| `npm run icons` | Regenerate PNG icons via `scripts/icons/generate_icons.py` |

## Security notes

- Do **not** put API keys or passwords in action settings (they export with profiles in plaintext).
- Global settings are OS-backed but still readable by the local user — treat this machine as trusted.
- Never share exported global-settings dumps. Rotate keys / change passwords if exposed.
- Dedicated per-tool keys are preferred where the platform allows rotation.
- Wardrift character/upload API keys cannot read the dashboard — username/password session auth is required.

## License

See repository license when present.
