import streamDeck from "@elgato/streamdeck";

import type { GlobalSettings, Platform } from "../settings.js";
import {
	ALL_PLATFORMS,
	hasPlatformCredentials,
	parseGlobalSettings
} from "../settings.js";
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
	/** Fingerprint of credential + poll settings (excludes Wardrift session token). */
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
		const fingerprint = credentialFingerprint(settings);
		if (!force && fingerprint === this.settingsFingerprint) {
			// Session-token persistence must not cascade into a full re-poll.
			return;
		}
		this.settingsFingerprint = fingerprint;
		for (const platform of ALL_PLATFORMS) {
			this.schedule(platform, settings, true);
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

	private schedule(platform: Platform, settings: GlobalSettings, immediate: boolean): void {
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

		const delay = immediate ? 0 : this.pollIntervalMs(platform, settings);
		st.timer = setTimeout(() => {
			void this.poll(platform, settings, false).finally(() => {
				void this.rescheduleAfterPoll(platform);
			});
		}, delay);
	}

	private async rescheduleAfterPoll(platform: Platform): Promise<void> {
		const settings = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
		const st = this.state[platform];
		const base = this.pollIntervalMs(platform, settings);
		const wait = Math.max(base, st.nextAllowedAt - Date.now());
		const jittered = wait * (1 + (Math.random() * 2 - 1) * JITTER_RATIO);

		if (st.timer) {
			clearTimeout(st.timer);
		}
		st.timer = setTimeout(() => {
			void this.poll(platform, settings, false).finally(() => {
				void this.rescheduleAfterPoll(platform);
			});
		}, Math.max(1000, jittered));
	}

	private pollIntervalMs(platform: Platform, settings: GlobalSettings): number {
		switch (platform) {
			case "wigle":
				return Math.max(1, settings.wiglePollMinutes) * 60_000;
			case "wdgwars":
				return Math.max(1, settings.wdgwarsPollMinutes) * 60_000;
			case "wardrift":
				return Math.max(1, settings.wardriftPollMinutes) * 60_000;
			default:
				return 15 * 60_000;
		}
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

	private async pollWigle(settings: GlobalSettings, st: PlatformState): Promise<void> {
		const result = await fetchWigleUserStats(settings);
		if (result.ok) {
			this.wigle = {
				data: result.data,
				lastSuccessAt: Date.now(),
				lastErrorAt: null,
				lastError: null,
				configured: true
			};
			st.backoffMs = DEFAULT_BACKOFF_MS;
			st.nextAllowedAt = 0;
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
			this.wdgwars = {
				data: result.data,
				lastSuccessAt: Date.now(),
				lastErrorAt: null,
				lastError: null,
				configured: true
			};
			st.backoffMs = DEFAULT_BACKOFF_MS;
			st.nextAllowedAt = 0;
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
			this.wardrift = {
				data: result.data,
				lastSuccessAt: Date.now(),
				lastErrorAt: null,
				lastError: null,
				configured: true
			};
			st.backoffMs = DEFAULT_BACKOFF_MS;
			st.nextAllowedAt = 0;
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

		// Auth / client errors: don't hammer; wait a poll cycle via nextAllowedAt short bump.
		// Match CYDesk RETRY_MS ≈ 60s on Wardrift errors.
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

function credentialFingerprint(settings: GlobalSettings): string {
	return [
		settings.wigleApiName,
		settings.wigleApiToken,
		settings.wdgwarsApiKey,
		settings.wardriftUsername,
		settings.wardriftPassword,
		settings.wiglePollMinutes,
		settings.wdgwarsPollMinutes,
		settings.wardriftPollMinutes
	].join("\0");
}

/** Shared in-memory stats cache + polling scheduler. */
export const statsCache = new StatsCache();
