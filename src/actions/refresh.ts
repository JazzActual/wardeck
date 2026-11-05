import {
	action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	SingletonAction,
	type WillAppearEvent
} from "@elgato/streamdeck";

import { refreshKeyImage } from "../icons.js";
import { statsCache } from "../services/cache.js";
import { parseRefreshSettings, type RefreshActionSettings } from "../settings.js";

@action({ UUID: "com.jazzactual.wardeck.refresh" })
export class RefreshAction extends SingletonAction<RefreshActionSettings> {
	override async onWillAppear(ev: WillAppearEvent<RefreshActionSettings>): Promise<void> {
		await this.render(ev.action, ev.payload.settings);
	}

	override async onDidReceiveSettings(
		ev: DidReceiveSettingsEvent<RefreshActionSettings>
	): Promise<void> {
		await this.render(ev.action, ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<RefreshActionSettings>): Promise<void> {
		const settings = parseRefreshSettings(ev.payload.settings);
		if (ev.action.isKey()) {
			await ev.action.setTitle("…");
		}
		await statsCache.refresh(settings.platform, true);
		if (ev.action.isKey()) {
			await this.render(ev.action, settings);
			await ev.action.showOk();
		}
	}

	private async render(
		action: WillAppearEvent<RefreshActionSettings>["action"],
		rawSettings: RefreshActionSettings
	): Promise<void> {
		if (!action.isKey()) {
			return;
		}
		const settings = parseRefreshSettings(rawSettings);
		await action.setImage(refreshKeyImage(settings.platform));
		await action.setTitle("Refresh");
	}
}
