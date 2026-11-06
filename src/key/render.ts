/**
 * Stream Deck keypad face: strict vertical thirds.
 *   Top    — Lucide mark (optically centered in the 24×24 viewBox square)
 *   Middle — metric / platform label
 *   Bottom — value
 *
 * Composed as SVG data-URL so every metric shares the same optical layout
 * (no reliance on Stream Deck title wrapping).
 */

import { renderLucideGlyph, type LucideMark } from "../banner/lucide-marks.js";

export type KeyMark = LucideMark | "combo";

export type KeyFaceModel = {
	mark: KeyMark;
	label: string;
	value: string;
};

export const KEY_SIZE = 144;

const BG = "#0c0c0e";
const BAND = "#16161a";
const INK = "#ebebee";
const DIM = "#c4c4c8";
const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

/** Paint a full key face as an SVG data-URL for setImage. */
export function renderKeyImage(model: KeyFaceModel): string {
	const svg = renderKeySvg(model, KEY_SIZE);
	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/** Raw SVG (useful for previews / smoke). */
export function renderKeySvg(model: KeyFaceModel, size: number = KEY_SIZE): string {
	const third = size / 3;
	const glyphSize = third * 0.62;
	const midX = size / 2;

	const glyph = renderKeyGlyph(model.mark, midX, third / 2, glyphSize, INK);
	const label = escapeXml(fitLabel(model.label));
	const value = escapeXml(fitValue(model.value));

	const labelY = third + third / 2;
	const valueY = third * 2 + third / 2;
	const labelSize = size * 0.105;
	const valueSize = size * 0.175;

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
		`<rect width="${size}" height="${size}" fill="${BG}"/>`,
		`<rect width="${size}" height="${third}" fill="${BAND}"/>`,
		glyph,
		`<text x="${midX}" y="${labelY}" fill="${DIM}" font-family="${FONT}" font-size="${labelSize}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text>`,
		`<text x="${midX}" y="${valueY}" fill="${INK}" font-family="${FONT}" font-size="${valueSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${value}</text>`,
		`</svg>`
	].join("");
}

function renderKeyGlyph(
	mark: KeyMark,
	cx: number,
	cy: number,
	glyphSize: number,
	stroke: string
): string {
	if (mark === "combo") {
		const half = glyphSize * 0.72;
		const gap = glyphSize * 0.18;
		const total = half * 2 + gap;
		const left = cx - total / 2;
		return [
			renderLucideGlyph("wifi", left, cy - half / 2, half, stroke),
			renderLucideGlyph("bluetooth", left + half + gap, cy - half / 2, half, stroke)
		].join("");
	}
	return renderLucideGlyph(mark, cx - glyphSize / 2, cy - glyphSize / 2, glyphSize, stroke);
}

function fitLabel(label: string): string {
	const trimmed = label.trim();
	if (trimmed.length <= 12) {
		return trimmed;
	}
	return `${trimmed.slice(0, 11)}…`;
}

function fitValue(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length <= 10) {
		return trimmed;
	}
	return `${trimmed.slice(0, 9)}…`;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
