import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	SingletonAction,
	type WillAppearEvent
} from "@elgato/streamdeck";

import { EMPTY_TITLE, formatCompactNumber } from "../formatting.js";
import { statsCache } from "../services/cache.js";
import {
	parsePlatformSummarySettings,
	PLATFORM_URLS,
	type PlatformSummarySettings
} from "../settings.js";

@action({ UUID: "com.jazzactual.wardeck.platform-summary" })
export class PlatformSummaryAction extends SingletonAction<PlatformSummarySettings> {
	private unsubscribe: (() => void) | null = null;

	override async onWillAppear(ev: WillAppearEvent<PlatformSummarySettings>): Promise<void> {
		this.ensureSubscription();
		await this.render(ev.action, ev.payload.settings);
	}

	override async onDidReceiveSettings(
		ev: DidReceiveSettingsEvent<PlatformSummarySettings>
	): Promise<void> {
		await this.render(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<PlatformSummarySettings>): Promise<void> {
		const settings = parsePlatformSummarySettings(ev.payload.settings);
		await streamDeck.system.openUrl(PLATFORM_URLS[settings.platform]);
	}

	private ensureSubscription(): void {
		if (this.unsubscribe) {
			return;
		}
		this.unsubscribe = statsCache.onUpdate(() => {
			this.actions.forEach((action) => {
				if (!action.isKey()) {
					return;
				}
				void action.getSettings().then((settings) => this.render(action, settings));
			});
		});
	}

	private async render(
		action: WillAppearEvent<PlatformSummarySettings>["action"],
		rawSettings: PlatformSummarySettings
	): Promise<void> {
		if (!action.isKey()) {
			return;
		}

		const settings = parsePlatformSummarySettings(rawSettings);
		if (settings.platform === "wigle") {
			const entry = statsCache.getWigle();
			const primary = entry.data?.statistics?.discoveredWiFiGPS;
			await action.setTitle(
				`WiGLE\n${entry.configured ? formatCompactNumber(primary) : EMPTY_TITLE}`
			);
			return;
		}

		if (settings.platform === "wdgwars") {
			const entry = statsCache.getWdgwars();
			const primary = entry.data?.total;
			await action.setTitle(
				`WDGWars\n${entry.configured ? formatCompactNumber(primary) : EMPTY_TITLE}`
			);
			return;
		}

		const entry = statsCache.getWardrift();
		const primary = entry.data?.wardrive?.lifetime?.access_points_discovered;
		await action.setTitle(
			`Wardrift\n${entry.configured ? formatCompactNumber(primary) : EMPTY_TITLE}`
		);
	}
}
