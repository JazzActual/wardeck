import streamDeck from "@elgato/streamdeck";
import { z } from "zod";

import type { GlobalSettings, WardriftMetric } from "../settings.js";
import { hasWardriftCredentials } from "../settings.js";

const FACTION_NAMES: Record<number, string> = {
	1: "Arcanum",
	2: "Crusade",
	3: "Technocracy"
};

const WardriftCharacterSchema = z
	.object({
		name: z.string().optional(),
		level: z.number().optional(),
		currency: z.number().optional(),
		exp_to_next_level: z.number().optional(),
		faction_id: z.number().optional(),
		faction: z.union([z.string(), z.number()]).optional(),
		class_name: z.string().optional()
	})
	.passthrough();

const WardriftDashboardSchema = z
	.object({
		characters: z.array(WardriftCharacterSchema).optional(),
		wardrive: z
			.object({
				lifetime: z
					.object({
						access_points_discovered: z.number().optional(),
						routes_logged: z.number().optional(),
						threats_flagged: z.number().optional()
					})
					.passthrough()
					.optional(),
				streak_days: z.number().optional()
			})
			.passthrough()
			.optional()
	})
	.passthrough();

const WardriftSignInSchema = z
	.object({
		session: z
			.object({
				token: z.string(),
				expires_at: z.string().optional()
			})
			.passthrough()
	})
	.passthrough();

export type WardriftDashboard = z.infer<typeof WardriftDashboardSchema>;

export type WardriftSession = {
	token: string;
	expiresAt: string;
};

export type WardriftFetchResult =
	| { ok: true; data: WardriftDashboard; session?: WardriftSession }
	| { ok: false; status?: number; error: string; retryAfterMs?: number; clearSession?: boolean };

/** In-memory session so we do not re-auth every poll within one process lifetime. */
let memorySession: WardriftSession | null = null;

export function clearWardriftMemorySession(): void {
	memorySession = null;
}

export async function fetchWardriftDashboard(
	settings: GlobalSettings
): Promise<WardriftFetchResult> {
	if (!hasWardriftCredentials(settings)) {
		clearWardriftMemorySession();
		return { ok: false, error: "Wardrift username and password are not configured." };
	}

	let session = resolveSession(settings);
	let signedInThisCall: WardriftSession | undefined;

	if (!session) {
		const auth = await signIn(settings);
		if (!auth.ok) {
			return auth;
		}
		session = auth.session;
		signedInThisCall = auth.session;
		memorySession = auth.session;
		await persistSession(settings, auth.session);
	}

	const first = await getDashboard(session.token);
	if (first.ok) {
		return signedInThisCall ? { ...first, session: signedInThisCall } : first;
	}

	// CYDesk: on 401 clear token → sign-in once → retry GET once.
	if (first.status === 401) {
		memorySession = null;
		await persistSession(settings, null);

		const auth = await signIn(settings);
		if (!auth.ok) {
			return { ...auth, clearSession: true };
		}
		memorySession = auth.session;
		await persistSession(settings, auth.session);

		const retry = await getDashboard(auth.session.token);
		if (retry.ok) {
			return { ...retry, session: auth.session };
		}
		if (retry.status === 401) {
			memorySession = null;
			await persistSession(settings, null);
			return {
				ok: false,
				status: 401,
				error: "Wardrift account refused after re-sign-in.",
				clearSession: true
			};
		}
		return { ...retry, clearSession: false };
	}

	return first;
}

export function readWardriftMetric(
	data: WardriftDashboard,
	metric: WardriftMetric
): number | string | null {
	const character = data.characters?.[0];
	const lifetime = data.wardrive?.lifetime;

	switch (metric) {
		case "networks":
			return lifetime?.access_points_discovered ?? null;
		case "routes":
			return lifetime?.routes_logged ?? null;
		case "threats":
			return lifetime?.threats_flagged ?? null;
		case "streak":
			return data.wardrive?.streak_days ?? null;
		case "level":
			return character?.level ?? null;
		case "currency":
			return character?.currency ?? null;
		case "expToNext":
			return character?.exp_to_next_level ?? null;
		case "name":
			return character?.name ?? null;
		default:
			return null;
	}
}

