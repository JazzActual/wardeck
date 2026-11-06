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

After linking, open Stream Deck → add Wardeck actions from the category list → configure credentials in the Property Inspector.

## Bundled Stream Deck+ profile

The plugin ships a pre-laid **Wardeck** profile for **Stream Deck+** (8 LCD keys + dials). It is registered in the plugin manifest (`DeviceType` 7, `AutoInstall: true`) and contains **no credentials** — paste WiGLE / WDGWars / Wardrift secrets in the Property Inspector after install.

### Default layout

**Page 1 — WiGLE + WDGWars**

| WiGLE (summary) | WiFi GPS | Rank | Refresh (all) |
| --- | --- | --- | --- |
| WDGWars (summary) | Total | WiFi | Next page → |

**Page 2 — Wardrift (+ WDGWars BLE)**

| ← Previous | Wardrift (summary) | Networks | Routes |
| --- | --- | --- | --- |
| WDGWars BLE | Streak | *(free)* | *(free)* |

**Dials:** composed 800×100 banners sliced into four 200×100 Encoder pixmaps (display-only — no rotate / press / touch handlers).

| Page | Default dial action |
| --- | --- |
| Page 1 | **WiGLE Banner** ×4 (WIFI GPS · RANK+MONTHLY RANK · MONTHLY EVENTS · BT GPS) |
| Page 2 | **Wardrift Banner** ×4 (Networks · Routes+Threats · Streak · Coin+To next) |

**WDGWars Banner** (TOTAL · WIFI+BLE · AIRCRAFT · MESH+BADGES) is available in the action list — assign it to all four dials when you want that strip (e.g. swap page 1). Keys use the plugin’s shared monochrome marks (`imgs/marks/*`).

### Assign a composed banner to all four Plus dials

The strip only reads as one banner when **every** dial on the page uses the **same** banner action.

1. In Stream Deck, select your **Stream Deck+** device and the **Wardeck** profile (or any custom profile).
2. Open the **Wardeck** category in the action list.
3. Drag **WiGLE Banner**, **WDGWars Banner**, or **Wardrift Banner** onto dial 1, then dial 2, dial 3, and dial 4.
4. Leave dial settings empty — there is no Property Inspector on banners; credentials stay on any Keypad action’s global settings.
5. Mixing actions (or leaving a dial empty) breaks the full-strip illusion.

Bundled Plus profile defaults: page 1 → WiGLE Banner ×4, page 2 → Wardrift Banner ×4. Existing imported profiles keep prior dial bindings until you reassign or rebuild/re-import.

### Install / import

**A. Via plugin install (recommended after sideload)**

1. Build and link the plugin (`npm run build` → `npm run link` → `streamdeck restart com.jazzactual.wardeck`).
2. When Stream Deck first loads the plugin, accept the prompt to install the bundled **Wardeck** profile (or it appears under Profiles for Stream Deck+).
3. Select the **Stream Deck+** device and switch to the **Wardeck** profile.
4. Click any Wardeck key → Property Inspector → fill **global** credentials (WiGLE API Name/Token, WDGWars API key, and/or Wardrift username/password). Test each platform. Keys show `—` until credentials work.

**B. Manual double-click import**

1. Ensure the plugin is already linked/loaded (actions must resolve by UUID).
2. Open `com.jazzactual.wardeck.sdPlugin/profiles/Wardeck.streamDeckProfile` (double-click, or drag onto Stream Deck).
3. Confirm import for Stream Deck+, then configure credentials as above.

**C. Rebuild the profile archive (maintainers)**

```bash
npm run profile:plus
```

This regenerates `com.jazzactual.wardeck.sdPlugin/profiles/Wardeck.streamDeckProfile` from `scripts/generate-plus-profile.mjs`.

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

1. Select any Wardeck key (Stat, Platform Summary, or Refresh).
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
| **Platform Summary** | Logo-style key with primary metric (WiGLE WiFi GPS / WDGWars Total / Wardrift Networks). Press = open platform site. |
| **Refresh** | Force refresh all or one platform. |
| **Wardrift Banner** | Encoder-only. Full-strip Wardrift dashboard (name / faction / level·class, networks, routes, threats, streak, coin, to next). Display-only. Empty/error state without credentials. Streak `0` shows as `0`. |
| **WiGLE Banner** | Encoder-only. Sample A: WIFI GPS · RANK + MONTHLY RANK · MONTHLY EVENTS · BT GPS. Labels spell **MONTHLY** (never `MO`). Display-only. |
| **WDGWars Banner** | Encoder-only. Sample A: TOTAL · WIFI + BLE · AIRCRAFT · MESH + BADGES (badge count). Display-only. |

Default polling: WiGLE **15 min**, WDGWars **5 min**, Wardrift **15 min** (tunable in PI). Cache + exponential backoff on `429` / `5xx`.

## Icons

Lucide-only monochrome marks (`lucide-static`, ISC), white/light on near-black keys:

| Mark | Lucide | Meaning |
| --- | --- | --- |
| `imgs/marks/wifi` | `wifi` | Wi‑Fi–specific stats |
| `imgs/marks/bluetooth` | `bluetooth` | Bluetooth (WDGWars BLE) |
| `imgs/marks/combo` | `wifi` + `bluetooth` | Refresh All / WDGWars |
| `imgs/marks/radio` | `radio` | Platform summaries / totals |
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

Category uses wifi; marketplace / summary / refresh default to combo. Regenerate with `npm run icons` (requires Pillow, cairosvg, and `npm install` for lucide-static).

## Project layout

```
com.jazzactual.wardeck.sdPlugin/   # packaged plugin (manifest, UI, imgs, layouts, profiles, built bin/)
  layouts/composed-banner.json         # Shared Encoder full-canvas pixmap layout
  profiles/Wardeck.streamDeckProfile   # Stream Deck+ default layout (keys + dials)
src/
  plugin.ts
  actions/           # stat, platform-summary, refresh, *-banner
  banner/            # shared 800×100 compose + dial sync
  services/          # cache, wigle, wdgwars, wardrift
  settings.ts        # Zod schemas
  icons.ts           # key image paths
  formatting.ts
scripts/
  generate-plus-profile.mjs
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
| `npm run profile:plus` | Regenerate the Stream Deck+ `.streamDeckProfile` |

## Security notes

- Do **not** put API keys or passwords in action settings (they export with profiles in plaintext).
- Global settings are OS-backed but still readable by the local user — treat this machine as trusted.
- Never share exported global-settings dumps. Rotate keys / change passwords if exposed.
- Dedicated per-tool keys are preferred where the platform allows rotation.
- Wardrift character/upload API keys cannot read the dashboard — username/password session auth is required.

## License

See repository license when present.
