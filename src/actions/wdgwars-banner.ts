import { action } from "@elgato/streamdeck";

import { DialBannerAction, truncateStatus } from "../banner/dial-banner.js";
import {
	buildIdentityLine,
	type ComposedBannerModel
} from "../banner/render.js";
import { statsCache } from "../services/cache.js";
import { readWdgwarsMetric, type WdgwarsMe } from "../services/wdgwars.js";

/**
 * WDGWars Sample A composed dial banner (display-only).
 * Cols: TOTAL | WIFI + BLE | AIRCRAFT | MESH + BADGES
 * Lucide: radio / wifi+bluetooth / plane / network+award
 */
@action({ UUID: "com.jazzactual.wardeck.wdgwars-banner" })
export class WdgwarsBannerAction extends DialBannerAction {
	protected cachePlatform(): "wdgwars" {
		return "wdgwars";
	}

	protected buildModel(): ComposedBannerModel {
		return buildWdgwarsBannerModel();
	}
}

export function buildWdgwarsBannerModel(): ComposedBannerModel {
	const entry = statsCache.getWdgwars();

	if (!entry.configured) {
		return emptyModel("Add WDGWars credentials in Property Inspector");
	}

	if (!entry.data) {
		return emptyModel(truncateStatus(entry.lastError ?? "Waiting for WDGWars data…"));
	}

	const data = entry.data;
	const username = (data.username ?? "").trim();

	return {
		identity: buildIdentityLine([username || null], "WDGWars"),
		brand: "WDGWARS",
		columns: [
			{
				kind: "solo",
				label: "TOTAL",
				value: asNumber(readWdgwarsMetric(data, "total")),
				lucide: "radio"
			},
			{
				kind: "split",
				left: {
					label: "WIFI",
					value: asNumber(readWdgwarsMetric(data, "wifi")),
					x: 212,
					lucide: "wifi"
				},
				right: {
					label: "BLE",
					value: asNumber(readWdgwarsMetric(data, "ble")),
					x: 308,
					lucide: "bluetooth"
				}
			},
			{
				kind: "solo",
				label: "AIRCRAFT",
				value: readAircraft(data),
				lucide: "plane",
				centered: true
			},
			{
				kind: "split",
				left: { label: "MESH", value: readMesh(data), x: 612, lucide: "network" },
				right: { label: "BADGES", value: readBadgeCount(data), x: 710, lucide: "award" }
			}
		]
	};
}

function emptyModel(statusMessage: string): ComposedBannerModel {
	return {
		identity: "WDGWars",
		brand: "WDGWARS",
		statusMessage,
		columns: [
			{ kind: "solo", label: "TOTAL", value: null, lucide: "radio" },
			{
				kind: "split",
				left: { label: "WIFI", value: null, x: 212, lucide: "wifi" },
				right: { label: "BLE", value: null, x: 308, lucide: "bluetooth" }
			},
			{ kind: "solo", label: "AIRCRAFT", value: null, lucide: "plane", centered: true },
			{
				kind: "split",
				left: { label: "MESH", value: null, x: 612, lucide: "network" },
				right: { label: "BADGES", value: null, x: 710, lucide: "award" }
			}
		]
	};
}

function readAircraft(data: WdgwarsMe): number | null {
	const value = data.aircraft;
	return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function readMesh(data: WdgwarsMe): number | null {
	const value = data.mesh;
	return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function readBadgeCount(data: WdgwarsMe): number | null {
	if (!Array.isArray(data.badges)) {
		return null;
	}
	return data.badges.length;
}

function asNumber(value: number | string | null): number | null {
	return typeof value === "number" && !Number.isNaN(value) ? value : null;
}
