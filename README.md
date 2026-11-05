# Wardeck

Elgato Stream Deck plugin that shows live wardriving statistics from **WiGLE** and **WDGWars**.

MVP uses API-token auth only. Wardrift is deferred. This plugin is developed for **local sideload** with a temporary UUID (`com.jazzactual.wardeck`) — not yet submitted to Elgato Marketplace / Maker.

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

Use the **Test WiGLE** / **Test WDGWars** buttons in the Property Inspector. Without keys, keys show `—` and the plugin still runs (no crash).

## Actions

| Action | Behavior |
| --- | --- |
| **Stat** | Configurable platform + metric (WiGLE: WiFi GPS / WiFi / Rank / Month rank / Month events; WDGWars: Total / WiFi / BLE / Gang). Press = manual refresh for that platform. |
| **Platform Summary** | Logo-style key with primary metric (WiGLE WiFi GPS / WDGWars Total). Press = open platform site. |
| **Refresh** | Force refresh all or one platform. |

Default polling: WiGLE **15 min**, WDGWars **5 min** (tunable in PI). Cache + exponential backoff on `429` / `5xx`.

## Project layout

```
com.jazzactual.wardeck.sdPlugin/   # packaged plugin (manifest, UI, imgs, built bin/)
src/
  plugin.ts
  actions/           # stat, platform-summary, refresh
  services/          # cache, wigle, wdgwars
  settings.ts        # Zod schemas
  formatting.ts
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run build` | Compile `src/` → `com.jazzactual.wardeck.sdPlugin/bin/plugin.js` |
| `npm run watch` | Rebuild on change and `streamdeck restart` |
| `npm run link` | Symlink plugin into Stream Deck Plugins folder |
| `npm run validate` | Validate plugin package via CLI |

## Security notes

- Do **not** put API keys in action settings (they export with profiles in plaintext).
- Global settings are OS-backed but still readable by the local user — treat this machine as trusted.
- Never share exported global-settings dumps. Rotate keys if exposed.
- Dedicated per-tool keys are preferred where the platform allows rotation.

## License

See repository license when present.
