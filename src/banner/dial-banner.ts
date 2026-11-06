import {
	SingletonAction,
	type WillAppearEvent,
	type WillDisappearEvent
} from "@elgato/streamdeck";

import { statsCache } from "../services/cache.js";
import { renderBannerSlices, type ComposedBannerModel } from "./render.js";

/**
 * Shared display-only Encoder banner action.
 * Intentionally does not handle dialRotate / dialDown / dialUp / touchTap.
 */
export abstract class DialBannerAction extends SingletonAction {
	private unsubscribe: (() => void) | null = null;
	private renderQueue: Promise<void> = Promise.resolve();

	protected abstract buildModel(): ComposedBannerModel;

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

		const slices = renderBannerSlices(this.buildModel());

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

export function truncateStatus(message: string): string {
	if (message.length <= 42) {
		return message;
	}
	return `${message.slice(0, 41)}…`;
}
