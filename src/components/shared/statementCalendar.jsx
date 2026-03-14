// 2026 Statement Period Calendar
// Each week: Sunday start - Saturday end, with Tuesday due date
export const STATEMENT_PERIODS_2026 = [
  // February 2026
  { start: '2026-02-01', end: '2026-02-07', due: '2026-02-10' },
  { start: '2026-02-08', end: '2026-02-14', due: '2026-02-17' },
  { start: '2026-02-15', end: '2026-02-21', due: '2026-02-24' },
  { start: '2026-02-22', end: '2026-02-28', due: '2026-03-03' },
  
  // March 2026
  { start: '2026-03-01', end: '2026-03-07', due: '2026-03-10' },
  { start: '2026-03-08', end: '2026-03-14', due: '2026-03-17' },
  { start: '2026-03-15', end: '2026-03-21', due: '2026-03-24' },
  { start: '2026-03-22', end: '2026-03-28', due: '2026-03-31' },
  { start: '2026-03-29', end: '2026-04-04', due: '2026-04-07' },
  
  // April 2026
  { start: '2026-04-05', end: '2026-04-11', due: '2026-04-14' },
  { start: '2026-04-12', end: '2026-04-18', due: '2026-04-21' },
  { start: '2026-04-19', end: '2026-04-25', due: '2026-04-28' },
  { start: '2026-04-26', end: '2026-05-02', due: '2026-05-05' },
  
  // May 2026
  { start: '2026-05-03', end: '2026-05-09', due: '2026-05-12' },
  { start: '2026-05-10', end: '2026-05-16', due: '2026-05-19' },
  { start: '2026-05-17', end: '2026-05-23', due: '2026-05-26' },
  { start: '2026-05-24', end: '2026-05-30', due: '2026-06-02' },
  { start: '2026-05-31', end: '2026-06-06', due: '2026-06-09' },
  
  // June 2026
  { start: '2026-06-07', end: '2026-06-13', due: '2026-06-16' },
  { start: '2026-06-14', end: '2026-06-20', due: '2026-06-23' },
  { start: '2026-06-21', end: '2026-06-27', due: '2026-06-30' },
  { start: '2026-06-28', end: '2026-07-04', due: '2026-07-07' },
  
  // July 2026
  { start: '2026-07-05', end: '2026-07-11', due: '2026-07-14' },
  { start: '2026-07-12', end: '2026-07-18', due: '2026-07-21' },
  { start: '2026-07-19', end: '2026-07-25', due: '2026-07-28' },
  { start: '2026-07-26', end: '2026-08-01', due: '2026-08-04' },
  
  // August 2026
  { start: '2026-08-02', end: '2026-08-08', due: '2026-08-11' },
  { start: '2026-08-09', end: '2026-08-15', due: '2026-08-18' },
  { start: '2026-08-16', end: '2026-08-22', due: '2026-08-25' },
  { start: '2026-08-23', end: '2026-08-29', due: '2026-09-01' },
  { start: '2026-08-30', end: '2026-09-05', due: '2026-09-08' },
  
  // September 2026
  { start: '2026-09-06', end: '2026-09-12', due: '2026-09-15' },
  { start: '2026-09-13', end: '2026-09-19', due: '2026-09-22' },
  { start: '2026-09-20', end: '2026-09-26', due: '2026-09-29' },
  { start: '2026-09-27', end: '2026-10-03', due: '2026-10-06' },
  
  // October 2026
  { start: '2026-10-04', end: '2026-10-10', due: '2026-10-13' },
  { start: '2026-10-11', end: '2026-10-17', due: '2026-10-20' },
  { start: '2026-10-18', end: '2026-10-24', due: '2026-10-27' },
  { start: '2026-10-25', end: '2026-10-31', due: '2026-11-03' },
  
  // November 2026
  { start: '2026-11-01', end: '2026-11-07', due: '2026-11-10' },
  { start: '2026-11-08', end: '2026-11-14', due: '2026-11-17' },
  { start: '2026-11-15', end: '2026-11-21', due: '2026-11-24' },
  { start: '2026-11-22', end: '2026-11-28', due: '2026-12-01' },
  { start: '2026-11-29', end: '2026-12-05', due: '2026-12-08' },
  
  // December 2026
  { start: '2026-12-06', end: '2026-12-12', due: '2026-12-15' },
  { start: '2026-12-13', end: '2026-12-19', due: '2026-12-22' },
  { start: '2026-12-20', end: '2026-12-26', due: '2026-12-29' },
  { start: '2026-12-27', end: '2027-01-02', due: '2027-01-05' },
];

/**
 * Find the statement period for a given date
 * @param {string|Date} date - Date to look up
 * @returns {object|null} Period object with start, end, due dates
 */
export function getPeriodForDate(date) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return STATEMENT_PERIODS_2026.find(p => dateStr >= p.start && dateStr <= p.end) || null;
}

/**
 * Find period by due date (Tuesday)
 * @param {string|Date} dueDate - The Tuesday due date
 * @returns {object|null} Period object with start, end, due dates
 */
export function getPeriodByDueDate(dueDate) {
  const dateStr = typeof dueDate === 'string' ? dueDate : dueDate.toISOString().split('T')[0];
  return STATEMENT_PERIODS_2026.find(p => p.due === dateStr) || null;
}

/**
 * Get all Tuesday due dates for calendar highlighting
 * @returns {string[]} Array of Tuesday due dates in YYYY-MM-DD format
 */
export function getAllDueDates() {
  return STATEMENT_PERIODS_2026.map(p => p.due);
}