import { z } from "zod";

import { formatDailyTime, parseDailyTime } from "./schedule.js";

export const PlatformSchema = z.enum(["wigle", "wdgwars", "wardrift"]);
export type Platform = z.infer<typeof PlatformSchema>;

/** WiGLE keypad metrics — no GPS-labeled options (wifiGps migrates → wifiAll). */
export const WigleMetricSchema = z.preprocess(
	(value) => (value === "wifiGps" ? "wifiAll" : value),
	z.enum(["wifiAll", "rank", "monthRank", "monthEvents", "cell"])
);
export type WigleMetric = z.infer<typeof WigleMetricSchema>;

/** Gang key removed — names overflow Stream Deck titles (migrates → total). */
export const WdgwarsMetricSchema = z.preprocess(
	(value) => (value === "gang" ? "total" : value),
	z.enum(["total", "wifi", "ble", "aircraft", "mesh", "badges"])
);
export type WdgwarsMetric = z.infer<typeof WdgwarsMetricSchema>;

export const WardriftMetricSchema = z.enum([
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
export type WardriftMetric = z.infer<typeof WardriftMetricSchema>;

const dailyTimeSetting = z.preprocess((value) => {
	if (value === "" || value === null || value === undefined) {
		return "06:00";
	}
	return formatDailyTime(parseDailyTime(String(value)));
}, z.string().default("06:00"));

const timezoneSetting = z.preprocess((value) => {
	if (value === "" || value === null || value === undefined) {
		return "local";
	}
	return String(value).trim() || "local";
}, z.string().default("local"));

export const GlobalSettingsSchema = z.object({
	wigleApiName: z.string().default(""),
	wigleApiToken: z.string().default(""),
	wdgwarsApiKey: z.string().default(""),
	wardriftUsername: z.string().default(""),
	wardriftPassword: z.string().default(""),
	/** Session token from Wardrift sign-in (persisted for unattended refresh). */
	wardriftSessionToken: z.string().default(""),
	/** ISO expiry from Wardrift sign-in; empty if unknown. */
	wardriftSessionExpiresAt: z.string().default(""),
	/** WiGLE daily auto-fetch wall-clock time (`HH:mm`, 24h). */
	wigleDailyTime: dailyTimeSetting,
	/**
	 * IANA timezone for WiGLE daily fetch, or `local` for the host clock.
	 * Invalid values fall back to local at schedule time.
	 */
	wigleTimezone: timezoneSetting,
	/** ISO timestamp of last successful WiGLE fetch (persisted). */
	wigleLastFetchAt: z.string().default(""),
	/** ISO timestamp of last successful WDGWars fetch (persisted). */
	wdgwarsLastFetchAt: z.string().default(""),
	/** ISO timestamp of last successful Wardrift fetch (persisted). */
	wardriftLastFetchAt: z.string().default("")
});
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;

export const StatActionSettingsSchema = z.object({
	platform: PlatformSchema.default("wigle"),
	wigleMetric: WigleMetricSchema.default("wifiAll"),
	wdgwarsMetric: WdgwarsMetricSchema.default("total"),
	wardriftMetric: WardriftMetricSchema.default("networks")
});
export type StatActionSettings = z.infer<typeof StatActionSettingsSchema>;

export const PlatformSummarySettingsSchema = z.object({
	platform: PlatformSchema.default("wigle")
});
export type PlatformSummarySettings = z.infer<typeof PlatformSummarySettingsSchema>;

export function parseGlobalSettings(raw: unknown): GlobalSettings {
	const result = GlobalSettingsSchema.safeParse(raw ?? {});
	return result.success ? result.data : GlobalSettingsSchema.parse({});
}

export function parseStatSettings(raw: unknown): StatActionSettings {
	const result = StatActionSettingsSchema.safeParse(raw ?? {});
	return result.success ? result.data : StatActionSettingsSchema.parse({});
}

export function parsePlatformSummarySettings(raw: unknown): PlatformSummarySettings {
	const result = PlatformSummarySettingsSchema.safeParse(raw ?? {});
	return result.success ? result.data : PlatformSummarySettingsSchema.parse({});
}

export function hasWigleCredentials(settings: GlobalSettings): boolean {
	return Boolean(settings.wigleApiName.trim() && settings.wigleApiToken.trim());
}

export function hasWdgwarsCredentials(settings: GlobalSettings): boolean {
	return Boolean(settings.wdgwarsApiKey.trim());
}

export function hasWardriftCredentials(settings: GlobalSettings): boolean {
	return Boolean(settings.wardriftUsername.trim() && settings.wardriftPassword);
}

export function hasPlatformCredentials(platform: Platform, settings: GlobalSettings): boolean {
	switch (platform) {
		case "wigle":
			return hasWigleCredentials(settings);
		case "wdgwars":
			return hasWdgwarsCredentials(settings);
		case "wardrift":
			return hasWardriftCredentials(settings);
		default:
			return false;
	}
}

export const PLATFORM_URLS: Record<Platform, string> = {
	wigle: "https://wigle.net/",
	wdgwars: "https://wdgwars.pl/",
	wardrift: "https://wardrift.net/"
};

export const ALL_PLATFORMS: Platform[] = ["wigle", "wdgwars", "wardrift"];

export const WIGLE_METRIC_LABELS: Record<WigleMetric, string> = {
	wifiAll: "WiFi",
	rank: "Rank",
	monthRank: "Mo Rank",
	monthEvents: "Mo Events",
	cell: "Cell"
};

export const WDGWARS_METRIC_LABELS: Record<WdgwarsMetric, string> = {
	total: "Total",
	wifi: "WiFi",
	ble: "BLE",
	aircraft: "Aircraft",
	mesh: "Mesh",
	badges: "Badges"
};

export const WARDRIFT_METRIC_LABELS: Record<WardriftMetric, string> = {
	networks: "Networks",
	routes: "Routes",
	threats: "Threats",
	streak: "Streak",
	level: "Level",
	currency: "Coin",
	expToNext: "To Next",
	name: "Name",
	faction: "Faction"
};

/** Common IANA zones for the WiGLE daily-time PI select (plus `local`). */
export const WIGLE_TIMEZONE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
	{ value: "local", label: "Local (host clock)" },
	{ value: "UTC", label: "UTC" },
	{ value: "America/Los_Angeles", label: "America/Los_Angeles" },
	{ value: "America/Denver", label: "America/Denver" },
	{ value: "America/Chicago", label: "America/Chicago" },
	{ value: "America/New_York", label: "America/New_York" },
	{ value: "Europe/London", label: "Europe/London" },
	{ value: "Europe/Berlin", label: "Europe/Berlin" },
	{ value: "Europe/Warsaw", label: "Europe/Warsaw" },
	{ value: "Asia/Tokyo", label: "Asia/Tokyo" },
	{ value: "Australia/Sydney", label: "Australia/Sydney" }
];
