import streamDeck from "@elgato/streamdeck";

import type { GlobalSettings, Platform } from "../settings.js";
import {
	hasWdgwarsCredentials,
	hasWigleCredentials,
	parseGlobalSettings
} from "../settings.js";
import { fetchWdgwarsMe, type WdgwarsMe } from "./wdgwars.js";
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

	private listeners = new Set<() => void>();
	private state: Record<Platform, PlatformState> = {
		wigle: idleState(),
		wdgwars: idleState()
	};
	private started = false;

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
		await this.refreshFromGlobalSettings();
		streamDeck.settings.onDidReceiveGlobalSettings(() => {
			void this.refreshFromGlobalSettings();
		});
	}

	async refreshFromGlobalSettings(): Promise<void> {
		const settings = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
		this.schedule("wigle", settings, true);
		this.schedule("wdgwars", settings, true);
	}

	async refresh(platform: Platform | "all", force = true): Promise<void> {
		const settings = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
		const targets: Platform[] =
			platform === "all" ? ["wigle", "wdgwars"] : [platform];

		await Promise.all(targets.map((p) => this.poll(p, settings, force)));
	}

	getWigle(): CacheEntry<WigleUserStats> {
		return this.wigle;
	}

	getWdgwars(): CacheEntry<WdgwarsMe> {
		return this.wdgwars;
	}

	private schedule(platform: Platform, settings: GlobalSettings, immediate: boolean): void {
		const st = this.state[platform];
		if (st.timer) {
			clearTimeout(st.timer);
			st.timer = null;
		}

		const configured =
			platform === "wigle" ? hasWigleCredentials(settings) : hasWdgwarsCredentials(settings);

		if (!configured) {
			if (platform === "wigle") {
				this.wigle = emptyEntry(false);
			} else {
				this.wdgwars = emptyEntry(false);
			}
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
		const minutes =
			platform === "wigle" ? settings.wiglePollMinutes : settings.wdgwarsPollMinutes;
		return Math.max(1, minutes) * 60_000;
	}

	private async poll(platform: Platform, settings: GlobalSettings, force: boolean): Promise<void> {
		const st = this.state[platform];
		if (st.inFlight) {
			if (!force) {
				return st.inFlight;
			}
			await st.inFlight;
		}

		const configured =
			platform === "wigle" ? hasWigleCredentials(settings) : hasWdgwarsCredentials(settings);

		if (!configured) {
			if (platform === "wigle") {
				this.wigle = emptyEntry(false);
			} else {
				this.wdgwars = emptyEntry(false);
			}
			this.notify();
			return;
		}

		if (!force && Date.now() < st.nextAllowedAt) {
			return;
		}

		st.inFlight = (async () => {
			if (platform === "wigle") {
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
			} else {
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
			this.notify();
		})().finally(() => {
			st.inFlight = null;
		});

		return st.inFlight;
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

/** Shared in-memory stats cache + polling scheduler. */
export const statsCache = new StatsCache();
