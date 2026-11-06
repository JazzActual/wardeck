/**
 * Lucide path bodies (lucide-static@1.69.0, ISC).
 * White stroke glyphs; viewBox is always 0 0 24 24.
 * Shared by dial banners and keypad thirds composition.
 */

export type LucideMark =
	| "radio"
	| "car"
	| "swords"
	| "calendar"
	| "coins"
	| "zap"
	| "wifi"
	| "podium"
	| "bluetooth"
	| "plane"
	| "network"
	| "award"
	| "biceps-flexed"
	| "radio-tower";

/** @deprecated Prefer LucideMark — kept for banner call sites. */
export type BannerLucideMark = LucideMark;

/** Inner SVG markup (no root <svg>) for each mark. */
const LUCIDE_INNER: Record<LucideMark, string> = {
	radio: [
		`<path d="M16.247 7.761a6 6 0 0 1 0 8.478"/>`,
		`<path d="M19.075 4.933a10 10 0 0 1 0 14.134"/>`,
		`<path d="M4.925 19.067a10 10 0 0 1 0-14.134"/>`,
		`<path d="M7.753 16.239a6 6 0 0 1 0-8.478"/>`,
		`<circle cx="12" cy="12" r="2"/>`
	].join(""),
	car: [
		`<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>`,
		`<circle cx="7" cy="17" r="2"/>`,
		`<path d="M9 17h6"/>`,
		`<circle cx="17" cy="17" r="2"/>`
	].join(""),
	swords: [
		`<path d="m13 19 6-6"/>`,
		`<path d="M14.5 17.5 3.586 6.586A2 2 0 013 5.172V3h2.172a2 2 0 011.414.586L17.5 14.5"/>`,
		`<path d="m14.828 6.172 2.586-2.586A2 2 0 0118.828 3H21v2.172a2 2 0 01-.586 1.414l-2.586 2.586"/>`,
		`<path d="m16 16 4 4"/>`,
		`<path d="m19 21 2-2"/>`,
		`<path d="m5 14 4 4"/>`,
		`<path d="m5 21-2-2"/>`,
		`<path d="M7.5 16.5 4 20"/>`
	].join(""),
	calendar: [
		`<path d="M8 2v3"/>`,
		`<path d="M16 2v3"/>`,
		`<rect x="3" y="3" width="18" height="18" rx="2"/>`,
		`<path d="M3 9h18"/>`
	].join(""),
	coins: [
		`<path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/>`,
		`<path d="M15 6h1v4"/>`,
		`<path d="m6.134 14.768.866-.5 2 3.464"/>`,
		`<circle cx="16" cy="8" r="6"/>`
	].join(""),
	zap: `<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>`,
	wifi: [
		`<path d="M12 20h.01"/>`,
		`<path d="M2 8.82a15 15 0 0 1 20 0"/>`,
		`<path d="M5 12.859a10 10 0 0 1 14 0"/>`,
		`<path d="M8.5 16.429a5 5 0 0 1 7 0"/>`
	].join(""),
	podium: [
		`<path d="M12 6V2h-1"/>`,
		`<path d="M9 15a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1"/>`,
		`<path d="M9 21V11a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10"/>`
	].join(""),
	bluetooth: `<path d="m7 7 10 10-5 5V2l5 5L7 17"/>`,
	plane: `<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>`,
	network: [
		`<rect x="16" y="16" width="6" height="6" rx="1"/>`,
		`<rect x="2" y="16" width="6" height="6" rx="1"/>`,
		`<rect x="9" y="2" width="6" height="6" rx="1"/>`,
		`<path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/>`,
		`<path d="M12 12V8"/>`
	].join(""),
	award: [
		`<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/>`,
		`<circle cx="12" cy="8" r="6"/>`
	].join(""),
	"biceps-flexed": [
		`<path d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1"/>`,
		`<path d="M15 14a5 5 0 0 0-7.584 2"/>`,
		`<path d="M9.964 6.825C8.019 7.977 9.5 13 8 15"/>`
	].join(""),
	"radio-tower": [
		`<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/>`,
		`<path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/>`,
		`<circle cx="12" cy="9" r="2"/>`,
		`<path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/>`,
		`<path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>`,
		`<path d="M9.5 18h5"/>`,
		`<path d="m8 22 4-11 4 11"/>`
	].join("")
};

const VIEW = 24;

/**
 * Paint a Lucide glyph with top-left at (x, y) and square size `size`.
 */
export function renderLucideGlyph(
	mark: LucideMark,
	x: number,
	y: number,
	size: number,
	stroke: string
): string {
	const scale = size / VIEW;
	const inner = LUCIDE_INNER[mark];
	return [
		`<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
		inner,
		`</g>`
	].join("");
}