type WardriftCharacter = NonNullable<WardriftDashboard["characters"]>[number];

export function resolveFaction(character: WardriftCharacter | undefined): string | undefined {
	if (!character) {
		return undefined;
	}
	if (typeof character.faction === "string" && character.faction.trim()) {
		return character.faction.trim();
	}
	const id =
		typeof character.faction_id === "number"
			? character.faction_id
			: typeof character.faction === "number"
				? character.faction
				: undefined;
	if (id !== undefined) {
		return FACTION_NAMES[id] ?? String(id);
	}
	return undefined;
}

function resolveSession(settings: GlobalSettings): WardriftSession | null {
	if (memorySession?.token) {
		return memorySession;
	}
	const token = settings.wardriftSessionToken.trim();
	if (!token) {
		return null;
	}
	const expiresAt = settings.wardriftSessionExpiresAt.trim();
	if (expiresAt) {
		const expiresMs = Date.parse(expiresAt);
		// Re-auth a minute early if we have a parseable expiry.
		if (!Number.isNaN(expiresMs) && expiresMs <= Date.now() + 60_000) {
			return null;
		}
	}
	memorySession = { token, expiresAt };
	return memorySession;
}

async function signIn(
	settings: GlobalSettings
): Promise<
	| { ok: true; session: WardriftSession }
	| { ok: false; status?: number; error: string; retryAfterMs?: number }
> {
	try {
		const response = await fetch("https://wardrift.net/v1/auth/sign-in/username", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				username: settings.wardriftUsername.trim(),
				password: settings.wardriftPassword,
				remember_me: true
			})
		});

		if (response.status === 401 || response.status === 403) {
			return {
				ok: false,
				status: response.status,
				error: "Wardrift login not accepted."
			};
		}

		if (response.status === 429) {
			return {
				ok: false,
				status: 429,
				error: "Wardrift rate limited (429).",
				retryAfterMs: parseRetryAfterMs(response.headers.get("Retry-After"))
			};
		}

		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				error: `Wardrift sign-in failed (${response.status}).`
			};
		}

		const json: unknown = await response.json();
		const parsed = WardriftSignInSchema.safeParse(json);
		if (!parsed.success || !parsed.data.session.token) {
			return { ok: false, error: "Wardrift sign-in response did not include a session token." };
		}

		return {
			ok: true,
			session: {
				token: parsed.data.session.token,
				expiresAt: parsed.data.session.expires_at ?? ""
			}
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Wardrift sign-in network error."
		};
	}
}

async function getDashboard(token: string): Promise<WardriftFetchResult> {
	try {
		const response = await fetch("https://wardrift.net/v1/dashboard", {
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`
			}
		});

		if (response.status === 429) {
			return {
				ok: false,
				status: 429,
				error: "Wardrift rate limited (429).",
				retryAfterMs: parseRetryAfterMs(response.headers.get("Retry-After"))
			};
		}

		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				error: `Wardrift dashboard failed (${response.status}).`
			};
		}

		const json: unknown = await response.json();
		const parsed = WardriftDashboardSchema.safeParse(json);
		if (!parsed.success) {
			return { ok: false, error: "Wardrift dashboard response did not match expected shape." };
		}

		return { ok: true, data: parsed.data };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Wardrift dashboard network error."
		};
	}
}

async function persistSession(
	settings: GlobalSettings,
	session: WardriftSession | null
): Promise<void> {
	const nextToken = session?.token ?? "";
	const nextExpires = session?.expiresAt ?? "";
	if (
		settings.wardriftSessionToken === nextToken &&
		settings.wardriftSessionExpiresAt === nextExpires
	) {
		return;
	}

	try {
		await streamDeck.settings.setGlobalSettings({
			...settings,
			wardriftSessionToken: nextToken,
			wardriftSessionExpiresAt: nextExpires
		});
	} catch (err) {
		// Never log credentials or the token itself.
		streamDeck.logger.warn(
			`Failed to persist Wardrift session metadata: ${err instanceof Error ? err.message : "unknown error"}`
		);
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
