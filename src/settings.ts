import { z } from "zod";

/** MVP platforms only — Wardrift is Phase 2. */
export const PlatformSchema = z.enum(["wigle", "wdgwars"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const WigleMetricSchema = z.enum([
	"wifiGps",
	"wifiAll",
	"rank",
	"monthRank",
	"monthEvents"
]);
export type WigleMetric = z.infer<typeof WigleMetricSchema>;

export const WdgwarsMetricSchema = z.enum(["total", "wifi", "ble", "gang"]);
export type WdgwarsMetric = z.infer<typeof WdgwarsMetricSchema>;

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
	/** WiGLE poll interval in minutes (default 15). */
	wiglePollMinutes: pollMinutes(15),
	/** WDGWars poll interval in minutes (default 5). */
	wdgwarsPollMinutes: pollMinutes(5)
});
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;

export const StatActionSettingsSchema = z.object({
	platform: PlatformSchema.default("wigle"),
	wigleMetric: WigleMetricSchema.default("wifiGps"),
	wdgwarsMetric: WdgwarsMetricSchema.default("total")
});
export type StatActionSettings = z.infer<typeof StatActionSettingsSchema>;

export const PlatformSummarySettingsSchema = z.object({
	platform: PlatformSchema.default("wigle")
});
export type PlatformSummarySettings = z.infer<typeof PlatformSummarySettingsSchema>;

export const RefreshActionSettingsSchema = z.object({
	platform: z.enum(["all", "wigle", "wdgwars"]).default("all")
});
export type RefreshActionSettings = z.infer<typeof RefreshActionSettingsSchema>;

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

export function parseRefreshSettings(raw: unknown): RefreshActionSettings {
	const result = RefreshActionSettingsSchema.safeParse(raw ?? {});
	return result.success ? result.data : RefreshActionSettingsSchema.parse({});
}

export function hasWigleCredentials(settings: GlobalSettings): boolean {
	return Boolean(settings.wigleApiName.trim() && settings.wigleApiToken.trim());
}

export function hasWdgwarsCredentials(settings: GlobalSettings): boolean {
	return Boolean(settings.wdgwarsApiKey.trim());
}

export const PLATFORM_URLS: Record<Platform, string> = {
	wigle: "https://wigle.net/",
	wdgwars: "https://wdgwars.pl/"
};

export const WIGLE_METRIC_LABELS: Record<WigleMetric, string> = {
	wifiGps: "WiFi GPS",
	wifiAll: "WiFi",
	rank: "Rank",
	monthRank: "Mo Rank",
	monthEvents: "Mo Events"
};

export const WDGWARS_METRIC_LABELS: Record<WdgwarsMetric, string> = {
	total: "Total",
	wifi: "WiFi",
	ble: "BLE",
	gang: "Gang"
};
