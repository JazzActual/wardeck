/**
 * Compact number formatting for Stream Deck key titles.
 * e.g. 1234 → "1.2k", 1_200_000 → "1.2M"
 */
export function formatCompactNumber(value: number | null | undefined): string {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "—";
	}

	const abs = Math.abs(value);
	const sign = value < 0 ? "-" : "";

	if (abs < 1000) {
		return `${sign}${Math.round(abs)}`;
	}

	if (abs < 1_000_000) {
		return `${sign}${trimTrailingZero((abs / 1000).toFixed(1))}k`;
	}

	if (abs < 1_000_000_000) {
		return `${sign}${trimTrailingZero((abs / 1_000_000).toFixed(1))}M`;
	}

	return `${sign}${trimTrailingZero((abs / 1_000_000_000).toFixed(1))}B`;
}

function trimTrailingZero(s: string): string {
	return s.replace(/\.0$/, "");
}

/** Empty / unconfigured / error display for keys. */
export const EMPTY_TITLE = "—";
