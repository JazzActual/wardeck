/**
 * Compose an 800×100 Wardrift banner and slice it into four 200×100 Encoder pixmaps.
 * Stream Deck+ has no native full-strip canvas — one logical SVG, four viewBox crops.
 */

export const BANNER_WIDTH = 800;
export const BANNER_HEIGHT = 100;
export const SLICE_WIDTH = 200;
export const SLICE_COUNT = 4;

export type BannerMetricValue = number | null | undefined;

export type WardriftBannerModel = {
	/** Identity line left side, e.g. "Nyx · Arcanum · L12 Scout". */
	identity: string;
	/** Optional status / empty-state message shown instead of metrics values. */
	statusMessage?: string;
	networks: BannerMetricValue;
	routes: BannerMetricValue;
	threats: BannerMetricValue;
	/** Streak: show 0 when zero; null/undefined → "—". */
	streak: BannerMetricValue;
	coin: BannerMetricValue;
	toNext: BannerMetricValue;
};

const BG = "#0a0a0c";
const INK = "#f2f2f4";
const DIM = "#9a9aa0";
const MUTED = "#5c5c62";
const DIVIDER = "#2a2a30";
const HEADER_H = 28;

/** Integer with thousands separators; 0 stays "0"; nullish → "—". */
export function formatBannerNumber(value: BannerMetricValue): string {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "—";
	}
	return Math.round(value).toLocaleString("en-US");
}

export function buildIdentityLine(parts: {
	name?: string | null;
	faction?: string | null;
	level?: number | null;
	className?: string | null;
}): string {
	const chunks: string[] = [];
	const name = (parts.name ?? "").trim();
	if (name) {
		chunks.push(truncate(name, 18));
	}
	const faction = (parts.faction ?? "").trim();
	if (faction) {
		chunks.push(faction);
	}
	const levelBit =
		parts.level !== null && parts.level !== undefined && !Number.isNaN(parts.level)
			? `L${Math.round(parts.level)}`
			: "";
	const className = (parts.className ?? "").trim();
	const levelClass = [levelBit, className].filter(Boolean).join(" ");
	if (levelClass) {
		chunks.push(levelClass);
	}
	return chunks.join(" · ") || "Wardrift";
}

/** Render four SVG data-URLs for Encoder columns 0–3. */
export function renderBannerSlices(model: WardriftBannerModel): string[] {
	const body = renderBannerBody(model);
	return Array.from({ length: SLICE_COUNT }, (_, col) => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SLICE_WIDTH}" height="${BANNER_HEIGHT}" viewBox="${col * SLICE_WIDTH} 0 ${SLICE_WIDTH} ${BANNER_HEIGHT}">${body}</svg>`;
		return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
	});
}

function renderBannerBody(model: WardriftBannerModel): string {
	const identity = escapeXml(truncate(model.identity, 48));
	const status = model.statusMessage ? escapeXml(truncate(model.statusMessage, 42)) : "";

	const networks = escapeXml(formatBannerNumber(model.networks));
	const routes = escapeXml(formatBannerNumber(model.routes));
	const threats = escapeXml(formatBannerNumber(model.threats));
	const streak = escapeXml(formatBannerNumber(model.streak));
	const coin = escapeXml(formatBannerNumber(model.coin));
	const toNext = escapeXml(formatBannerNumber(model.toNext));

	const metrics = status
		? `<text x="12" y="68" fill="${DIM}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="14" font-weight="500">${status}</text>`
		: [
				metricBlock(12, "NETWORKS", networks),
				metricPair(212, "ROUTES", routes, 308, "THREATS", threats),
				metricBlock(500, "STREAK", streak, true),
				metricPair(612, "COIN", coin, 710, "TO NEXT", toNext)
			].join("");

	return [
		`<rect x="0" y="0" width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="${BG}"/>`,
		`<text x="12" y="19" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="13" font-weight="600">${identity}</text>`,
		`<text x="788" y="19" fill="${MUTED}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="11" font-weight="600" text-anchor="end" letter-spacing="1.2">WARDRIFT</text>`,
		`<line x1="0" y1="${HEADER_H}" x2="${BANNER_WIDTH}" y2="${HEADER_H}" stroke="${DIVIDER}" stroke-width="1"/>`,
		`<line x1="200" y1="${HEADER_H}" x2="200" y2="${BANNER_HEIGHT}" stroke="${DIVIDER}" stroke-width="1" stroke-dasharray="2 3"/>`,
		`<line x1="400" y1="${HEADER_H}" x2="400" y2="${BANNER_HEIGHT}" stroke="${DIVIDER}" stroke-width="1" stroke-dasharray="2 3"/>`,
		`<line x1="600" y1="${HEADER_H}" x2="600" y2="${BANNER_HEIGHT}" stroke="${DIVIDER}" stroke-width="1" stroke-dasharray="2 3"/>`,
		metrics
	].join("");
}

function metricBlock(x: number, label: string, value: string, centered = false): string {
	// Centered mode: x is the column midpoint (e.g. 500 for encoder col 2).
	const anchor = centered ? ` text-anchor="middle"` : "";
	return [
		`<text x="${x}" y="46" fill="${DIM}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="0.8"${anchor}>${label}</text>`,
		`<text x="${x}" y="82" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" font-weight="700"${anchor}>${value}</text>`
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
	return [
		`<text x="${x1}" y="46" fill="${DIM}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="0.8">${label1}</text>`,
		`<text x="${x1}" y="82" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="700">${value1}</text>`,
		`<text x="${x2}" y="46" fill="${DIM}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="10" font-weight="600" letter-spacing="0.8">${label2}</text>`,
		`<text x="${x2}" y="82" fill="${INK}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" font-weight="700">${value2}</text>`
	].join("");
}

function truncate(value: string, max: number): string {
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
