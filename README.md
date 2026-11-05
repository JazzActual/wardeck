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

Default polling: WiGLE **15 min**, WDGWars **5 min**, Wardrift **15 min** (tunable in PI). Cache + exponential backoff on `429` / `5xx`.

## Icons

Only **three** minimal monochrome marks, reused everywhere:

| Mark | Meaning |
| --- | --- |
| `imgs/marks/wifi` | Wi‑Fi |
| `imgs/marks/bluetooth` | Bluetooth |
| `imgs/marks/combo` | Wi‑Fi + Bluetooth |

White/light on near-black keys; white-on-transparent list glyphs. Bluetooth is the standard ᛒ rune (pointed geometric B). Category uses wifi; marketplace / summary / refresh default to combo; Stat uses wifi (bluetooth when the metric is BLE). Regenerate with `npm run icons` (requires Pillow + cairosvg).

## Project layout

```
com.jazzactual.wardeck.sdPlugin/   # packaged plugin (manifest, UI, imgs, built bin/)
src/
  plugin.ts
  actions/           # stat, platform-summary, refresh
  services/          # cache, wigle, wdgwars, wardrift
  settings.ts        # Zod schemas
  icons.ts           # key image paths
  formatting.ts
scripts/icons/       # PNG generator
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
