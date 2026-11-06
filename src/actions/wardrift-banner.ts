import { action } from "@elgato/streamdeck";

import { DialBannerAction, truncateStatus } from "../banner/dial-banner.js";
import {
	buildIdentityLine,
	type ComposedBannerModel
} from "../banner/render.js";
import { statsCache } from "../services/cache.js";
import { readWardriftMetric, resolveFaction } from "../services/wardrift.js";

/**
 * Display-only Stream Deck+ Encoder action.
 * Same action on all four dials; one 800×100 banner sliced into 200×100 pixmaps.
 * Sample A Lucide: radio / car+swords / calendar / coins+zap.
 */
@action({ UUID: "com.jazzactual.wardeck.wardrift-banner" })
export class WardriftBannerAction extends DialBannerAction {
	protected buildModel(): ComposedBannerModel {
		return buildWardriftBannerModel();
	}
}

export function buildWardriftBannerModel(): ComposedBannerModel {
	const entry = statsCache.getWardrift();

	if (!entry.configured) {
		return emptyModel("Add Wardrift credentials in Property Inspector");
	}

	if (!entry.data) {
		return emptyModel(truncateStatus(entry.lastError ?? "Waiting for Wardrift data…"));
	}

	const data = entry.data;
	const character = data.characters?.[0];
	const name = readWardriftMetric(data, "name");
	const faction = resolveFaction(character) ?? readWardriftMetric(data, "faction");
	const level = readWardriftMetric(data, "level");
	const className =
		typeof character?.class_name === "string" ? character.class_name : undefined;
	const levelClass =
		typeof level === "number"
			? `L${Math.round(level)}${className ? ` ${className}` : ""}`
			: className;

	return {
		identity: buildIdentityLine(
			[
				typeof name === "string" ? name : null,
				typeof faction === "string" ? faction : null,
				levelClass
			],
			"Wardrift"
		),
		brand: "WARDRIFT",
		columns: [
			{
				kind: "solo",
				label: "NETWORKS",
				value: asNumber(readWardriftMetric(data, "networks")),
				lucide: "radio"
			},
			{
				kind: "split",
				left: {
					label: "ROUTES",
					value: asNumber(readWardriftMetric(data, "routes")),
					x: 212,
					lucide: "car"
				},
				right: {
					label: "THREATS",
					value: asNumber(readWardriftMetric(data, "threats")),
					x: 308,
					lucide: "swords"
				}
			},
			// Locked: streak 0 must render as 0 (not hidden / not Coin fallback).
			{
				kind: "solo",
				label: "STREAK",
				value: asNumber(readWardriftMetric(data, "streak")),
				lucide: "calendar",
				centered: true
			},
			{
				kind: "split",
				left: {
					label: "COIN",
					value: asNumber(readWardriftMetric(data, "currency")),
					x: 612,
					lucide: "coins"
				},
				right: {
					label: "TO NEXT",
					value: asNumber(readWardriftMetric(data, "expToNext")),
					x: 710,
					lucide: "zap"
				}
			}
		]
	};
}

function emptyModel(statusMessage: string): ComposedBannerModel {
	return {
		identity: "Wardrift",
		brand: "WARDRIFT",
		statusMessage,
		columns: [
			{ kind: "solo", label: "NETWORKS", value: null, lucide: "radio" },
			{
				kind: "split",
				left: { label: "ROUTES", value: null, x: 212, lucide: "car" },
				right: { label: "THREATS", value: null, x: 308, lucide: "swords" }
			},
			{ kind: "solo", label: "STREAK", value: null, lucide: "calendar", centered: true },
			{
				kind: "split",
				left: { label: "COIN", value: null, x: 612, lucide: "coins" },
				right: { label: "TO NEXT", value: null, x: 710, lucide: "zap" }
			}
		]
	};
}

function asNumber(value: number | string | null): number | null {
	return typeof value === "number" && !Number.isNaN(value) ? value : null;
}
