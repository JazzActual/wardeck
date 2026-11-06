import { z } from "zod";

export const PlatformSchema = z.enum(["wigle", "wdgwars", "wardrift"]);
export type Platform = z.infer<typeof PlatformSchema>;

/** WiGLE keypad metrics — no GPS-labeled options (wifiGps migrates → wifiAll). */
export const WigleMetricSchema = z.preprocess(
	(value) => (value === "wifiGps" ? "wifiAll" : value),
	z.enum(["wifiAll", "rank", "monthRank", "monthEvents", "cell"])
);
export type WigleMetric = z.infer<typeof WigleMetricSchema>;

export const WdgwarsMetricSchema = z.enum([
	"total",
	"wifi",
	"ble",
	"gang",
	"aircraft",
	"mesh",
	"badges"
]);
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

const pollMinutes = (fallback: number) =>
	z.preprocess((value) => {
		if (value === "" || value === null || value === undefined) {
			return fallback;
		}
		return value;
	}, z.coerce.number().min(1).max(1440).default(fallback));

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
	/** WiGLE poll interval in minutes (default 15). */
	wiglePollMinutes: pollMinutes(15),
	/** WDGWars poll interval in minutes (default 5). */
	wdgwarsPollMinutes: pollMinutes(5),
	/** Wardrift poll interval in minutes (default 15, matches CYDesk). */
	wardriftPollMinutes: pollMinutes(15)
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
	gang: "Gang",
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
