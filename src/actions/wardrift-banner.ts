import {
	action,
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent
} from "@elgato/streamdeck";

import {
	buildIdentityLine,
	renderBannerSlices,
	type WardriftBannerModel
} from "../banner/render.js";
import { statsCache } from "../services/cache.js";
import { readWardriftMetric, resolveFaction } from "../services/wardrift.js";

/**
 * Display-only Stream Deck+ Encoder action.
 * Same action on all four dials; one 800×100 banner sliced into 200×100 pixmaps.
 * Intentionally does not handle dialRotate / dialDown / dialUp / touchTap.
 */
@action({ UUID: "com.jazzactual.wardeck.wardrift-banner" })
export class WardriftBannerAction extends SingletonAction {
	private unsubscribe: (() => void) | null = null;
	private renderQueue: Promise<void> = Promise.resolve();

	override async onWillAppear(_ev: WillAppearEvent): Promise<void> {
		this.ensureSubscription();
		await this.enqueueRender();
	}

	override async onWillDisappear(_ev: WillDisappearEvent): Promise<void> {
		// Other dial instances may still be visible; keep subscription alive.
	}

	private ensureSubscription(): void {
		if (this.unsubscribe) {
			return;
		}
		this.unsubscribe = statsCache.onUpdate(() => {
			void this.enqueueRender();
		});
	}

	/** Serialize renders so all four dials update from one banner pass. */
	private enqueueRender(): Promise<void> {
		this.renderQueue = this.renderQueue.then(() => this.renderAll()).catch(() => {
			// Keep the queue alive after a failed pass.
		});
		return this.renderQueue;
	}

	private async renderAll(): Promise<void> {
		const dials = [...this.actions].filter((a) => a.isDial());
		if (dials.length === 0) {
			return;
		}

		const slices = renderBannerSlices(buildBannerModel());

		// Push all four slices in one pass to avoid seam flicker.
		await Promise.all(
			dials.map(async (actionInstance) => {
				if (!actionInstance.isDial()) {
					return;
				}
				const col = actionInstance.coordinates.column;
				if (col < 0 || col > 3) {
					return;
				}
				await actionInstance.setFeedback({
					banner: slices[col] ?? slices[0]
				});
			})
		);
	}
}

export function buildBannerModel(): WardriftBannerModel {
	const entry = statsCache.getWardrift();

	if (!entry.configured) {
		return {
			identity: "Wardrift",
			statusMessage: "Add Wardrift credentials in Property Inspector",
			networks: null,
			routes: null,
			threats: null,
			streak: null,
			coin: null,
			toNext: null
		};
	}

	if (!entry.data) {
		return {
			identity: "Wardrift",
			statusMessage: truncateStatus(entry.lastError ?? "Waiting for Wardrift data…"),
			networks: null,
			routes: null,
			threats: null,
			streak: null,
			coin: null,
			toNext: null
		};
	}

	const data = entry.data;
	const character = data.characters?.[0];
	const name = readWardriftMetric(data, "name");
	const faction = resolveFaction(character) ?? readWardriftMetric(data, "faction");
	const level = readWardriftMetric(data, "level");
	const className =
		typeof character?.class_name === "string" ? character.class_name : undefined;

	return {
		identity: buildIdentityLine({
			name: typeof name === "string" ? name : null,
			faction: typeof faction === "string" ? faction : null,
			level: typeof level === "number" ? level : null,
			className
		}),
		networks: asNumber(readWardriftMetric(data, "networks")),
		routes: asNumber(readWardriftMetric(data, "routes")),
		threats: asNumber(readWardriftMetric(data, "threats")),
		// Locked: streak 0 must render as 0 (not hidden / not Coin fallback).
		streak: asNumber(readWardriftMetric(data, "streak")),
		coin: asNumber(readWardriftMetric(data, "currency")),
		toNext: asNumber(readWardriftMetric(data, "expToNext"))
	};
}

function asNumber(value: number | string | null): number | null {
	return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function truncateStatus(message: string): string {
	if (message.length <= 42) {
		return message;
	}
	return `${message.slice(0, 41)}…`;
}
