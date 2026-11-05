/**
 * Builds a Stream Deck+ (20GBD9901) `.streamDeckProfile` for Wardeck.
 *
 * Format matches Stream Deck.app v3 profiles (Version "3.0"):
 *   {OUTER}.sdProfile/manifest.json
 *   {OUTER}.sdProfile/Profiles/{PAGE}/manifest.json
 *
 * Outer + page UUIDs are deterministic so rebuilds stay byte-stable aside
 * from zip metadata. Action settings carry platform/metric only — never
 * credentials (those live in plugin global settings / PI).
 *
 * Layout (4×2 keypad; dials left empty — plugin actions are Keypad-only):
 *
 *   Page 1 — WiGLE + WDGWars
 *     [WiGLE Sum] [WiFi GPS] [Rank] [Refresh]
 *     [WDG Sum]   [Total]    [WiFi] [Next →]
 *
 *   Page 2 — Wardrift (+ WDGWars BLE)
 *     [← Prev] [Wardrift Sum] [Networks] [Routes]
 *     [BLE]    [Streak]       [free]     [free]
 */

import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
	existsSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(
	ROOT,
	"com.jazzactual.wardeck.sdPlugin",
	"profiles",
	"Wardeck.streamDeckProfile"
);

const PLUS_MODEL = "20GBD9901";
const NULL_UUID = "00000000-0000-0000-0000-000000000000";

/** Deterministic UUIDs — outer wrapper vs pages must differ (hex only). */
const OUTER_UUID = "a7e4d1c0-4ade-4ecb-b105-000000000001";
const PAGE1_UUID = "a7e4d1c0-4ade-4ecb-b105-000000000101";
const PAGE2_UUID = "a7e4d1c0-4ade-4ecb-b105-000000000102";

const PAGE_PREVIOUS = "com.elgato.streamdeck.page.previous";
const PAGE_NEXT = "com.elgato.streamdeck.page.next";

const UUID = {
	stat: "com.jazzactual.wardeck.stat",
	summary: "com.jazzactual.wardeck.platform-summary",
	refresh: "com.jazzactual.wardeck.refresh"
};

/** Stable ActionIDs per slot (col,row,page) so profile diffs stay readable. */
function actionId(page, col, row) {
	const n = page * 100 + row * 10 + col;
	return `a7e4d1c0-4ade-4ecb-b105-${String(n).padStart(12, "0")}`;
}

function pluginAction({
	page,
	col,
	row,
	uuid,
	name,
	settings,
	linkedTitle = false
}) {
	return {
		ActionID: actionId(page, col, row),
		LinkedTitle: linkedTitle,
		Name: name,
		Resources: null,
		Settings: settings,
		State: 0,
		// Empty state: plugin owns the title via setTitle(); avoid locking
		// a profile Title that would suppress live stats.
		States: [{}],
		UUID: uuid
	};
}

function pageNavAction({ page, col, row, uuid, name }) {
	return {
		ActionID: actionId(page, col, row),
		LinkedTitle: true,
		Name: name,
		Resources: null,
		Settings: {},
		State: 0,
		States: [{}],
		UUID: uuid
	};
}

const defaultStatSettings = {
	wigleMetric: "wifiGps",
	wdgwarsMetric: "total",
	wardriftMetric: "networks"
};

function stat(page, col, row, platform, metricKey, metricValue, name) {
	return pluginAction({
		page,
		col,
		row,
		uuid: UUID.stat,
		name,
		settings: {
			platform,
			...defaultStatSettings,
			[metricKey]: metricValue
		}
	});
}

function summary(page, col, row, platform, name) {
	return pluginAction({
		page,
		col,
		row,
		uuid: UUID.summary,
		name,
		settings: { platform }
	});
}

function refresh(page, col, row) {
	return pluginAction({
		page,
		col,
		row,
		uuid: UUID.refresh,
		name: "Refresh",
		settings: { platform: "all" }
	});
}

