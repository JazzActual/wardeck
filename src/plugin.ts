import streamDeck from "@elgato/streamdeck";

import { PlatformSummaryAction } from "./actions/platform-summary";
import { RefreshAction } from "./actions/refresh";
import { StatAction } from "./actions/stat";
import { statsCache } from "./services/cache";
import { fetchWdgwarsMe } from "./services/wdgwars";
import { fetchWigleUserStats } from "./services/wigle";
import { parseGlobalSettings } from "./settings";

streamDeck.logger.setLevel("info");

streamDeck.actions.registerAction(new StatAction());
streamDeck.actions.registerAction(new PlatformSummaryAction());
streamDeck.actions.registerAction(new RefreshAction());

type TestConnectionPayload = {
	event?: string;
	platform?: string;
};

streamDeck.ui.onSendToPlugin(async (ev) => {
	const payload = (ev.payload ?? {}) as TestConnectionPayload;
	if (payload.event !== "testConnection") {
		return;
	}

	const settings = parseGlobalSettings(await streamDeck.settings.getGlobalSettings());
	const platform = payload.platform === "wdgwars" ? "wdgwars" : "wigle";

	if (platform === "wigle") {
		const result = await fetchWigleUserStats(settings);
		await streamDeck.ui.sendToPropertyInspector({
			event: "testConnectionResult",
			platform,
			ok: result.ok,
			message: result.ok
				? `Connected as ${result.data.userName ?? result.data.user ?? "WiGLE user"}.`
				: result.error
		});
		if (result.ok) {
			await statsCache.refresh("wigle", true);
		}
		return;
	}

	const result = await fetchWdgwarsMe(settings);
	await streamDeck.ui.sendToPropertyInspector({
		event: "testConnectionResult",
		platform,
		ok: result.ok,
		message: result.ok
			? `Connected as ${result.data.username ?? "WDGWars user"}.`
			: result.error
	});
	if (result.ok) {
		await statsCache.refresh("wdgwars", true);
	}
});

void statsCache.start();

streamDeck.connect();
