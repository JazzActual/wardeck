import {
	action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	SingletonAction,
	type WillAppearEvent
} from "@elgato/streamdeck";

import { EMPTY_TITLE, formatCompactNumber } from "../formatting.js";
import { statKeyImage } from "../icons.js";
import { statsCache } from "../services/cache.js";
import { readWdgwarsMetric } from "../services/wdgwars.js";
import { readWardriftMetric } from "../services/wardrift.js";
import { readWigleMetric } from "../services/wigle.js";
import {
	parseStatSettings,
	type StatActionSettings,
	WARDRIFT_METRIC_LABELS,
	WDGWARS_METRIC_LABELS,
	WIGLE_METRIC_LABELS
} from "../settings.js";

@action({ UUID: "com.jazzactual.wardeck.stat" })
export class StatAction extends SingletonAction<StatActionSettings> {
	private unsubscribe: (() => void) | null = null;

	override async onWillAppear(ev: WillAppearEvent<StatActionSettings>): Promise<void> {
		this.ensureSubscription();
		const settings = parseStatSettings(ev.payload.settings);
		statsCache.ensureFetched(settings.platform);
		await this.render(ev.action, settings);
	}

	override async onDidReceiveSettings(
		ev: DidReceiveSettingsEvent<StatActionSettings>
	): Promise<void> {
		await this.render(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<StatActionSettings>): Promise<void> {
		const settings = parseStatSettings(ev.payload.settings);
		await statsCache.refresh(settings.platform, true);
		await this.render(ev.action, settings);
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
		action: WillAppearEvent<StatActionSettings>["action"],
		rawSettings: StatActionSettings
	): Promise<void> {
		if (!action.isKey()) {
			return;
		}

		const settings = parseStatSettings(rawSettings);
		const { title, subtitle } = resolveStatDisplay(settings);
		await action.setImage(statKeyImage(settings));
		await action.setTitle(`${subtitle}\n${title}`);
	}
}

export function resolveStatDisplay(settings: StatActionSettings): {
	title: string;
	subtitle: string;
} {
	if (settings.platform === "wigle") {
		const entry = statsCache.getWigle();
		const label = WIGLE_METRIC_LABELS[settings.wigleMetric];
		if (!entry.configured || !entry.data) {
			return { subtitle: label, title: EMPTY_TITLE };
		}
		const value = readWigleMetric(entry.data, settings.wigleMetric);
		return {
			subtitle: label,
			title: typeof value === "string" ? truncate(value, 10) : formatCompactNumber(value)
		};
	}

	if (settings.platform === "wdgwars") {
		const entry = statsCache.getWdgwars();
		const label = WDGWARS_METRIC_LABELS[settings.wdgwarsMetric];
		if (!entry.configured || !entry.data) {
			return { subtitle: label, title: EMPTY_TITLE };
		}
		const value = readWdgwarsMetric(entry.data, settings.wdgwarsMetric);
		return {
			subtitle: label,
			title: typeof value === "string" ? truncate(value, 10) : formatCompactNumber(value)
		};
	}

	const entry = statsCache.getWardrift();
	const label = WARDRIFT_METRIC_LABELS[settings.wardriftMetric];
	if (!entry.configured || !entry.data) {
		return { subtitle: label, title: EMPTY_TITLE };
	}
	const value = readWardriftMetric(entry.data, settings.wardriftMetric);
	return {
		subtitle: label,
		title: typeof value === "string" ? truncate(value, 10) : formatCompactNumber(value)
	};
}

function truncate(value: string, max: number): string {
	if (value.length <= max) {
		return value;
	}
	return `${value.slice(0, max - 1)}…`;
}
