/** Vietnam time (UTC+7) — canonical timezone for every user-facing date/time in the app. */
export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Format a UTC Date as an ISO string in Vietnam time (UTC+7), sliced to `length` chars. */
export function toVNDate(date: Date, length = 10): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, length);
}

/** Parse a `datetime-local` input value entered as Vietnam time (UTC+7) into a UTC Date. */
export function fromVietnamDatetimeLocal(value: string): Date {
  return new Date(`${value}:00+07:00`);
}

/** UTC instant range `[start, end)` covering "today" and "tomorrow" in Vietnam time. */
export function vnTodayTomorrowRangeUTC(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const vnMidnightUTC = Date.UTC(
    vnNow.getUTCFullYear(),
    vnNow.getUTCMonth(),
    vnNow.getUTCDate(),
  );
  const start = new Date(vnMidnightUTC - VN_OFFSET_MS);
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);
  return { start, end };
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: APP_TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIMEZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIMEZONE,
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIMEZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
  timeZone: APP_TIMEZONE,
});

const shortWeekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: APP_TIMEZONE,
});

const joiningDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: APP_TIMEZONE,
});

/** e.g. "Sunday, 15 June 2026" — match-day section headers. */
export function formatMatchDate(date: Date): string {
  return dateFormatter.format(date);
}

/** e.g. "20:00" — kickoff time only. */
export function formatKickoffTime(date: Date): string {
  return timeFormatter.format(date);
}

/** e.g. "Sunday, 15 June 2026, 20:00" — voting deadlines, match detail, challenges. */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

/** e.g. "15 Jun 2026, 20:00" — compact timestamp, no weekday (leaderboard "last updated"). */
export function formatShortDateTime(date: Date): string {
  return shortDateTimeFormatter.format(date);
}

/** e.g. "15 Jun" — compact date, no year (recent predictions table, tab date labels). */
export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date);
}

/** e.g. "Sun" — compact weekday (tab date labels). */
export function formatShortWeekday(date: Date): string {
  return shortWeekdayFormatter.format(date);
}

export function formatJoiningDate(date: Date): string {
  return joiningDateFormatter.format(date);
}
