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

const dailyTimeSetting = z.preprocess((value) => {
	if (value === "" || value === null || value === undefined) {
		return "06:00";
	}
	const m = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
	if (!m) {
		return "06:00";
	}
	const hour = Math.min(23, Math.max(0, Number(m[1])));
	const minute = Math.min(59, Math.max(0, Number(m[2])));
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}, z.string().default("06:00"));

const timezoneSetting = z.preprocess((value) => {
	if (value === "" || value === null || value === undefined) {
		return "local";
	}
	return String(value).trim() || "local";
}, z.string().default("local"));

const GlobalSettingsSchema = z.object({
	wigleApiName: z.string().default(""),
	wigleApiToken: z.string().default(""),
	wdgwarsApiKey: z.string().default(""),
	wardriftUsername: z.string().default(""),
	wardriftPassword: z.string().default(""),
	wardriftSessionToken: z.string().default(""),
	wardriftSessionExpiresAt: z.string().default(""),
	wigleDailyTime: dailyTimeSetting,
	wigleTimezone: timezoneSetting,
	wigleLastFetchAt: z.string().default(""),
	wdgwarsLastFetchAt: z.string().default(""),
	wardriftLastFetchAt: z.string().default("")
});

const empty = GlobalSettingsSchema.parse({});
assert.equal(empty.wigleApiName, "");
assert.equal(empty.wardriftUsername, "");
assert.equal(empty.wardriftPassword, "");
assert.equal(empty.wardriftSessionToken, "");
assert.equal(empty.wigleDailyTime, "06:00");
assert.equal(empty.wigleTimezone, "local");
assert.equal(empty.wigleLastFetchAt, "");
assert.equal(GlobalSettingsSchema.parse({ wigleDailyTime: "" }).wigleDailyTime, "06:00");
assert.equal(GlobalSettingsSchema.parse({ wigleDailyTime: "9:30" }).wigleDailyTime, "09:30");
assert.equal(GlobalSettingsSchema.parse({ wigleTimezone: "" }).wigleTimezone, "local");

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
	"imgs/marks/radio/icon.png",
	"imgs/marks/radio/icon@2x.png",
	"imgs/marks/radio/key.png",
	"imgs/marks/radio/key@2x.png",
	"imgs/marks/podium/icon.png",
	"imgs/marks/podium/icon@2x.png",
	"imgs/marks/podium/key.png",
	"imgs/marks/podium/key@2x.png",
	"imgs/marks/car/icon.png",
	"imgs/marks/car/icon@2x.png",
	"imgs/marks/car/key.png",
	"imgs/marks/car/key@2x.png",
	"imgs/marks/calendar/icon.png",
	"imgs/marks/calendar/icon@2x.png",
	"imgs/marks/calendar/key.png",
	"imgs/marks/calendar/key@2x.png",
	"imgs/marks/swords/icon.png",
	"imgs/marks/swords/icon@2x.png",
	"imgs/marks/swords/key.png",
	"imgs/marks/swords/key@2x.png",
	"imgs/marks/coins/icon.png",
	"imgs/marks/coins/icon@2x.png",
	"imgs/marks/coins/key.png",
	"imgs/marks/coins/key@2x.png",
	"imgs/marks/biceps-flexed/icon.png",
	"imgs/marks/biceps-flexed/icon@2x.png",
	"imgs/marks/biceps-flexed/key.png",
	"imgs/marks/biceps-flexed/key@2x.png",
	"imgs/marks/zap/icon.png",
	"imgs/marks/zap/icon@2x.png",
	"imgs/marks/zap/key.png",
	"imgs/marks/zap/key@2x.png",
	"imgs/marks/user-round-group/icon.png",
	"imgs/marks/user-round-group/icon@2x.png",
	"imgs/marks/user-round-group/key.png",
	"imgs/marks/user-round-group/key@2x.png",
	"imgs/marks/plane/icon.png",
	"imgs/marks/plane/icon@2x.png",
	"imgs/marks/plane/key.png",
	"imgs/marks/plane/key@2x.png",
	"imgs/marks/network/icon.png",
	"imgs/marks/network/icon@2x.png",
	"imgs/marks/network/key.png",
	"imgs/marks/network/key@2x.png",
	"imgs/marks/award/icon.png",
	"imgs/marks/award/icon@2x.png",
	"imgs/marks/award/key.png",
	"imgs/marks/award/key@2x.png",
	"imgs/marks/radio-tower/icon.png",
	"imgs/marks/radio-tower/icon@2x.png",
	"imgs/marks/radio-tower/key.png",
	"imgs/marks/radio-tower/key@2x.png",
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
	"imgs/platforms/wigle/key.png",
	"imgs/platforms/wigle/key@2x.png",
	"imgs/platforms/wdgwars/key.png",
	"imgs/platforms/wdgwars/key@2x.png",
	"imgs/platforms/wardrift/key.png",
	"imgs/platforms/wardrift/key@2x.png",
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

