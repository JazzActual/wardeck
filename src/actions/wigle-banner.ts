import { action } from "@elgato/streamdeck";

import { DialBannerAction, truncateStatus } from "../banner/dial-banner.js";
import {
	buildIdentityLine,
	type ComposedBannerModel
} from "../banner/render.js";
import { statsCache } from "../services/cache.js";
import { readWigleMetric, type WigleUserStats } from "../services/wigle.js";

/**
 * WiGLE Sample A composed dial banner (display-only).
 * Cols: WIFI | RANK + MONTHLY RANK | MONTHLY EVENTS | BT
 * Lucide: wifi / podium+podium / calendar / bluetooth
 */
@action({ UUID: "com.jazzactual.wardeck.wigle-banner" })
export class WigleBannerAction extends DialBannerAction {
	protected buildModel(): ComposedBannerModel {
		return buildWigleBannerModel();
	}
}

export function buildWigleBannerModel(): ComposedBannerModel {
	const entry = statsCache.getWigle();

	if (!entry.configured) {
		return emptyModel("Add WiGLE credentials in Property Inspector");
	}

	if (!entry.data) {
		return emptyModel(truncateStatus(entry.lastError ?? "Waiting for WiGLE data…"));
	}

	const data = entry.data;
	const username = (data.userName ?? data.user ?? "").trim() || "WiGLE";

	return {
		identity: buildIdentityLine([truncateName(username)], "WiGLE"),
		brand: "WIGLE",
		columns: [
			{
				kind: "solo",
				label: "WIFI",
				value: asNumber(readWigleMetric(data, "wifiAll")),
				lucide: "wifi"
			},
			{
				kind: "split",
				left: {
					label: "RANK",
					value: asNumber(readWigleMetric(data, "rank")),
					x: 212,
					lucide: "podium"
				},
				right: {
					label: "MONTHLY RANK",
					value: asNumber(readWigleMetric(data, "monthRank")),
					x: 300,
					lucide: "podium"
				}
			},
			{
				kind: "solo",
				label: "MONTHLY EVENTS",
				value: asNumber(readWigleMetric(data, "monthEvents")),
				lucide: "calendar",
				x: 412
			},
			{ kind: "solo", label: "BT", value: readBt(data), lucide: "bluetooth", x: 612 }
		]
	};
}

function emptyModel(statusMessage: string): ComposedBannerModel {
	return {
		identity: "WiGLE",
		brand: "WIGLE",
		statusMessage,
		columns: [
			{ kind: "solo", label: "WIFI", value: null, lucide: "wifi" },
			{
				kind: "split",
				left: { label: "RANK", value: null, x: 212, lucide: "podium" },
				right: { label: "MONTHLY RANK", value: null, x: 300, lucide: "podium" }
			},
			{ kind: "solo", label: "MONTHLY EVENTS", value: null, lucide: "calendar", x: 412 },
			{ kind: "solo", label: "BT", value: null, lucide: "bluetooth", x: 612 }
		]
	};
}

function readBt(data: WigleUserStats): number | null {
	const value = data.statistics?.discoveredBt;
	return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function asNumber(value: number | string | null): number | null {
	return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function truncateName(name: string): string {
	if (name.length <= 22) {
		return name;
	}
	return `${name.slice(0, 21)}…`;
}
