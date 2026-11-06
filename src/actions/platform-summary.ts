import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	SingletonAction,
	type WillAppearEvent
} from "@elgato/streamdeck";

import { EMPTY_TITLE, formatCompactNumber } from "../formatting.js";
import { platformKeyMark } from "../icons.js";
import { renderKeyImage } from "../key/render.js";
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
		const settings = parsePlatformSummarySettings(ev.payload.settings);
		statsCache.ensureFetched(settings.platform);
		await this.render(ev.action, settings);
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
		const { label, value } = resolvePlatformSummaryDisplay(settings);
		await action.setImage(
			renderKeyImage({
				mark: platformKeyMark(settings.platform),
				label,
				value
			})
		);
		await action.setTitle("");
	}
}

export function resolvePlatformSummaryDisplay(settings: PlatformSummarySettings): {
	label: string;
	value: string;
} {
	if (settings.platform === "wigle") {
		const entry = statsCache.getWigle();
		const primary = entry.data?.statistics?.discoveredWiFi;
		return {
			label: "WiGLE",
			value: entry.configured ? formatCompactNumber(primary) : EMPTY_TITLE
		};
	}

	if (settings.platform === "wdgwars") {
		const entry = statsCache.getWdgwars();
		const primary = entry.data?.total;
		return {
			label: "WDGWars",
			value: entry.configured ? formatCompactNumber(primary) : EMPTY_TITLE
		};
	}

	const entry = statsCache.getWardrift();
	const primary = entry.data?.wardrive?.lifetime?.access_points_discovered;
	return {
		label: "Wardrift",
		value: entry.configured ? formatCompactNumber(primary) : EMPTY_TITLE
	};
}