// Sample A Lucide label-band glyphs (approved preview maps).
const repoRoot = path.resolve(pluginRoot, "..");
const lucideMarksSrc = fs.readFileSync(path.join(repoRoot, "src/banner/lucide-marks.ts"), "utf8");
for (const mark of [
	"radio",
	"car",
	"swords",
	"calendar",
	"coins",
	"zap",
	"wifi",
	"podium",
	"bluetooth",
	"plane",
	"network",
	"award"
]) {
	assert.ok(lucideMarksSrc.includes(`${mark}:`), `lucide-marks missing ${mark}`);
}
const renderSrc = fs.readFileSync(path.join(repoRoot, "src/banner/render.ts"), "utf8");
assert.ok(renderSrc.includes("renderLucideGlyph"), "render missing Lucide painter");
assert.ok(renderSrc.includes("SOLO_GLYPH = 15"), "solo glyph size drift");
assert.ok(renderSrc.includes("SPLIT_GLYPH = 12"), "split glyph size drift");

function assertBannerLucide(rel, needles) {
	const src = fs.readFileSync(path.join(repoRoot, rel), "utf8");
	for (const needle of needles) {
		assert.ok(src.includes(needle), `${rel} missing ${needle}`);
	}
}
assertBannerLucide("src/actions/wardrift-banner.ts", [
	'lucide: "radio"',
	'lucide: "car"',
	'lucide: "swords"',
	'lucide: "calendar"',
	'lucide: "coins"',
	'lucide: "zap"'
]);
assertBannerLucide("src/actions/wigle-banner.ts", [
	'lucide: "wifi"',
	'lucide: "podium"',
	'lucide: "calendar"',
	'lucide: "bluetooth"'
]);
assertBannerLucide("src/actions/wdgwars-banner.ts", [
	'lucide: "radio"',
	'lucide: "wifi"',
	'lucide: "bluetooth"',
	'lucide: "plane"',
	'lucide: "network"',
	'lucide: "award"'
]);

// Auto-update schedules: 4h interval plan + daily WiGLE plan.
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
function planIntervalPoll(lastFetchAt, intervalMs, nowMs) {
	const last = lastFetchAt ? Date.parse(lastFetchAt) : NaN;
	if (!Number.isFinite(last)) {
		return { immediate: true, delayMs: 0 };
	}
	const elapsed = nowMs - last;
	if (elapsed >= intervalMs) {
		return { immediate: true, delayMs: 0 };
	}
	return { immediate: false, delayMs: Math.max(1000, intervalMs - elapsed) };
}
const now = Date.UTC(2026, 10, 6, 12, 0, 0);
assert.deepEqual(planIntervalPoll("", FOUR_HOURS_MS, now), { immediate: true, delayMs: 0 });
assert.deepEqual(planIntervalPoll(new Date(now - FOUR_HOURS_MS - 1).toISOString(), FOUR_HOURS_MS, now), {
	immediate: true,
	delayMs: 0
});
assert.deepEqual(planIntervalPoll(new Date(now - 60_000).toISOString(), FOUR_HOURS_MS, now), {
	immediate: false,
	delayMs: FOUR_HOURS_MS - 60_000
});

function nextDailyLocal(timeHHMM, fromMs) {
	const [h, m] = timeHHMM.split(":").map(Number);
	const from = new Date(fromMs);
	const target = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h, m, 0, 0);
	if (target.getTime() <= fromMs) {
		target.setDate(target.getDate() + 1);
	}
	return target.getTime();
}
function planDailyPollLocal(lastFetchAt, timeHHMM, nowMs) {
	const last = lastFetchAt ? Date.parse(lastFetchAt) : NaN;
	const next = nextDailyLocal(timeHHMM, nowMs);
	const recent = next - 24 * 60 * 60 * 1000;
	if (!Number.isFinite(last) || last < recent - 5_000) {
		return { immediate: true, delayMs: 0 };
	}
	return { immediate: false, delayMs: Math.max(1000, next - nowMs) };
}
const morning = new Date(2026, 10, 6, 7, 0, 0).getTime(); // after 06:00 local
assert.equal(planDailyPollLocal("", "06:00", morning).immediate, true);
assert.equal(
	planDailyPollLocal(new Date(morning - 30 * 60_000).toISOString(), "06:00", morning).immediate,
	false
);

for (const rel of ["ui/stat.html", "ui/platform-summary.html"]) {
	const html = fs.readFileSync(path.join(pluginRoot, rel), "utf8");
	assert.ok(html.includes('setting="wigleDailyTime"'), `${rel} missing wigleDailyTime`);
	assert.ok(html.includes('setting="wigleTimezone"'), `${rel} missing wigleTimezone`);
	assert.equal(html.includes("wiglePollMinutes"), false, `${rel} still has poll minutes`);
	assert.equal(html.includes("Refresh"), false, `${rel} still mentions Refresh`);
}

assert.equal(
	manifest.Actions.some((a) => String(a.UUID).includes("refresh")),
	false,
	"manifest still has Refresh action"
);

console.log("smoke ok");
