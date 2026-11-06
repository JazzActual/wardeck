/** Poll schedule helpers: fixed intervals + daily wall-clock time. */

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export const WDGWARS_POLL_MS = FOUR_HOURS_MS;
export const WARDRIFT_POLL_MS = FOUR_HOURS_MS;

export type DailyTime = { hour: number; minute: number };

/** Parse `HH:mm` (24h). Invalid → 06:00. */
export function parseDailyTime(value: string | undefined | null): DailyTime {
	const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());
	if (!m) {
		return { hour: 6, minute: 0 };
	}
	const hour = Math.min(23, Math.max(0, Number(m[1])));
	const minute = Math.min(59, Math.max(0, Number(m[2])));
	return { hour, minute };
}

export function formatDailyTime(t: DailyTime): string {
	return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

type ZonedParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

function resolveTimeZone(timeZone: string | undefined | null): string | undefined {
	const tz = String(timeZone ?? "").trim();
	if (!tz || tz.toLowerCase() === "local") {
		return undefined;
	}
	try {
		Intl.DateTimeFormat(undefined, { timeZone: tz });
		return tz;
	} catch {
		return undefined;
	}
}

export function getZonedParts(date: Date, timeZone: string | undefined | null): ZonedParts {
	const tz = resolveTimeZone(timeZone);
	const dtf = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	});
	const parts = Object.fromEntries(
		dtf
			.formatToParts(date)
			.filter((p) => p.type !== "literal")
			.map((p) => [p.type, p.value])
	) as Record<string, string>;
	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second)
	};
}

/** UTC ms for a wall-clock date/time in `timeZone` (or host local when local/empty). */
export function zonedTimeToUtcMs(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	timeZone: string | undefined | null
): number {
	const tz = resolveTimeZone(timeZone);
	if (!tz) {
		return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
	}

	let guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
	for (let i = 0; i < 4; i++) {
		const p = getZonedParts(new Date(guess), tz);
		const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
		const want = Date.UTC(year, month - 1, day, hour, minute, 0);
		const delta = want - asUtc;
		if (delta === 0) {
			break;
		}
		guess += delta;
	}
	return guess;
}

function addCalendarDays(year: number, month: number, day: number, deltaDays: number): {
	year: number;
	month: number;
	day: number;
} {
	const d = new Date(Date.UTC(year, month - 1, day));
	d.setUTCDate(d.getUTCDate() + deltaDays);
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Next occurrence of daily `HH:mm` in `timeZone` at or after `fromMs` (exclusive if equal → tomorrow). */
export function nextDailyOccurrenceMs(
	timeHHMM: string,
	timeZone: string | undefined | null,
	fromMs: number = Date.now()
): number {
	const { hour, minute } = parseDailyTime(timeHHMM);
	const parts = getZonedParts(new Date(fromMs), timeZone);
	let target = zonedTimeToUtcMs(parts.year, parts.month, parts.day, hour, minute, timeZone);
	if (target <= fromMs) {
		const next = addCalendarDays(parts.year, parts.month, parts.day, 1);
		target = zonedTimeToUtcMs(next.year, next.month, next.day, hour, minute, timeZone);
	}
	return target;
}

/** Most recent daily slot ≤ `fromMs`. */
export function mostRecentDailyOccurrenceMs(
	timeHHMM: string,
	timeZone: string | undefined | null,
	fromMs: number = Date.now()
): number {
	const next = nextDailyOccurrenceMs(timeHHMM, timeZone, fromMs);
	const nextParts = getZonedParts(new Date(next), timeZone);
	const { hour, minute } = parseDailyTime(timeHHMM);
	const prevDay = addCalendarDays(nextParts.year, nextParts.month, nextParts.day, -1);
	return zonedTimeToUtcMs(prevDay.year, prevDay.month, prevDay.day, hour, minute, timeZone);
}

export function parsePersistedFetchAt(value: string | undefined | null): number | null {
	if (!value || !String(value).trim()) {
		return null;
	}
	const ms = Date.parse(String(value));
	return Number.isFinite(ms) ? ms : null;
}

export type SchedulePlan = { immediate: boolean; delayMs: number };

/** Fixed-interval schedule using persisted last-fetch. */
export function planIntervalPoll(
	lastFetchAt: string | undefined | null,
	intervalMs: number,
	nowMs: number = Date.now()
): SchedulePlan {
	const last = parsePersistedFetchAt(lastFetchAt);
	if (last === null) {
		return { immediate: true, delayMs: 0 };
	}
	const elapsed = nowMs - last;
	if (elapsed >= intervalMs) {
		return { immediate: true, delayMs: 0 };
	}
	return { immediate: false, delayMs: Math.max(1000, intervalMs - elapsed) };
}

/** Daily WiGLE schedule using persisted last-fetch. */
export function planDailyPoll(
	lastFetchAt: string | undefined | null,
	timeHHMM: string,
	timeZone: string | undefined | null,
	nowMs: number = Date.now()
): SchedulePlan {
	const last = parsePersistedFetchAt(lastFetchAt);
	const recentSlot = mostRecentDailyOccurrenceMs(timeHHMM, timeZone, nowMs);
	if (last === null || last < recentSlot - 5_000) {
		return { immediate: true, delayMs: 0 };
	}
	const next = nextDailyOccurrenceMs(timeHHMM, timeZone, nowMs);
	return { immediate: false, delayMs: Math.max(1000, next - nowMs) };
}
