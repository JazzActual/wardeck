/**
 * Compose an 800×100 dial banner and slice it into four 200×100 Encoder pixmaps.
 * Stream Deck+ has no native full-strip canvas — one logical SVG, four viewBox crops.
 */

export const BANNER_WIDTH = 800;
export const BANNER_HEIGHT = 100;
export const SLICE_WIDTH = 200;
export const SLICE_COUNT = 4;

export type BannerMetricValue = number | null | undefined;

export type BannerSoloColumn = {
	kind: "solo";
	label: string;
	value: BannerMetricValue;
	/** When true, label+value are centered on the column midpoint (x). */
	centered?: boolean;
	/** Absolute x for left-aligned solo (ignored when centered). */
	x?: number;
};

export type BannerSplitColumn = {
	kind: "split";
	left: { label: string; value: BannerMetricValue; x: number };
	right: { label: string; value: BannerMetricValue; x: number };
};

export type BannerColumn = BannerSoloColumn | BannerSplitColumn;

export type ComposedBannerModel = {
	/** Identity line left side. */
	identity: string;
	/** Brand watermark on the right (e.g. WIGLE / WDGWARS / WARDRIFT). */
	brand: string;
	/** Optional status / empty-state message shown instead of metric values. */
	statusMessage?: string;
	columns: [BannerColumn, BannerColumn, BannerColumn, BannerColumn];
};

const BG = "#0a0a0c";
const INK = "#f2f2f4";
const DIM = "#9a9aa0";
const MUTED = "#5c5c62";
const DIVIDER = "#2a2a30";
const HEADER_H = 28;
const FONT =
	"system-ui, -apple-system, Segoe UI, sans-serif";

/** Integer with thousands separators; 0 stays "0"; nullish → "—". */
export function formatBannerNumber(value: BannerMetricValue): string {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "—";
	}
	return Math.round(value).toLocaleString("en-US");
}

export function buildIdentityLine(
	parts: Array<string | number | null | undefined>,
	fallback: string
): string {
	const chunks: string[] = [];
	for (const part of parts) {
		if (part === null || part === undefined) {
			continue;
		}
		if (typeof part === "number") {
			if (Number.isNaN(part)) {
				continue;
			}
			chunks.push(String(Math.round(part)));
			continue;
		}
		const trimmed = part.trim();
		if (trimmed) {
			chunks.push(trimmed);
		}
	}
	if (chunks.length === 0) {
		return fallback;
	}
	return truncate(chunks.join(" · "), 48);
}

/** Render four SVG data-URLs for Encoder columns 0–3. */
export function renderBannerSlices(model: ComposedBannerModel): string[] {
	const body = renderBannerBody(model);
	return Array.from({ length: SLICE_COUNT }, (_, col) => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SLICE_WIDTH}" height="${BANNER_HEIGHT}" viewBox="${col * SLICE_WIDTH} 0 ${SLICE_WIDTH} ${BANNER_HEIGHT}">${body}</svg>`;
		return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
	});
}

function renderBannerBody(model: ComposedBannerModel): string {
	const identity = escapeXml(truncate(model.identity, 48));
	const brand = escapeXml(model.brand);
	const status = model.statusMessage ? escapeXml(truncate(model.statusMessage, 42)) : "";

	const metrics = status
		? `<text x="12" y="68" fill="${DIM}" font-family="${FONT}" font-size="14" font-weight="500">${status}</text>`
		: model.columns.map((column, index) => renderColumn(column, index)).join("");

	return [
		`<rect x="0" y="0" width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="${BG}"/>`,
		`<text x="12" y="19" fill="${INK}" font-family="${FONT}" font-size="13" font-weight="600">${identity}</text>`,
		`<text x="788" y="19" fill="${MUTED}" font-family="${FONT}" font-size="11" font-weight="600" text-anchor="end" letter-spacing="1.2">${brand}</text>`,
		`<line x1="0" y1="${HEADER_H}" x2="${BANNER_WIDTH}" y2="${HEADER_H}" stroke="${DIVIDER}" stroke-width="1"/>`,
		`<line x1="200" y1="${HEADER_H}" x2="200" y2="${BANNER_HEIGHT}" stroke="${DIVIDER}" stroke-width="1" stroke-dasharray="2 3"/>`,
		`<line x1="400" y1="${HEADER_H}" x2="400" y2="${BANNER_HEIGHT}" stroke="${DIVIDER}" stroke-width="1" stroke-dasharray="2 3"/>`,
		`<line x1="600" y1="${HEADER_H}" x2="600" y2="${BANNER_HEIGHT}" stroke="${DIVIDER}" stroke-width="1" stroke-dasharray="2 3"/>`,
		metrics
	].join("");
}

function renderColumn(column: BannerColumn, index: number): string {
	if (column.kind === "split") {
		return metricPair(
			column.left.x,
			column.left.label,
			formatBannerNumber(column.left.value),
			column.right.x,
			column.right.label,
			formatBannerNumber(column.right.value)
		);
	}

	const value = formatBannerNumber(column.value);
	if (column.centered) {
		const mid = index * SLICE_WIDTH + SLICE_WIDTH / 2;
		return metricBlock(mid, column.label, value, true);
	}
	const x = column.x ?? index * SLICE_WIDTH + 12;
	return metricBlock(x, column.label, value, false);
}

function metricBlock(x: number, label: string, value: string, centered: boolean): string {
	const safeLabel = escapeXml(label);
	const safeValue = escapeXml(value);
	const anchor = centered ? ` text-anchor="middle"` : "";
	const labelSize = label.length > 12 ? 9 : 10;
	return [
		`<text x="${x}" y="46" fill="${DIM}" font-family="${FONT}" font-size="${labelSize}" font-weight="600" letter-spacing="0.6"${anchor}>${safeLabel}</text>`,
		`<text x="${x}" y="82" fill="${INK}" font-family="${FONT}" font-size="28" font-weight="700"${anchor}>${safeValue}</text>`
	].join("");
}

function metricPair(
	x1: number,
	label1: string,
	value1: string,
	x2: number,
	label2: string,
	value2: string
): string {
	const l1 = escapeXml(label1);
	const v1 = escapeXml(value1);
	const l2 = escapeXml(label2);
	const v2 = escapeXml(value2);
	const size1 = label1.length > 10 ? 8 : 10;
	const size2 = label2.length > 10 ? 8 : 10;
	return [
		`<text x="${x1}" y="46" fill="${DIM}" font-family="${FONT}" font-size="${size1}" font-weight="600" letter-spacing="0.5">${l1}</text>`,
		`<text x="${x1}" y="82" fill="${INK}" font-family="${FONT}" font-size="24" font-weight="700">${v1}</text>`,
		`<text x="${x2}" y="46" fill="${DIM}" font-family="${FONT}" font-size="${size2}" font-weight="600" letter-spacing="0.5">${l2}</text>`,
		`<text x="${x2}" y="82" fill="${INK}" font-family="${FONT}" font-size="24" font-weight="700">${v2}</text>`
	].join("");
}

export function truncate(value: string, max: number): string {
	if (value.length <= max) {
		return value;
	}
	return `${value.slice(0, Math.max(0, max - 1))}…`;
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}
