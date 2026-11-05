/**
 * Lightweight smoke checks that do not require Stream Deck or API keys.
 */
import assert from "node:assert/strict";
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

console.log("smoke ok");
