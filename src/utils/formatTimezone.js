import { format } from 'date-fns';

/**
 * Format a timestamp in the user's timezone
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @param {string} formatType - 'date', 'time', 'datetime', 'short', or 'year'
 * @param {string} userTimezone - IANA timezone (e.g., 'America/Chicago')
 * @returns {string} Formatted date/time string
 */
export function formatInUserTimezone(timestamp, formatType = 'datetime', userTimezone) {
  if (!timestamp) return '—';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return '—';
  
  // Use provided timezone or fall back to browser's local timezone
  const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const options = { timeZone: timezone };
  
  switch (formatType) {
    case 'date':
      return new Intl.DateTimeFormat('en-US', {
        ...options,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    
    case 'time':
      return new Intl.DateTimeFormat('en-US', {
        ...options,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    
    case 'datetime':
      return new Intl.DateTimeFormat('en-US', {
        ...options,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    
    case 'short':
      return new Intl.DateTimeFormat('en-US', {
        ...options,
        month: 'short',
        day: 'numeric'
      }).format(date);
    
    case 'year':
      return new Intl.DateTimeFormat('en-US', {
        ...options,
        year: 'numeric'
      }).format(date);
    
    default:
      // Fallback to locale string with timezone
      return date.toLocaleString('en-US', options);
  }
}

/**
 * Get user's timezone from settings or browser
 * @param {string} settingsTimezone - Timezone from app settings
 * @returns {string} IANA timezone string
 */
export function getUserTimezone(settingsTimezone) {
  return settingsTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}