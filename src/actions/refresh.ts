import {
	action,
	type KeyDownEvent,
	SingletonAction,
	type WillAppearEvent
} from "@elgato/streamdeck";

import { statsCache } from "../services/cache.js";
import { parseRefreshSettings, type RefreshActionSettings } from "../settings.js";

@action({ UUID: "com.jazzactual.wardeck.refresh" })
export class RefreshAction extends SingletonAction<RefreshActionSettings> {
	override async onWillAppear(ev: WillAppearEvent<RefreshActionSettings>): Promise<void> {
		if (ev.action.isKey()) {
			await ev.action.setTitle("Refresh");
		}
	}

	override async onKeyDown(ev: KeyDownEvent<RefreshActionSettings>): Promise<void> {
		const settings = parseRefreshSettings(ev.payload.settings);
		if (ev.action.isKey()) {
			await ev.action.setTitle("…");
		}
		await statsCache.refresh(settings.platform, true);
		if (ev.action.isKey()) {
			await ev.action.setTitle("Refresh");
			await ev.action.showOk();
		}
	}
}
