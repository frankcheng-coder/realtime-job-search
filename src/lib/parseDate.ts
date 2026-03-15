import {
  differenceInCalendarDays,
  endOfDay,
  isValid,
  parse,
  parseISO,
  startOfDay,
  subDays,
  subHours,
} from "date-fns";

const DATE_FORMATS = [
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "M/d/yyyy",
  "MM/dd/yyyy",
  "yyyy-MM-dd",
];

export function normalizePostedDate(raw?: string | null) {
  if (!raw) {
    return { postedAt: null, postedAgeDays: null, postedRaw: null };
  }

  const input = raw.replace(/\s+/g, " ").trim();
  const lower = input.toLowerCase();
  const now = new Date();
  let resolved: Date | null = null;

  if (lower === "today" || lower === "posted today") {
    resolved = now;
  } else if (lower === "yesterday" || lower === "posted yesterday") {
    resolved = subDays(now, 1);
  } else {
    const hoursMatch = lower.match(/(?:posted\s+)?(\d+)\s+hours?\s+ago/);
    const daysMatch = lower.match(/(?:posted\s+)?(\d+)\s+days?\s+ago/);

    if (hoursMatch) {
      resolved = subHours(now, Number(hoursMatch[1]));
    } else if (daysMatch) {
      resolved = subDays(now, Number(daysMatch[1]));
    } else {
      for (const format of DATE_FORMATS) {
        const parsed = parse(input, format, now);
        if (isValid(parsed)) {
          resolved = parsed;
          break;
        }
      }

      if (!resolved) {
        try {
          const parsedIso = parseISO(input);
          if (isValid(parsedIso)) {
            resolved = parsedIso;
          }
        } catch {
          resolved = null;
        }
      }
    }
  }

  if (!resolved || !isValid(resolved)) {
    return { postedAt: null, postedAgeDays: null, postedRaw: input };
  }

  const postedAgeDays = differenceInCalendarDays(endOfDay(now), startOfDay(resolved));
  return {
    postedAt: resolved.toISOString(),
    postedAgeDays,
    postedRaw: input,
  };
}
