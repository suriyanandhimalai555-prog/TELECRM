/** Server-side EOD submission window helpers (timezone-aware). */

export const EOD_OPEN_HOUR = 9; // 9:00 AM inclusive
export const EOD_CLOSE_HOUR = 19; // 7:00 PM exclusive (locks at exactly 7:00 PM)

export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE || 'Asia/Kolkata';
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function formatDateInTimezone(date: Date = new Date(), timeZone: string = getAppTimezone()): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function getTodayInAppTimezone(now: Date = new Date()): string {
  return formatDateInTimezone(now, getAppTimezone());
}

/** Convert a wall-clock date/time in APP_TIMEZONE to a UTC Date. */
export function zonedDateTimeToUtc(
  dateStr: string,
  hour: number,
  minute = 0,
  second = 0,
  timeZone: string = getAppTimezone()
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  for (let i = 0; i < 3; i++) {
    const parts = getZonedParts(utc, timeZone);
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    utc = new Date(utc.getTime() + (desiredAsUtc - actualAsUtc));
  }

  return utc;
}

export function getUtcRangeForLocalDate(dateStr: string, timeZone: string = getAppTimezone()) {
  const start = zonedDateTimeToUtc(dateStr, 0, 0, 0, timeZone);
  const end = zonedDateTimeToUtc(dateStr, 24, 0, 0, timeZone);
  return { start, end };
}

export type EodWindowPhase = 'before_open' | 'open' | 'closed';

export function getEodWindowPhase(now: Date = new Date(), timeZone: string = getAppTimezone()) {
  const parts = getZonedParts(now, timeZone);
  const today = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  const minutesOfDay = parts.hour * 60 + parts.minute;
  const openMinutes = EOD_OPEN_HOUR * 60;
  const closeMinutes = EOD_CLOSE_HOUR * 60;

  let phase: EodWindowPhase = 'closed';
  if (minutesOfDay < openMinutes) phase = 'before_open';
  else if (minutesOfDay < closeMinutes) phase = 'open';

  return {
    phase,
    today,
    timezone: timeZone,
    openHour: EOD_OPEN_HOUR,
    closeHour: EOD_CLOSE_HOUR,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function getEodWindowMeta(now: Date = new Date()) {
  const info = getEodWindowPhase(now);
  return {
    timezone: info.timezone,
    openHour: info.openHour,
    closeHour: info.closeHour,
    today: info.today,
    phase: info.phase,
    isOpen: info.phase === 'open',
    serverNow: now.toISOString(),
  };
}
