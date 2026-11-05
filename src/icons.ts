import type { Platform, StatActionSettings } from "./settings.js";

/** Only three marks — wifi / bluetooth / combo — reused everywhere. */
export type IconMark = "wifi" | "bluetooth" | "combo";

const MARK_KEYS: Record<IconMark, string> = {
	wifi: "imgs/marks/wifi/key",
	bluetooth: "imgs/marks/bluetooth/key",
	combo: "imgs/marks/combo/key"
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

/** Stat key: BLE metrics → bluetooth; otherwise wifi (WDGWars total stays wifi). */
export function statKeyImage(settings: StatActionSettings): string {
	if (settings.platform === "wdgwars" && settings.wdgwarsMetric === "ble") {
		return MARK_KEYS.bluetooth;
	}
	return MARK_KEYS.wifi;
}

export function refreshKeyImage(platform: Platform | "all"): string {
	if (platform === "all" || platform === "wdgwars") {
		return MARK_KEYS.combo;
	}
	return MARK_KEYS.wifi;
}
