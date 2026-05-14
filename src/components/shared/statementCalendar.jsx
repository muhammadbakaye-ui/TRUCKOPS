/**
 * Statement Period Calendar — fully dynamic, user-configurable.
 *
 * All functions accept optional settings:
 *   weekStart  {number}  0=Sun … 6=Sat  (which day starts the period)
 *   dueDay     {number}  0=Sun … 6=Sat  (which day of the FOLLOWING week statements are due)
 *
 * Defaults: weekStart=0 (Sunday), dueDay=2 (Tuesday)
 */

import { format, addDays, startOfWeek, parseISO } from 'date-fns';

const DEFAULTS = { weekStart: 0, dueDay: 2 };

/**
 * Given any date, return the start of its statement week.
 */
function getWeekStart(date, weekStart = DEFAULTS.weekStart) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(d, { weekStartsOn: weekStart });
}

/**
 * Compute the due date offset from period start day.
 * Due date = first occurrence of dueDay in the FOLLOWING week.
 */
function computeDueOffset(weekStart, dueDay) {
  // Period ends 6 days after start (always a full 7-day week)
  // "Following week" means 7 days after period start
  // Then find dueDay within that following week
  const periodEndOffset = 6; // period is always 7 days
  const nextWeekStart = periodEndOffset + 1; // 7 days after period start
  let offset = nextWeekStart + ((dueDay - weekStart + 7) % 7);
  return offset;
}

/**
 * Build a period object from a period start date.
 */
function buildPeriod(startDate, weekStart = DEFAULTS.weekStart, dueDay = DEFAULTS.dueDay) {
  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(addDays(startDate, 6), 'yyyy-MM-dd');
  const dueOffset = computeDueOffset(weekStart, dueDay);
  const due = format(addDays(startDate, dueOffset), 'yyyy-MM-dd');
  return { start, end, due };
}

/**
 * Find the statement period for any given date.
 */
export function getPeriodForDate(date, settings = DEFAULTS) {
  const { weekStart = DEFAULTS.weekStart, dueDay = DEFAULTS.dueDay } = settings;
  const start = getWeekStart(date, weekStart);
  return buildPeriod(start, weekStart, dueDay);
}

/**
 * Find period by its due date string.
 * Returns null if the given date is not a valid due date.
 */
export function getPeriodByDueDate(dueDate, settings = DEFAULTS) {
  const { weekStart = DEFAULTS.weekStart, dueDay = DEFAULTS.dueDay } = settings;
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const dueOffset = computeDueOffset(weekStart, dueDay);
  // Period start = due - dueOffset days
  const periodStart = addDays(due, -dueOffset);
  const period = buildPeriod(periodStart, weekStart, dueDay);
  // Validate: the computed due must match what was passed in
  if (period.due !== format(due, 'yyyy-MM-dd')) return null;
  return period;
}

/**
 * Check if a given date string is a valid due date.
 */
export function isValidDueDate(dateStr, settings = DEFAULTS) {
  return getPeriodByDueDate(dateStr, settings) !== null;
}

/**
 * Get all valid due dates for a given year.
 */
export function getAllDueDates(year, settings = DEFAULTS) {
  const { weekStart = DEFAULTS.weekStart, dueDay = DEFAULTS.dueDay } = settings;
  const yr = year || new Date().getFullYear();
  const dates = [];
  // Start from the period that contains Jan 1 of target year
  let periodStart = getWeekStart(new Date(yr, 0, 1), weekStart);
  const cutoff = new Date(yr + 1, 1, 28); // scan through Feb of next year
  while (periodStart <= cutoff) {
    const period = buildPeriod(periodStart, weekStart, dueDay);
    if (period.due.startsWith(String(yr))) {
      dates.push(period.due);
    }
    periodStart = addDays(periodStart, 7);
  }
  return dates;
}

/**
 * Get N weeks of periods centered around today (for dropdowns).
 */
export function getRecentPeriods(weeksBack = 26, weeksAhead = 8, settings = DEFAULTS) {
  const { weekStart = DEFAULTS.weekStart, dueDay = DEFAULTS.dueDay } = settings;
  const today = new Date();
  const currentStart = getWeekStart(today, weekStart);
  const periods = [];
  for (let i = -weeksBack; i <= weeksAhead; i++) {
    const start = addDays(currentStart, i * 7);
    periods.push(buildPeriod(start, weekStart, dueDay));
  }
  return periods;
}

/**
 * Human-readable day name for a day number (0=Sunday).
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Legacy export — kept for backward compatibility.
 */
export const STATEMENT_PERIODS_2026 = getRecentPeriods(52, 26);