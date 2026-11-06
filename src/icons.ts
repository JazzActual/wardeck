import type { Platform, StatActionSettings } from "./settings.js";

/** Lucide-backed marks bundled under imgs/marks/. */
export type IconMark =
	| "wifi"
	| "bluetooth"
	| "combo"
	| "radio"
	| "podium"
	| "car"
	| "calendar"
	| "swords"
	| "coins"
	| "biceps-flexed"
	| "zap"
	| "user-round-group"
	| "plane"
	| "network"
	| "award";

const MARK_KEYS: Record<IconMark, string> = {
	wifi: "imgs/marks/wifi/key",
	bluetooth: "imgs/marks/bluetooth/key",
	combo: "imgs/marks/combo/key",
	radio: "imgs/marks/radio/key",
	podium: "imgs/marks/podium/key",
	car: "imgs/marks/car/key",
	calendar: "imgs/marks/calendar/key",
	swords: "imgs/marks/swords/key",
	coins: "imgs/marks/coins/key",
	"biceps-flexed": "imgs/marks/biceps-flexed/key",
	zap: "imgs/marks/zap/key",
	"user-round-group": "imgs/marks/user-round-group/key",
	plane: "imgs/marks/plane/key",
	network: "imgs/marks/network/key",
	award: "imgs/marks/award/key"
};

export function markKeyImage(mark: IconMark): string {
	return MARK_KEYS[mark];
}

/** Platform summary keys — Lucide radio for all platforms. */
export function platformKeyImage(_platform: Platform): string {
	return MARK_KEYS.radio;
}

/**
 * Stat key mark:
 * - WDGWars Total → radio; BLE → bluetooth; Aircraft → plane;
 *   Mesh → network; Badges → award
 * - WiGLE Rank / Month rank → podium
 * - Wardrift Routes → car; Streak → calendar; Threats → swords;
 *   Coin → coins; Level → biceps-flexed; To next → zap;
 *   Faction → user-round-group
 * - WiFi-specific / else → wifi
 */
export function statKeyImage(settings: StatActionSettings): string {
	if (settings.platform === "wdgwars") {
		switch (settings.wdgwarsMetric) {
			case "total":
				return MARK_KEYS.radio;
			case "ble":
				return MARK_KEYS.bluetooth;
			case "aircraft":
				return MARK_KEYS.plane;
			case "mesh":
				return MARK_KEYS.network;
			case "badges":
				return MARK_KEYS.award;
			default:
				break;
		}
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
			case "faction":
				return MARK_KEYS["user-round-group"];
			default:
				break;
		}
	}
	return MARK_KEYS.wifi;
}

/** Refresh: All / WDGWars keep combo; WiGLE / Wardrift → wifi. */
export function refreshKeyImage(platform: Platform | "all"): string {
	if (platform === "all" || platform === "wdgwars") {
		return MARK_KEYS.combo;
	}
	return MARK_KEYS.wifi;
}
