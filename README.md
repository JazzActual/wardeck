```
 **       **     **     *******   *******   ********   ******  **   **
/**      /**    ****   /**////** /**////** /**/////   **////**/**  ** 
/**   *  /**   **//**  /**   /** /**    /**/**       **    // /** **  
/**  *** /**  **  //** /*******  /**    /**/******* /**       /****   
/** **/**/** **********/**///**  /**    /**/**////  /**       /**/**  
/**** //****/**//////**/**  //** /**    ** /**      //**    **/**//** 
/**/   ///**/**     /**/**   //**/*******  /******** //****** /** //**
//       // //      // //     // ///////   ////////   //////  //   // 
```

Elgato Stream Deck plugin that shows live wardriving statistics from **WiGLE**, **WDGWars**, and **Wardrift**.

Developed for **local install / sideload** with a temporary UUID (`com.jazzactual.wardeck`) — not yet on Elgato Marketplace / Maker.

## Easy Install

Download the latest **`.streamDeckPlugin`** from [GitHub Releases](https://github.com/JazzActual/wardeck/releases), then double-click it (or open it with the Stream Deck app). Stream Deck installs Wardeck like any other plugin — no Terminal or Node.js required. After install, add Wardeck actions from the category list and enter API credentials in the Property Inspector.

## Features

- Live stats from **WiGLE**, **WDGWars**, and **Wardrift** on Stream Deck keys
- **Stat** keys: pick a platform, then a metric for that platform (two Property Inspector dropdowns)
- **Platform Summary** keys: one-glance primary metric (WiGLE WiFi all / WDGWars Total / Wardrift Networks); press opens the platform site
- **Stream Deck+ dial banners**: full-width composed strips for WiGLE, WDGWars, and Wardrift (display-only)
- Lucide monochrome key icons matched to each metric
- Auto-fetch when credentials exist: **Wardrift + WDGWars every 4 hours**; **WiGLE once daily** at a time and timezone you set
- Manual refresh via **Stat key press** or Property Inspector **Test** (no dedicated Refresh action)
- Global credentials only — secrets never live in exported profiles
- Lay out your own keys and dials — **no bundled Stream Deck profile**

## Requirements

- [Node.js 24+](https://nodejs.org/) (Stream Deck Node plugins require 24+)
- [Stream Deck software 7.1+](https://www.elgato.com/stream-deck)
- A Stream Deck device (or Stream Deck Mobile for UI testing)

## Quick start (developers)

```bash
git clone https://github.com/JazzActual/wardeck.git
cd wardeck
npm install
npm run build
```

### Package a double-click installer

```bash
npm run pack
# → dist/com.jazzactual.wardeck.streamDeckPlugin
```

Attach that file to a [GitHub Release](https://github.com/JazzActual/wardeck/releases/new) so friends can download and double-click it. (`npm run pack` builds first, then runs `streamdeck pack`.)

Install the Stream Deck CLI if needed:

```bash
npm install -g @elgato/cli@latest
```

Enable developer mode and link the plugin:

```bash
streamdeck dev
npm run link
# or: streamdeck link com.jazzactual.wardeck.sdPlugin
streamdeck restart com.jazzactual.wardeck
```

Iterative development (rebuild + restart on change):

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

Open `http://localhost:23654/` in a browser. With the PI visible in Stream Deck, the inspector page appears in the list. Plugin Node debugging uses the manifest `Nodejs.Debug` flag.

## Credentials

Secrets are stored in **global settings only** (never action settings / profiles).

| Platform | Fields | Where to get them |
| --- | --- | --- |
| WiGLE | API Name + API Token | [wigle.net](https://wigle.net/) account → API |
| WDGWars | `X-API-Key` (64-char hex) | [wdgwars.pl](https://wdgwars.pl/) profile after login |
| Wardrift | Username + password | [wardrift.net](https://wardrift.net/) account |

### Configure in the Property Inspector

1. Select any Wardeck key (**Stat** or **Platform Summary**).
2. Under **API Credentials (global)**, enter credentials for each platform you use.
3. Click **Test WiGLE** / **Test WDGWars** / **Test Wardrift** to verify.
4. On a **Stat** key: set **Platform**, then **Metric** (options are filtered to that platform).
5. On **Platform Summary**: set **Platform** only.

Without credentials, keys show `—` and the plugin still runs. Smoke tests do not require live API credentials.

**Wardrift** uses session auth: the plugin signs in to `POST /v1/auth/sign-in/username`, stores the session token in global settings, and polls `GET /v1/dashboard` with `Authorization: Bearer`. On `401` it clears the token and re-signs in once. Password is persisted for unattended re-auth — never logged. Character/upload API keys cannot read the dashboard.

## Actions

| Action | Controllers | Behavior |
| --- | --- | --- |
| **Stat** | Keypad | Platform + metric for that platform. Press = refresh that platform. |
| **Platform Summary** | Keypad | Primary metric (WiGLE WiFi all / WDGWars Total / Wardrift Networks). Press = open platform site. |
| **WiGLE Banner** | Encoder | Sample A strip: WIFI · RANK + MONTHLY RANK · MONTHLY EVENTS · BT. Display-only. |
| **WDGWars Banner** | Encoder | Sample A strip: TOTAL · WIFI + BLE · AIRCRAFT · MESH + BADGES (count). Display-only. |
| **Wardrift Banner** | Encoder | Networks · Routes+Threats · Streak · Coin+To next (plus name / faction / level). Display-only; streak `0` shows as `0`. |

### Stat metrics

| Platform | Metrics |
| --- | --- |
| WiGLE | WiFi (all), Cell, Rank, Month rank, Month events |
| WDGWars | Total, WiFi, BLE, Aircraft, Mesh, Badges |
| Wardrift | Networks, Routes, Threats, Streak, Level, Coin, To next, Name |

There is no WDGWars Gang key or Wardrift Faction key (labels overflow titles) and no dedicated Refresh keypad action.

## Auto-update

| Platform | Schedule |
| --- | --- |
| WDGWars | Every **4 hours** |
| Wardrift | Every **4 hours** |
| WiGLE | Once per day at a PI-configured time + timezone (`local` or IANA) |

The plugin also fetches once when it loads (and when a key appears) if credentials exist. Last successful fetch times are persisted in global settings. **Stat** press and PI **Test** force an immediate refresh. Cache uses exponential backoff on `429` / `5xx`.

## Stream Deck+ dial banners

Composed 800×100 banners are sliced into four 200×100 Encoder pixmaps (display-only — no rotate / press / touch). The strip only reads as one banner when **every** dial on the page uses the **same** banner action:

1. Select your Stream Deck+ device and any profile.
2. Drag **WiGLE Banner**, **WDGWars Banner**, or **Wardrift Banner** onto dials 1–4.
3. Leave dial settings empty — banners have no Property Inspector; credentials stay on keypad actions.
4. Mixing actions (or leaving a dial empty) breaks the full-strip illusion.

## Icons

Lucide-only monochrome marks (`lucide-static`, ISC), white on near-black keys:

| Mark | Lucide | Meaning |
| --- | --- | --- |
| `imgs/marks/wifi` | `wifi` | Wi‑Fi–specific stats |
| `imgs/marks/bluetooth` | `bluetooth` | WDGWars BLE |
| `imgs/marks/combo` | `wifi` + `bluetooth` | Combo compose / banner assets |
| `imgs/marks/radio` | `radio` | Platform summaries, WDGWars Total, Wardrift Networks |
| `imgs/marks/podium` | `podium` | WiGLE Rank / Month rank |
| `imgs/marks/radio-tower` | `radio-tower` | WiGLE Cell |
| `imgs/marks/plane` | `plane` | WDGWars Aircraft |
| `imgs/marks/network` | `network` | WDGWars Mesh |
| `imgs/marks/award` | `award` | WDGWars Badges (count) |
| `imgs/marks/car` | `car` | Wardrift Routes |
| `imgs/marks/calendar` | `calendar` | Wardrift Streak |
| `imgs/marks/swords` | `swords` | Wardrift Threats |
| `imgs/marks/coins` | `coins` | Wardrift Coin |
| `imgs/marks/biceps-flexed` | `biceps-flexed` | Wardrift Level |
| `imgs/marks/zap` | `zap` | Wardrift To next |

Plus dial banners reuse the same Lucide marks as matching key metrics. Regenerate with `npm run icons` (requires Pillow, cairosvg, and `npm install` for lucide-static).

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
  schedule.ts        # WiGLE daily + 4h poll helpers
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
| `npm run pack` | Build + create `dist/*.streamDeckPlugin` (double-click installer) |
| `npm run smoke` | Offline schema / formatting / icon checks (no API keys) |
| `npm run icons` | Regenerate PNG icons via `scripts/icons/generate_icons.py` |

## Security notes

- Do **not** put API keys or passwords in action settings (they export with profiles in plaintext).
- Global settings are OS-backed but still readable by the local user — treat this machine as trusted.
- Never share exported global-settings dumps. Rotate keys / change passwords if exposed.
- Prefer dedicated per-tool keys where the platform allows rotation.
- Wardrift dashboard access requires username/password session auth — not a character/upload API key.

## License

See repository license when present.
