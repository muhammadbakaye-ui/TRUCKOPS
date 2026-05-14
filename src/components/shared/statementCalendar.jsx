/**
 * Statement Period Calendar — computed dynamically from date math.
 *
 * Rules:
 *   - Periods run Sunday → Saturday
 *   - Due date is the Tuesday after the period ends (9 days after Sunday start)
 *   - No hardcoded list — works for any year, any date
 */

import { format, addDays, startOfWeek, parseISO } from 'date-fns';

/**
 * Given any date, return the Sunday that starts its statement week.
 */
function getWeekSunday(date) {
  // startOfWeek with weekStartsOn: 0 gives Sunday
  return startOfWeek(typeof date === 'string' ? parseISO(date) : date, { weekStartsOn: 0 });
}

/**
 * Build a period object from a Sunday start date.
 */
function buildPeriod(sunday) {
  const start = format(sunday, 'yyyy-MM-dd');
  const end = format(addDays(sunday, 6), 'yyyy-MM-dd');   // Saturday
  const due = format(addDays(sunday, 9), 'yyyy-MM-dd');   // Tuesday of following week
  return { start, end, due };
}

/**
 * Find the statement period for any given date.
 * @param {string|Date} date
 * @returns {{ start: string, end: string, due: string }}
 */
export function getPeriodForDate(date) {
  const sunday = getWeekSunday(date);
  return buildPeriod(sunday);
}

/**
 * Find period by its Tuesday due date.
 * @param {string} dueDate  — 'yyyy-MM-dd'
 * @returns {{ start: string, end: string, due: string } | null}
 */
export function getPeriodByDueDate(dueDate) {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  // Due Tuesday = Sunday start + 9 days → Sunday start = due - 9 days
  const sunday = addDays(due, -9);
  const period = buildPeriod(sunday);
  // Validate: the computed due must match what was passed in
  if (period.due !== format(due, 'yyyy-MM-dd')) return null;
  return period;
}

/**
 * Generate all Tuesday due dates for a given year (for calendar highlighting).
 * @param {number} year — defaults to current year ± 1
 * @returns {string[]} Array of 'yyyy-MM-dd' due date strings
 */
export function getAllDueDates(year) {
  const yr = year || new Date().getFullYear();
  const dates = [];
  // Start from the first Sunday of the year (or Dec 27 of prior year)
  let sunday = getWeekSunday(new Date(yr, 0, 1));
  const end = new Date(yr + 1, 0, 15); // a bit into next year to catch wrap-around
  while (sunday <= end) {
    const period = buildPeriod(sunday);
    // Include due dates that fall in the target year or adjacent
    if (period.due.startsWith(String(yr)) || period.due.startsWith(String(yr + 1))) {
      dates.push(period.due);
    }
    sunday = addDays(sunday, 7);
  }
  return dates;
}

/**
 * Get N weeks of periods centered around today (for dropdowns).
 * @param {number} weeksBack  — how many past weeks to include
 * @param {number} weeksAhead — how many future weeks to include
 * @returns {Array<{ start, end, due }>}
 */
export function getRecentPeriods(weeksBack = 26, weeksAhead = 8) {
  const today = new Date();
  const currentSunday = getWeekSunday(today);
  const periods = [];
  for (let i = -weeksBack; i <= weeksAhead; i++) {
    const sunday = addDays(currentSunday, i * 7);
    periods.push(buildPeriod(sunday));
  }
  return periods;
}

/**
 * Legacy export — replaced by dynamic calculation.
 * Kept so any code that destructures STATEMENT_PERIODS_2026 doesn't crash.
 * Returns recent periods dynamically instead of a hardcoded list.
 */
export const STATEMENT_PERIODS_2026 = getRecentPeriods(52, 26);