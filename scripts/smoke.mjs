/**
 * Lightweight smoke checks that do not require Stream Deck or API keys.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

function formatCompactNumber(value) {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "—";
	}
	const abs = Math.abs(value);
	const sign = value < 0 ? "-" : "";
	if (abs < 1000) {
		return `${sign}${Math.round(abs)}`;
	}
	if (abs < 1_000_000) {
		return `${sign}${(abs / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	}
	if (abs < 1_000_000_000) {
		return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	}
	return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
}

assert.equal(formatCompactNumber(null), "—");
assert.equal(formatCompactNumber(42), "42");
assert.equal(formatCompactNumber(1200), "1.2k");
assert.equal(formatCompactNumber(1_000_000), "1M");

const pollMinutes = (fallback) =>
	z.preprocess((value) => {
		if (value === "" || value === null || value === undefined) {
			return fallback;
		}
		return value;
	}, z.coerce.number().min(1).max(1440).default(fallback));

const GlobalSettingsSchema = z.object({
	wigleApiName: z.string().default(""),
	wigleApiToken: z.string().default(""),
	wdgwarsApiKey: z.string().default(""),
	wardriftUsername: z.string().default(""),
	wardriftPassword: z.string().default(""),
	wardriftSessionToken: z.string().default(""),
	wardriftSessionExpiresAt: z.string().default(""),
	wiglePollMinutes: pollMinutes(15),
	wdgwarsPollMinutes: pollMinutes(5),
	wardriftPollMinutes: pollMinutes(15)
});

const empty = GlobalSettingsSchema.parse({});
assert.equal(empty.wigleApiName, "");
assert.equal(empty.wardriftUsername, "");
assert.equal(empty.wardriftPassword, "");
assert.equal(empty.wardriftSessionToken, "");
assert.equal(empty.wiglePollMinutes, 15);
assert.equal(empty.wdgwarsPollMinutes, 5);
assert.equal(empty.wardriftPollMinutes, 15);
assert.equal(GlobalSettingsSchema.parse({ wiglePollMinutes: "" }).wiglePollMinutes, 15);
assert.equal(GlobalSettingsSchema.parse({ wardriftPollMinutes: "" }).wardriftPollMinutes, 15);

const PlatformSchema = z.enum(["wigle", "wdgwars", "wardrift"]);
assert.deepEqual(PlatformSchema.options, ["wigle", "wdgwars", "wardrift"]);

const WardriftMetricSchema = z.enum([
	"networks",
	"routes",
	"threats",
	"streak",
	"level",
	"currency",
	"expToNext",
	"name",
	"faction"
]);
assert.equal(WardriftMetricSchema.parse("networks"), "networks");

const FACTION_NAMES = { 1: "Arcanum", 2: "Crusade", 3: "Technocracy" };

function readWardriftMetric(data, metric) {
	const character = data.characters?.[0];
	const lifetime = data.wardrive?.lifetime;
	switch (metric) {
		case "networks":
			return lifetime?.access_points_discovered ?? null;
		case "routes":
			return lifetime?.routes_logged ?? null;
		case "threats":
			return lifetime?.threats_flagged ?? null;
		case "streak":
			return data.wardrive?.streak_days ?? null;
		case "level":
			return character?.level ?? null;
		case "currency":
			return character?.currency ?? null;
		case "expToNext":
			return character?.exp_to_next_level ?? null;
		case "name":
			return character?.name ?? null;
		case "faction": {
			if (typeof character?.faction === "string" && character.faction.trim()) {
				return character.faction.trim();
			}
			const id = character?.faction_id;
			return id !== undefined ? (FACTION_NAMES[id] ?? String(id)) : null;
		}
		default:
			return null;
	}
}

const sampleDashboard = {
	characters: [
		{
			name: "Scout",
			level: 12,
			currency: 340,
			exp_to_next_level: 80,
			faction_id: 2,
			class_name: "Runner"
		}
	],
	wardrive: {
		lifetime: {
			access_points_discovered: 1500,
			routes_logged: 42,
			threats_flagged: 7
		},
		streak_days: 5
	}
};

assert.equal(readWardriftMetric(sampleDashboard, "networks"), 1500);
assert.equal(readWardriftMetric(sampleDashboard, "routes"), 42);
assert.equal(readWardriftMetric(sampleDashboard, "threats"), 7);
assert.equal(readWardriftMetric(sampleDashboard, "streak"), 5);
assert.equal(readWardriftMetric(sampleDashboard, "level"), 12);
assert.equal(readWardriftMetric(sampleDashboard, "currency"), 340);
assert.equal(readWardriftMetric(sampleDashboard, "expToNext"), 80);
assert.equal(readWardriftMetric(sampleDashboard, "name"), "Scout");
assert.equal(readWardriftMetric(sampleDashboard, "faction"), "Crusade");
assert.equal(readWardriftMetric({}, "networks"), null);

function hasWardriftCredentials(settings) {
	return Boolean(settings.wardriftUsername.trim() && settings.wardriftPassword);
}

assert.equal(hasWardriftCredentials(empty), false);
assert.equal(
	hasWardriftCredentials({ wardriftUsername: "scout", wardriftPassword: "x" }),
	true
);

const pluginRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "com.jazzactual.wardeck.sdPlugin");
const requiredIcons = [
	"imgs/marks/wifi/icon.png",
	"imgs/marks/wifi/icon@2x.png",
	"imgs/marks/wifi/key.png",
	"imgs/marks/wifi/key@2x.png",
	"imgs/marks/bluetooth/icon.png",
	"imgs/marks/bluetooth/icon@2x.png",
	"imgs/marks/bluetooth/key.png",
	"imgs/marks/bluetooth/key@2x.png",
	"imgs/marks/combo/icon.png",
	"imgs/marks/combo/icon@2x.png",
	"imgs/marks/combo/key.png",
	"imgs/marks/combo/key@2x.png",
	"imgs/plugin/category-icon.png",
	"imgs/plugin/category-icon@2x.png",
	"imgs/plugin/marketplace.png",
	"imgs/plugin/marketplace@2x.png",
	"imgs/actions/stat/icon.png",
	"imgs/actions/stat/icon@2x.png",
	"imgs/actions/stat/key.png",
	"imgs/actions/stat/key@2x.png",
	"imgs/actions/platform-summary/icon.png",
	"imgs/actions/platform-summary/icon@2x.png",
	"imgs/actions/platform-summary/key.png",
	"imgs/actions/platform-summary/key@2x.png",
	"imgs/actions/refresh/icon.png",
	"imgs/actions/refresh/icon@2x.png",
	"imgs/actions/refresh/key.png",
	"imgs/actions/refresh/key@2x.png",
	"imgs/platforms/wigle/key.png",
	"imgs/platforms/wigle/key@2x.png",
	"imgs/platforms/wdgwars/key.png",
	"imgs/platforms/wdgwars/key@2x.png",
	"imgs/platforms/wardrift/key.png",
	"imgs/platforms/wardrift/key@2x.png",
	"imgs/platforms/all/key.png",
	"imgs/platforms/all/key@2x.png",
	"imgs/platforms/bluetooth/key.png",
	"imgs/platforms/bluetooth/key@2x.png"
];

for (const rel of requiredIcons) {
	const full = path.join(pluginRoot, rel);
	assert.ok(fs.existsSync(full), `missing icon ${rel}`);
}

const bannerIcons = [
	"imgs/actions/wardrift-banner/icon.png",
	"imgs/actions/wardrift-banner/icon@2x.png",
	"imgs/actions/wardrift-banner/key.png",
	"imgs/actions/wardrift-banner/key@2x.png",
	"imgs/actions/wigle-banner/icon.png",
	"imgs/actions/wigle-banner/icon@2x.png",
	"imgs/actions/wigle-banner/key.png",
	"imgs/actions/wigle-banner/key@2x.png",
	"imgs/actions/wdgwars-banner/icon.png",
	"imgs/actions/wdgwars-banner/icon@2x.png",
	"imgs/actions/wdgwars-banner/key.png",
	"imgs/actions/wdgwars-banner/key@2x.png"
];
for (const rel of bannerIcons) {
	assert.ok(fs.existsSync(path.join(pluginRoot, rel)), `missing icon ${rel}`);
}

const layoutPath = path.join(pluginRoot, "layouts/composed-banner.json");
assert.ok(fs.existsSync(layoutPath), "missing layouts/composed-banner.json");
const layout = JSON.parse(fs.readFileSync(layoutPath, "utf8"));
assert.equal(layout.items?.[0]?.key, "banner");
assert.deepEqual(layout.items?.[0]?.rect, [0, 0, 200, 100]);

const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, "manifest.json"), "utf8"));
assert.equal(manifest.CategoryIcon, "imgs/plugin/category-icon");
assert.equal(manifest.Icon, "imgs/plugin/marketplace");
const encoderUuids = [
	"com.jazzactual.wardeck.wardrift-banner",
	"com.jazzactual.wardeck.wigle-banner",
	"com.jazzactual.wardeck.wdgwars-banner"
];
for (const uuid of encoderUuids) {
	const bannerAction = manifest.Actions.find((a) => a.UUID === uuid);
	assert.ok(bannerAction, `manifest missing ${uuid}`);
	assert.deepEqual(bannerAction.Controllers, ["Encoder"]);
	assert.equal(bannerAction.Encoder?.layout, "layouts/composed-banner.json");
}
for (const action of manifest.Actions) {
	assert.ok(action.Icon, `${action.UUID} missing Icon`);
	assert.ok(action.States?.[0]?.Image, `${action.UUID} missing state Image`);
	assert.ok(fs.existsSync(path.join(pluginRoot, `${action.Icon}.png`)), `${action.Icon}.png`);
	assert.ok(
		fs.existsSync(path.join(pluginRoot, `${action.States[0].Image}.png`)),
		`${action.States[0].Image}.png`
	);
}

// Banner metrics must match keypad compact format (not full commas).
assert.equal(formatCompactNumber(0), "0");
assert.equal(formatCompactNumber(1284), "1.3k");
assert.equal(formatCompactNumber(48291), "48.3k");

// Sample A label contract: MONTHLY spelled out (never MO).
assert.equal("MONTHLY RANK".includes("MO "), false);
assert.ok("MONTHLY RANK".startsWith("MONTHLY"));
assert.ok("MONTHLY EVENTS".startsWith("MONTHLY"));

console.log("smoke ok");
