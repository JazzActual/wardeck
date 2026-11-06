import streamDeck from "@elgato/streamdeck";

import type { GlobalSettings, Platform } from "../settings.js";
import {
	ALL_PLATFORMS,
	hasPlatformCredentials,
	parseGlobalSettings
} from "../settings.js";
import {
	parsePersistedFetchAt,
	planDailyPoll,
	planIntervalPoll,
	WARDRIFT_POLL_MS,
	WDGWARS_POLL_MS,
	type SchedulePlan
} from "../schedule.js";
import { fetchWdgwarsMe, type WdgwarsMe } from "./wdgwars.js";
import {
	clearWardriftMemorySession,
	fetchWardriftDashboard,
	type WardriftDashboard
} from "./wardrift.js";
import { fetchWigleUserStats, type WigleUserStats } from "./wigle.js";

export type CacheEntry<T> = {
	data: T | null;
	lastSuccessAt: number | null;
	lastErrorAt: number | null;
	lastError: string | null;
	configured: boolean;
};

type PlatformState = {
	timer: ReturnType<typeof setTimeout> | null;
	inFlight: Promise<void> | null;
	backoffMs: number;
	nextAllowedAt: number;
};

const DEFAULT_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 30 * 60_000;
const JITTER_RATIO = 0.2;

class StatsCache {
	wigle: CacheEntry<WigleUserStats> = emptyEntry();
	wdgwars: CacheEntry<WdgwarsMe> = emptyEntry();
	wardrift: CacheEntry<WardriftDashboard> = emptyEntry();

	private listeners = new Set<() => void>();
	private state: Record<Platform, PlatformState> = {
		wigle: idleState(),
		wdgwars: idleState(),
		wardrift: idleState()
	};
	private started = false;
	/** Fingerprint of credential + schedule settings (excludes session token + last-fetch). */
	private settingsFingerprint = "";