/** Page 1 keypad: WiGLE + WDGWars overview. */
const page1Keypad = {
	"0,0": summary(1, 0, 0, "wigle", "WiGLE"),
	"1,0": stat(1, 1, 0, "wigle", "wigleMetric", "wifiGps", "WiFi GPS"),
	"2,0": stat(1, 2, 0, "wigle", "wigleMetric", "rank", "Rank"),
	"3,0": refresh(1, 3, 0),
	"0,1": summary(1, 0, 1, "wdgwars", "WDGWars"),
	"1,1": stat(1, 1, 1, "wdgwars", "wdgwarsMetric", "total", "Total"),
	"2,1": stat(1, 2, 1, "wdgwars", "wdgwarsMetric", "wifi", "WiFi"),
	"3,1": pageNavAction({
		page: 1,
		col: 3,
		row: 1,
		uuid: PAGE_NEXT,
		name: "Next Page"
	})
};

/** Page 2 keypad: Wardrift detail + WDGWars BLE. */
const page2Keypad = {
	"0,0": pageNavAction({
		page: 2,
		col: 0,
		row: 0,
		uuid: PAGE_PREVIOUS,
		name: "Previous Page"
	}),
	"1,0": summary(2, 1, 0, "wardrift", "Wardrift"),
	"2,0": stat(2, 2, 0, "wardrift", "wardriftMetric", "networks", "Networks"),
	"3,0": stat(2, 3, 0, "wardrift", "wardriftMetric", "routes", "Routes"),
	"0,1": stat(2, 0, 1, "wdgwars", "wdgwarsMetric", "ble", "BLE"),
	"1,1": stat(2, 1, 1, "wardrift", "wardriftMetric", "streak", "Streak")
};

function pageManifest(keypadActions) {
	return {
		Controllers: [
			{ Type: "Keypad", Actions: keypadActions },
			// Stream Deck+ profiles carry an Encoder controller (4 dials).
			// Leave dials unbound — Wardeck actions are Keypad-only for now.
			{ Type: "Encoder", Actions: {} }
		],
		Icon: "",
		Name: ""
	};
}

function topManifest() {
	return {
		AppIdentifier: "*",
		Device: { Model: PLUS_MODEL, UUID: "" },
		Name: "Wardeck",
		Pages: {
			Current: PAGE1_UUID,
			Default: PAGE1_UUID,
			Pages: [PAGE1_UUID, PAGE2_UUID]
		},
		Version: "3.0"
	};
}

function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value)}\n`, "utf8");
}

function main() {
	const staging = mkdtempSync(join(tmpdir(), "wardeck-plus-profile-"));
	try {
		const sdProfileDir = `${OUTER_UUID.toUpperCase()}.sdProfile`;
		const base = join(staging, sdProfileDir);
		const page1Dir = join(base, "Profiles", PAGE1_UUID.toUpperCase());
		const page2Dir = join(base, "Profiles", PAGE2_UUID.toUpperCase());
		mkdirSync(page1Dir, { recursive: true });
		mkdirSync(page2Dir, { recursive: true });

		writeJson(join(base, "manifest.json"), topManifest());
		writeJson(join(page1Dir, "manifest.json"), pageManifest(page1Keypad));
		writeJson(join(page2Dir, "manifest.json"), pageManifest(page2Keypad));

		mkdirSync(dirname(OUT), { recursive: true });
		if (existsSync(OUT)) {
			rmSync(OUT);
		}

		// zip -X strips extra attributes for more stable archives.
		execFileSync(
			"zip",
			["-X", "-qr", OUT, sdProfileDir],
			{ cwd: staging, stdio: "inherit" }
		);

		console.log(`Wrote ${OUT}`);
		console.log("Device: Stream Deck+ (20GBD9901)  DeviceType: 7");
		console.log("Page 1: WiGLE summary/wifiGps/rank + WDGWars summary/total/wifi + Refresh + Next");
		console.log("Page 2: Prev + Wardrift summary/networks/routes/streak + WDGWars BLE");
	} finally {
		rmSync(staging, { recursive: true, force: true });
	}
}

main();
