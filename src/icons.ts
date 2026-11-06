import type { Platform, StatActionSettings } from "./settings.js";

/** Lucide-backed marks bundled under imgs/marks/. */
export type IconMark =
	| "wifi"
	| "bluetooth"
	| "combo"
	| "podium"
	| "car"
	| "calendar"
	| "swords"
	| "coins"
	| "biceps-flexed"
	| "zap";

const MARK_KEYS: Record<IconMark, string> = {
	wifi: "imgs/marks/wifi/key",
	bluetooth: "imgs/marks/bluetooth/key",
	combo: "imgs/marks/combo/key",
	podium: "imgs/marks/podium/key",
	car: "imgs/marks/car/key",
	calendar: "imgs/marks/calendar/key",
	swords: "imgs/marks/swords/key",
	coins: "imgs/marks/coins/key",
	"biceps-flexed": "imgs/marks/biceps-flexed/key",
	zap: "imgs/marks/zap/key"
};

export function markKeyImage(mark: IconMark): string {
	return MARK_KEYS[mark];
}

/** Platform summary / default platform tile. */
export function platformKeyImage(platform: Platform): string {
	switch (platform) {
		case "wdgwars":
			return MARK_KEYS.combo;
		case "wigle":
		case "wardrift":
		default:
			return MARK_KEYS.wifi;
	}
}

/**
 * Stat key mark:
 * - WDGWars BLE → bluetooth
 * - WiGLE Rank / Month rank → podium
 * - Wardrift Routes → car; Streak → calendar; Threats → swords;
 *   Coin → coins; Level → biceps-flexed; To next → zap
 * - else wifi
 */
export function statKeyImage(settings: StatActionSettings): string {
	if (settings.platform === "wdgwars" && settings.wdgwarsMetric === "ble") {
		return MARK_KEYS.bluetooth;
	}
	if (
		settings.platform === "wigle" &&
		(settings.wigleMetric === "rank" || settings.wigleMetric === "monthRank")
	) {
		return MARK_KEYS.podium;
	}
	if (settings.platform === "wardrift") {
		switch (settings.wardriftMetric) {
			case "routes":
				return MARK_KEYS.car;
			case "streak":
				return MARK_KEYS.calendar;
			case "threats":
				return MARK_KEYS.swords;
			case "currency":
				return MARK_KEYS.coins;
			case "level":
				return MARK_KEYS["biceps-flexed"];
			case "expToNext":
				return MARK_KEYS.zap;
			default:
				break;
		}
	}
	return MARK_KEYS.wifi;
}

export function refreshKeyImage(platform: Platform | "all"): string {
	if (platform === "all" || platform === "wdgwars") {
		return MARK_KEYS.combo;
	}
	return MARK_KEYS.wifi;
}
