import { useState, useEffect } from 'react';

const TIMEZONE_KEY = 'app_timezone';

export function useTimezone() {
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem(TIMEZONE_KEY);
    if (saved) return saved;
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  useEffect(() => {
    localStorage.setItem(TIMEZONE_KEY, timezone);
  }, [timezone]);

  return [timezone, setTimezone];
}

export function getTimezone() {
  return localStorage.getItem(TIMEZONE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const TIMEZONES = [
  'America/Anchorage',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/New_York',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC'
].sort();