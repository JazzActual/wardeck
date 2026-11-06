import type { Platform, StatActionSettings } from "./settings.js";

/** Shared runtime marks — wifi / bluetooth / combo / podium. */
export type IconMark = "wifi" | "bluetooth" | "combo" | "podium";

const MARK_KEYS: Record<IconMark, string> = {
	wifi: "imgs/marks/wifi/key",
	bluetooth: "imgs/marks/bluetooth/key",
	combo: "imgs/marks/combo/key",
	podium: "imgs/marks/podium/key"
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

/** Stat key: BLE → bluetooth; WiGLE rank / month rank → podium; else wifi. */
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
	return MARK_KEYS.wifi;
}

export function refreshKeyImage(platform: Platform | "all"): string {
	if (platform === "all" || platform === "wdgwars") {
		return MARK_KEYS.combo;
	}
	return MARK_KEYS.wifi;
}