	onUpdate(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (err) {
				streamDeck.logger.error("Stats cache listener failed", err);
			}
		}
	}

	async start(): Promise<void> {
		if (this.started) {
			return;
		}
		this.started = true;
		await this.refreshFromGlobalSettings(true);
		streamDeck.settings.onDidReceiveGlobalSettings(() => {
			void this.refreshFromGlobalSettings(false);
		});
	}

	async refreshFromGlobalSettings(force = false): Promise<void> {
		const settings = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
		this.hydrateLastFetch(settings);
		const fingerprint = scheduleFingerprint(settings);
		if (!force && fingerprint === this.settingsFingerprint) {
			// Session-token / last-fetch persistence must not cascade into a full re-poll.
			return;
		}
		this.settingsFingerprint = fingerprint;
		for (const platform of ALL_PLATFORMS) {
			this.schedule(platform, settings);
		}
	}

	async refresh(platform: Platform | "all", force = true): Promise<void> {
		const settings = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
		const targets: Platform[] = platform === "all" ? [...ALL_PLATFORMS] : [platform];

		await Promise.all(targets.map((p) => this.poll(p, settings, force)));
	}

	getWigle(): CacheEntry<WigleUserStats> {
		return this.wigle;
	}

	getWdgwars(): CacheEntry<WdgwarsMe> {
		return this.wdgwars;
	}

	getWardrift(): CacheEntry<WardriftDashboard> {
		return this.wardrift;
	}

	private hydrateLastFetch(settings: GlobalSettings): void {
		const wigleAt = parsePersistedFetchAt(settings.wigleLastFetchAt);
		if (wigleAt !== null && this.wigle.lastSuccessAt === null) {
			this.wigle = {
				...this.wigle,
				lastSuccessAt: wigleAt,
				configured: hasPlatformCredentials("wigle", settings)
			};
		}
		const wdgwarsAt = parsePersistedFetchAt(settings.wdgwarsLastFetchAt);
		if (wdgwarsAt !== null && this.wdgwars.lastSuccessAt === null) {
			this.wdgwars = {
				...this.wdgwars,
				lastSuccessAt: wdgwarsAt,
				configured: hasPlatformCredentials("wdgwars", settings)
			};
		}
		const wardriftAt = parsePersistedFetchAt(settings.wardriftLastFetchAt);
		if (wardriftAt !== null && this.wardrift.lastSuccessAt === null) {
			this.wardrift = {
				...this.wardrift,
				lastSuccessAt: wardriftAt,
				configured: hasPlatformCredentials("wardrift", settings)
			};
		}
	}

	private planFor(platform: Platform, settings: GlobalSettings): SchedulePlan {
		switch (platform) {
			case "wigle":
				return planDailyPoll(
					effectiveLastFetch(settings.wigleLastFetchAt, this.wigle.lastSuccessAt),
					settings.wigleDailyTime,
					settings.wigleTimezone
				);
			case "wdgwars":
				return planIntervalPoll(
					effectiveLastFetch(settings.wdgwarsLastFetchAt, this.wdgwars.lastSuccessAt),
					WDGWARS_POLL_MS
				);
			case "wardrift":
				return planIntervalPoll(
					effectiveLastFetch(settings.wardriftLastFetchAt, this.wardrift.lastSuccessAt),
					WARDRIFT_POLL_MS
				);
			default:
				return { immediate: true, delayMs: 0 };
		}
	}

	private schedule(platform: Platform, settings: GlobalSettings): void {
		const st = this.state[platform];
		if (st.timer) {
			clearTimeout(st.timer);
			st.timer = null;
		}

		const configured = hasPlatformCredentials(platform, settings);

		if (!configured) {
			this.clearPlatform(platform);
			this.notify();
			return;
		}

		const plan = this.planFor(platform, settings);
		const delay = plan.immediate ? 0 : plan.delayMs;
		st.timer = setTimeout(() => {
			void this.poll(platform, settings, false).finally(() => {
				void this.rescheduleAfterPoll(platform);
			});
		}, delay);
	}

	private async rescheduleAfterPoll(platform: Platform): Promise<void> {
		const settings = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
		const st = this.state[platform];

		if (!hasPlatformCredentials(platform, settings)) {
			this.clearPlatform(platform);
			this.notify();
			return;
		}

		const plan = this.planFor(platform, settings);
		let wait = plan.immediate ? 0 : plan.delayMs;
		wait = Math.max(wait, st.nextAllowedAt - Date.now());

		// Light jitter on fixed intervals only — keep WiGLE on the wall-clock slot.
		if (platform !== "wigle" && wait > 0) {
			wait = wait * (1 + (Math.random() * 2 - 1) * JITTER_RATIO);
		}

		if (st.timer) {
			clearTimeout(st.timer);
		}
		st.timer = setTimeout(() => {
			void this.poll(platform, settings, false).finally(() => {
				void this.rescheduleAfterPoll(platform);
			});
		}, Math.max(1000, wait));
	}

	private clearPlatform(platform: Platform): void {
		if (platform === "wigle") {
			this.wigle = emptyEntry(false);
		} else if (platform === "wdgwars") {
			this.wdgwars = emptyEntry(false);
		} else {
			clearWardriftMemorySession();
			this.wardrift = emptyEntry(false);
		}
	}

	private async poll(platform: Platform, settings: GlobalSettings, force: boolean): Promise<void> {
		const st = this.state[platform];
		if (st.inFlight) {
			if (!force) {
				return st.inFlight;
			}
			await st.inFlight;
		}

		if (!hasPlatformCredentials(platform, settings)) {
			this.clearPlatform(platform);
			this.notify();
			return;
		}

		if (!force && Date.now() < st.nextAllowedAt) {
			return;
		}

		st.inFlight = (async () => {
			if (platform === "wigle") {
				await this.pollWigle(settings, st);
			} else if (platform === "wdgwars") {
				await this.pollWdgwars(settings, st);
			} else {
				await this.pollWardrift(settings, st);
			}
			this.notify();
		})().finally(() => {
			st.inFlight = null;
		});

		return st.inFlight;
	}

	private async persistLastFetch(platform: Platform, atMs: number): Promise<void> {
		const iso = new Date(atMs).toISOString();
		const current = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
		const key =
			platform === "wigle"
				? "wigleLastFetchAt"
				: platform === "wdgwars"
					? "wdgwarsLastFetchAt"
					: "wardriftLastFetchAt";
		if (current[key] === iso) {
			return;
		}
		await streamDeck.settings.setGlobalSettings({
			...current,
			[key]: iso
		});
	}

	private async pollWigle(settings: GlobalSettings, st: PlatformState): Promise<void> {
		const result = await fetchWigleUserStats(settings);
		if (result.ok) {
			const at = Date.now();
			this.wigle = {
				data: result.data,
				lastSuccessAt: at,
				lastErrorAt: null,
				lastError: null,
				configured: true
			};
			st.backoffMs = DEFAULT_BACKOFF_MS;
			st.nextAllowedAt = 0;
			await this.persistLastFetch("wigle", at);
		} else {
			this.wigle = {
				...this.wigle,
				configured: true,
				lastErrorAt: Date.now(),
				lastError: result.error
			};
			this.applyBackoff(st, result.retryAfterMs, result.status);
			streamDeck.logger.warn(`WiGLE poll failed: ${result.error}`);
		}
	}

	private async pollWdgwars(settings: GlobalSettings, st: PlatformState): Promise<void> {
		const result = await fetchWdgwarsMe(settings);
		if (result.ok) {
			const at = Date.now();
			this.wdgwars = {
				data: result.data,
				lastSuccessAt: at,
				lastErrorAt: null,
				lastError: null,
				configured: true
			};
			st.backoffMs = DEFAULT_BACKOFF_MS;
			st.nextAllowedAt = 0;
			await this.persistLastFetch("wdgwars", at);
		} else {
			this.wdgwars = {
				...this.wdgwars,
				configured: true,
				lastErrorAt: Date.now(),
				lastError: result.error
			};
			this.applyBackoff(st, result.retryAfterMs, result.status);
			streamDeck.logger.warn(`WDGWars poll failed: ${result.error}`);
		}
	}

	private async pollWardrift(settings: GlobalSettings, st: PlatformState): Promise<void> {
		const result = await fetchWardriftDashboard(settings);
		if (result.ok) {
			const at = Date.now();
			this.wardrift = {
				data: result.data,
				lastSuccessAt: at,
				lastErrorAt: null,
				lastError: null,
				configured: true
			};
			st.backoffMs = DEFAULT_BACKOFF_MS;
			st.nextAllowedAt = 0;
			await this.persistLastFetch("wardrift", at);
		} else {
			this.wardrift = {
				...this.wardrift,
				configured: true,
				lastErrorAt: Date.now(),
				lastError: result.error
			};
			this.applyBackoff(st, result.retryAfterMs, result.status);
			// Never include credentials or tokens in logs.
			streamDeck.logger.warn(`Wardrift poll failed: ${result.error}`);
		}
	}

	private applyBackoff(
		st: PlatformState,
		retryAfterMs: number | undefined,
		status: number | undefined
	): void {
		if (retryAfterMs !== undefined) {
			st.nextAllowedAt = Date.now() + retryAfterMs;
			st.backoffMs = Math.min(MAX_BACKOFF_MS, Math.max(st.backoffMs, retryAfterMs));
			return;
		}

		if (status !== undefined && status >= 500) {
			st.backoffMs = Math.min(MAX_BACKOFF_MS, st.backoffMs * 2);
			st.nextAllowedAt = Date.now() + st.backoffMs;
			return;
		}

		// Auth / client errors: don't hammer; wait a short backoff.
		st.nextAllowedAt = Date.now() + Math.min(st.backoffMs, 60_000);
	}
}

function emptyEntry<T>(configured = false): CacheEntry<T> {
	return {
		data: null,
		lastSuccessAt: null,
		lastErrorAt: null,
		lastError: null,
		configured
	};
}

function idleState(): PlatformState {
	return {
		timer: null,
		inFlight: null,
		backoffMs: DEFAULT_BACKOFF_MS,
		nextAllowedAt: 0
	};
}

function effectiveLastFetch(persisted: string, memoryMs: number | null): string {
	const persistedMs = parsePersistedFetchAt(persisted);
	if (memoryMs !== null && (persistedMs === null || memoryMs >= persistedMs)) {
		return new Date(memoryMs).toISOString();
	}
	return persisted;
}

function scheduleFingerprint(settings: GlobalSettings): string {
	return [
		settings.wigleApiName,
		settings.wigleApiToken,
		settings.wdgwarsApiKey,
		settings.wardriftUsername,
		settings.wardriftPassword,
		settings.wigleDailyTime,
		settings.wigleTimezone
	].join("\0");
}

/** Shared in-memory stats cache + polling scheduler. */
export const statsCache = new StatsCache();
