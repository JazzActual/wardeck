import { z } from "zod";

import type { GlobalSettings, WdgwarsMetric } from "../settings.js";
import { hasWdgwarsCredentials } from "../settings.js";

const WdgwarsMeSchema = z
	.object({
		username: z.string().optional(),
		wifi: z.number().optional(),
		ble: z.number().optional(),
		aircraft: z.number().optional(),
		mesh: z.number().optional(),
		total: z.number().optional(),
		badges: z.array(z.unknown()).optional(),
		gang: z.union([z.string(), z.null()]).optional()
	})
	.passthrough();

export type WdgwarsMe = z.infer<typeof WdgwarsMeSchema>;

export type WdgwarsFetchResult =
	| { ok: true; data: WdgwarsMe }
	| { ok: false; status?: number; error: string; retryAfterMs?: number };

export async function fetchWdgwarsMe(settings: GlobalSettings): Promise<WdgwarsFetchResult> {
	if (!hasWdgwarsCredentials(settings)) {
		return { ok: false, error: "WDGWars API key is not configured." };
	}

	try {
		const response = await fetch("https://wdgwars.pl/api/me", {
			method: "GET",
			headers: {
				Accept: "application/json",
				"X-API-Key": settings.wdgwarsApiKey.trim()
			}
		});

		if (response.status === 429) {
			const retryAfter = parseRetryAfterMs(response.headers.get("Retry-After"));
			return {
				ok: false,
				status: 429,
				error: "WDGWars rate limited (429).",
				retryAfterMs: retryAfter
			};
		}

		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				error: `WDGWars request failed (${response.status}).`
			};
		}

		const json: unknown = await response.json();
		const parsed = WdgwarsMeSchema.safeParse(json);
		if (!parsed.success) {
			return { ok: false, error: "WDGWars response did not match expected shape." };
		}

		return { ok: true, data: parsed.data };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "WDGWars network error."
		};
	}
}

export function readWdgwarsMetric(
	data: WdgwarsMe,
	metric: WdgwarsMetric
): number | string | null {
	switch (metric) {
		case "total":
			return data.total ?? null;
		case "wifi":
			return data.wifi ?? null;
		case "ble":
			return data.ble ?? null;
		case "gang":
			return data.gang ?? null;
		case "aircraft":
			return data.aircraft ?? null;
		case "mesh":
			return data.mesh ?? null;
		case "badges":
			return Array.isArray(data.badges) ? data.badges.length : null;
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
