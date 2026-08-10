type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  formatterCache.set(timeZone, value);
  return value;
}

export function isValidTimeZone(timeZone: string) {
  try {
    formatter(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(timeZone: string | null | undefined) {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
}

export function zonedDateParts(date: Date, timeZone: string): DateParts {
  const values = Object.fromEntries(
    formatter(normalizeTimeZone(timeZone))
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  const value = (key: string) => {
    const part = values[key];
    if (!Number.isFinite(part)) throw new RangeError(`Unable to resolve ${key} in timezone ${timeZone}`);
    return part as number;
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}

export function zonedDateTimeToUtc(parts: DateParts, timeZone: string) {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let resolved = target;

  // Re-resolve the offset to account for daylight-saving transitions.
  for (let pass = 0; pass < 3; pass += 1) {
    const actual = zonedDateParts(new Date(resolved), timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const correction = target - actualAsUtc;
    if (correction === 0) break;
    resolved += correction;
  }

  return new Date(resolved);
}

function shiftLocalDate(parts: Pick<DateParts, "year" | "month" | "day">, days: number) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
}

function localMidnight(parts: Pick<DateParts, "year" | "month" | "day">, timeZone: string) {
  return zonedDateTimeToUtc({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function getDayRange(timeZone: string, now = new Date()) {
  const local = zonedDateParts(now, timeZone);
  const date = { year: local.year, month: local.month, day: local.day };
  return {
    start: localMidnight(date, timeZone),
    end: localMidnight(shiftLocalDate(date, 1), timeZone)
  };
}

export function getRollingDayRange(timeZone: string, days: number, now = new Date()) {
  const local = zonedDateParts(now, timeZone);
  const date = { year: local.year, month: local.month, day: local.day };
  return {
    start: localMidnight(shiftLocalDate(date, -(Math.max(1, days) - 1)), timeZone),
    end: localMidnight(shiftLocalDate(date, 1), timeZone)
  };
}

export function getFutureDayBoundary(timeZone: string, daysAhead: number, now = new Date()) {
  const local = zonedDateParts(now, timeZone);
  return localMidnight(
    shiftLocalDate({ year: local.year, month: local.month, day: local.day }, daysAhead),
    timeZone
  );
}

export function getLocalDateTimeForDayOffset(
  timeZone: string,
  daysAhead: number,
  hour: number,
  minute = 0,
  now = new Date()
) {
  const local = zonedDateParts(now, timeZone);
  const date = shiftLocalDate({ year: local.year, month: local.month, day: local.day }, daysAhead);
  return zonedDateTimeToUtc({ ...date, hour, minute, second: 0 }, timeZone);
}

export function getMonthRange(month: string, timeZone: string) {
  const [yearToken = "", monthToken = ""] = month.split("-");
  const yearValue = Number(yearToken);
  const monthValue = Number(monthToken);
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getUTCFullYear();
  const monthIndex = Number.isFinite(monthValue) ? monthValue : 1;
  const next = new Date(Date.UTC(year, monthIndex, 1));

  return {
    start: localMidnight({ year, month: monthIndex, day: 1 }, timeZone),
    end: localMidnight(
      { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: 1 },
      timeZone
    )
  };
}

export function localDateKey(date: Date, timeZone: string) {
  const parts = zonedDateParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
