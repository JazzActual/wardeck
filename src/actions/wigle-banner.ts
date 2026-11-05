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
 * Cols: WIFI GPS | RANK + MONTHLY RANK | MONTHLY EVENTS | BT GPS
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
			{ kind: "solo", label: "WIFI GPS", value: asNumber(readWigleMetric(data, "wifiGps")) },
			{
				kind: "split",
				left: { label: "RANK", value: asNumber(readWigleMetric(data, "rank")), x: 212 },
				right: {
					label: "MONTHLY RANK",
					value: asNumber(readWigleMetric(data, "monthRank")),
					x: 300
				}
			},
			{
				kind: "solo",
				label: "MONTHLY EVENTS",
				value: asNumber(readWigleMetric(data, "monthEvents")),
				x: 412
			},
			{ kind: "solo", label: "BT GPS", value: readBtGps(data), x: 612 }
		]
	};
}

function emptyModel(statusMessage: string): ComposedBannerModel {
	return {
		identity: "WiGLE",
		brand: "WIGLE",
		statusMessage,
		columns: [
			{ kind: "solo", label: "WIFI GPS", value: null },
			{
				kind: "split",
				left: { label: "RANK", value: null, x: 212 },
				right: { label: "MONTHLY RANK", value: null, x: 300 }
			},
			{ kind: "solo", label: "MONTHLY EVENTS", value: null, x: 412 },
			{ kind: "solo", label: "BT GPS", value: null, x: 612 }
		]
	};
}

function readBtGps(data: WigleUserStats): number | null {
	const value = data.statistics?.discoveredBtGPS;
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
