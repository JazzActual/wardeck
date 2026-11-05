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
	wiglePollMinutes: pollMinutes(15),
	wdgwarsPollMinutes: pollMinutes(5)
});

const empty = GlobalSettingsSchema.parse({});
assert.equal(empty.wigleApiName, "");
assert.equal(empty.wiglePollMinutes, 15);
assert.equal(empty.wdgwarsPollMinutes, 5);
assert.equal(GlobalSettingsSchema.parse({ wiglePollMinutes: "" }).wiglePollMinutes, 15);

console.log("smoke ok");
