/**
 * Compose an 800×100 dial banner and slice it into four 200×100 Encoder pixmaps.
 * Stream Deck+ has no native full-strip canvas — one logical SVG, four viewBox crops.
 *
 * Sample A Lucide placement (approved): white glyphs in the label band —
 * solo 15px left of label (or stacked/centered); split 12px left of each half-label.
 */

import { formatCompactNumber } from "../formatting.js";
import { renderLucideGlyph, type BannerLucideMark } from "./lucide-marks.js";

export type { BannerLucideMark } from "./lucide-marks.js";

export const BANNER_WIDTH = 800;
export const BANNER_HEIGHT = 100;
export const SLICE_WIDTH = 200;
export const SLICE_COUNT = 4;

export type BannerMetricValue = number | null | undefined;

export type BannerSoloColumn = {
	kind: "solo";
	label: string;
	value: BannerMetricValue;
	/** Lucide mark painted in the label band (matches keypad set). */
	lucide: BannerLucideMark;
	/** When true, glyph+label+value are centered on the column midpoint. */
	centered?: boolean;
	/** Absolute x for left-aligned solo (ignored when centered). */
	x?: number;
};

export type BannerSplitHalf = {
	label: string;
	value: BannerMetricValue;
	x: number;
	lucide: BannerLucideMark;
};

export type BannerSplitColumn = {
	kind: "split";
	left: BannerSplitHalf;
	right: BannerSplitHalf;
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
const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

/** Solo label-band glyph size (logical px). */
const SOLO_GLYPH = 15;
/** Split half-label glyph size (logical px). */
const SPLIT_GLYPH = 12;
/** Gap from glyph right edge to label text start. */
const GLYPH_LABEL_GAP = 3;

/** Same compact format as keypad Stat titles (e.g. 48.3k, 1.2k); 0 stays "0". */
export function formatBannerNumber(value: BannerMetricValue): string {
	return formatCompactNumber(value);
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
		return metricPair(column.left, column.right);
	}

	const value = formatBannerNumber(column.value);
	if (column.centered) {
		const mid = index * SLICE_WIDTH + SLICE_WIDTH / 2;
		return metricBlockCentered(mid, column.label, value, column.lucide);
	}
	const x = column.x ?? index * SLICE_WIDTH + 12;
	return metricBlockLeft(x, column.label, value, column.lucide);
}

/** Left-aligned solo: glyph left of label in label band; value below at x. */
function metricBlockLeft(
	x: number,
	label: string,
	value: string,
	mark: BannerLucideMark
): string {
	const safeLabel = escapeXml(label);
	const safeValue = escapeXml(value);
	const labelSize = label.length > 12 ? 9 : 10;
	const glyphY = 33;
	const labelX = x + SOLO_GLYPH + GLYPH_LABEL_GAP;
	return [
		renderLucideGlyph(mark, x, glyphY, SOLO_GLYPH, INK),
		`<text x="${labelX}" y="46" fill="${DIM}" font-family="${FONT}" font-size="${labelSize}" font-weight="600" letter-spacing="0.6">${safeLabel}</text>`,
		`<text x="${x}" y="82" fill="${INK}" font-family="${FONT}" font-size="28" font-weight="700">${safeValue}</text>`
	].join("");
}

/** Centered solo: glyph stacked above micro-label, both centered; value below. */
function metricBlockCentered(
	mid: number,
	label: string,
	value: string,
	mark: BannerLucideMark
): string {
	const safeLabel = escapeXml(label);
	const safeValue = escapeXml(value);
	const labelSize = label.length > 12 ? 9 : 10;
	const glyphX = mid - SOLO_GLYPH / 2;
	const glyphY = 31;
	return [
		renderLucideGlyph(mark, glyphX, glyphY, SOLO_GLYPH, INK),
		`<text x="${mid}" y="52" fill="${DIM}" font-family="${FONT}" font-size="${labelSize}" font-weight="600" letter-spacing="0.6" text-anchor="middle">${safeLabel}</text>`,
		`<text x="${mid}" y="82" fill="${INK}" font-family="${FONT}" font-size="28" font-weight="700" text-anchor="middle">${safeValue}</text>`
	].join("");
}

function metricPair(left: BannerSplitHalf, right: BannerSplitHalf): string {
	return splitHalf(left) + splitHalf(right);
}

function splitHalf(half: BannerSplitHalf): string {
	const label = escapeXml(half.label);
	const value = escapeXml(formatBannerNumber(half.value));
	const size = half.label.length > 10 ? 8 : 10;
	const glyphY = 34;
	const labelX = half.x + SPLIT_GLYPH + GLYPH_LABEL_GAP;
	return [
		renderLucideGlyph(half.lucide, half.x, glyphY, SPLIT_GLYPH, INK),
		`<text x="${labelX}" y="46" fill="${DIM}" font-family="${FONT}" font-size="${size}" font-weight="600" letter-spacing="0.5">${label}</text>`,
		`<text x="${half.x}" y="82" fill="${INK}" font-family="${FONT}" font-size="24" font-weight="700">${value}</text>`
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
