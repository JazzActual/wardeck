import { z } from "zod";

import type { GlobalSettings, WigleMetric } from "../settings.js";
import { hasWigleCredentials } from "../settings.js";

const WigleUserStatsSchema = z
	.object({
		rank: z.number().optional(),
		monthRank: z.number().optional(),
		user: z.string().optional(),
		userName: z.string().optional(),
		statistics: z
			.object({
				discoveredWiFi: z.number().optional(),
				discoveredWiFiGPS: z.number().optional(),
				discoveredBt: z.number().optional(),
				discoveredBtGPS: z.number().optional(),
				discoveredCell: z.number().optional(),
				discoveredCellGPS: z.number().optional(),
				eventMonthCount: z.number().optional(),
				eventPrevMonthCount: z.number().optional(),
				rank: z.number().optional(),
				monthRank: z.number().optional()
			})
			.passthrough()
			.optional()
	})
	.passthrough();

export type WigleUserStats = z.infer<typeof WigleUserStatsSchema>;

export type WigleFetchResult =
	| { ok: true; data: WigleUserStats }
	| { ok: false; status?: number; error: string; retryAfterMs?: number };

export async function fetchWigleUserStats(settings: GlobalSettings): Promise<WigleFetchResult> {
	if (!hasWigleCredentials(settings)) {
		return { ok: false, error: "WiGLE API Name and Token are not configured." };
	}

	const auth = Buffer.from(
		`${settings.wigleApiName.trim()}:${settings.wigleApiToken.trim()}`,
		"utf8"
	).toString("base64");

	try {
		const response = await fetch("https://api.wigle.net/api/v2/stats/user", {
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Basic ${auth}`
			}
		});

		if (response.status === 429) {
			const retryAfter = parseRetryAfterMs(response.headers.get("Retry-After"));
			return {
				ok: false,
				status: 429,
				error: "WiGLE rate limited (429).",
				retryAfterMs: retryAfter
			};
		}

		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				error: `WiGLE request failed (${response.status}).`
			};
		}

		const json: unknown = await response.json();
		const parsed = WigleUserStatsSchema.safeParse(json);
		if (!parsed.success) {
			return { ok: false, error: "WiGLE response did not match expected shape." };
		}

		return { ok: true, data: parsed.data };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "WiGLE network error."
		};
	}
}

export function readWigleMetric(data: WigleUserStats, metric: WigleMetric): number | string | null {
	const stats = data.statistics;
	switch (metric) {
		case "wifiAll":
			return stats?.discoveredWiFi ?? null;
		case "rank":
			return data.rank ?? stats?.rank ?? null;
		case "monthRank":
			return data.monthRank ?? stats?.monthRank ?? null;
		case "monthEvents":
			return stats?.eventMonthCount ?? null;
		case "cell":
			return stats?.discoveredCell ?? null;
		default:
			return null;
	}
}

function parseRetryAfterMs(header: string | null): number | undefined {
	if (!header) {
		return undefined;
	}
	const seconds = Number(header);
	if (!Number.isNaN(seconds) && seconds >= 0) {
		return seconds * 1000;
	}
	const date = Date.parse(header);
	if (!Number.isNaN(date)) {
		return Math.max(0, date - Date.now());
	}
	return undefined;
}
