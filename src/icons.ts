import type { Platform } from "./settings.js";

/** Manifest / setImage paths are relative to the plugin root, without extension. */
export const ACTION_DEFAULT_KEYS = {
	stat: "imgs/actions/stat/key",
	platformSummary: "imgs/actions/platform-summary/key",
	refresh: "imgs/actions/refresh/key"
} as const;

/** Per-platform key art (144px @2x preferred when set programmatically). */
const PLATFORM_KEYS: Record<Platform, string> = {
	wigle: "imgs/platforms/wigle/key",
	wdgwars: "imgs/platforms/wdgwars/key",
	wardrift: "imgs/platforms/wardrift/key"
};

const ALL_PLATFORMS_KEY = "imgs/platforms/all/key";

export function platformKeyImage(platform: Platform): string {
	return PLATFORM_KEYS[platform];
}

export function refreshKeyImage(platform: Platform | "all"): string {
	if (platform === "all") {
		return ALL_PLATFORMS_KEY;
	}
	return PLATFORM_KEYS[platform];
}
