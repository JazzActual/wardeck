import type { KeyMark } from "./key/render.js";
import type { Platform, StatActionSettings } from "./settings.js";

/** Lucide-backed marks bundled under imgs/marks/ (static fallbacks / PI). */
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
	| "plane"
	| "network"
	| "award"
	| "radio-tower";

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
	plane: "imgs/marks/plane/key",
	network: "imgs/marks/network/key",
	award: "imgs/marks/award/key",
	"radio-tower": "imgs/marks/radio-tower/key"
};

export function markKeyImage(mark: IconMark): string {
	return MARK_KEYS[mark];
}

/** Platform summary keys — Lucide radio for all platforms. */
export function platformKeyImage(_platform: Platform): string {
	return MARK_KEYS.radio;
}

export function platformKeyMark(_platform: Platform): KeyMark {
	return "radio";
}

/**
 * Stat key mark:
 * - WDGWars Total → radio; BLE → bluetooth; Aircraft → plane;
 *   Mesh → network; Badges → award
 * - WiGLE Rank / Month rank → podium; Cell → radio-tower
 * - Wardrift Networks → radio; Routes → car; Streak → calendar;
 *   Threats → swords; Coin → coins; Level → biceps-flexed;
 *   To next → zap
 * - WiFi-specific / else → wifi
 */
export function resolveStatMark(settings: StatActionSettings): KeyMark {
	if (settings.platform === "wdgwars") {
		switch (settings.wdgwarsMetric) {
			case "total":
				return "radio";
			case "ble":
				return "bluetooth";
			case "aircraft":
				return "plane";
			case "mesh":
				return "network";
			case "badges":
				return "award";
			default:
				break;
		}
	}
	if (settings.platform === "wigle") {
		if (settings.wigleMetric === "rank" || settings.wigleMetric === "monthRank") {
			return "podium";
		}
		if (settings.wigleMetric === "cell") {
			return "radio-tower";
		}
	}
	if (settings.platform === "wardrift") {
		switch (settings.wardriftMetric) {
			case "networks":
				return "radio";
			case "routes":
				return "car";
			case "streak":
				return "calendar";
			case "threats":
				return "swords";
			case "currency":
				return "coins";
			case "level":
				return "biceps-flexed";
			case "expToNext":
				return "zap";
			default:
				break;
		}
	}
	return "wifi";
}

export function statKeyImage(settings: StatActionSettings): string {
	const mark = resolveStatMark(settings);
	return MARK_KEYS[mark as IconMark] ?? MARK_KEYS.wifi;
}
