import { getTimezone } from './useTimezone';

// Returns today's date as YYYY-MM-DD in the user's local timezone
export function getLocalDateString(timezone) {
  const tz = timezone || getTimezone();
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

// Returns current time as HH:MM in the given timezone (Feature 2)
export function getCurrentTimeInTimezone(timezone) {
  const tz = timezone || getTimezone();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const hour = (parts.find(p => p.type === 'hour')?.value || '00').padStart(2, '0');
  const minute = (parts.find(p => p.type === 'minute')?.value || '00').padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * Compute the correct dispatch_status for a load.
 * Feature 1: Returns current status unchanged if manual_dispatch_override is set.
 * Feature 2: Uses pickup_time for time-based In Transit trigger.
 */
export function computeDispatchStatus(load, timezone) {
  // Feature 1: Never touch manually overridden loads
  if (load.manual_dispatch_override) return normalizeDispatchStatus(load.dispatch_status);

  const tz = timezone || load.resolved_timezone || getTimezone();
  const today = getLocalDateString(tz);
  const currentTime = getCurrentTimeInTimezone(tz);
  const pickup = load.pickup_date || '';
  const pickupTime = load.pickup_time || '00:00'; // from first stop's time_from
  const delivery = load.delivery_date || '';
  const hasDriver = !!(load.driver_1_id);
  const current = normalizeDispatchStatus(load.dispatch_status);

  // Already delivered — preserve (user manually set)
  if (current === 'delivered') return 'delivered';
  // Delivery date passed → delivered
  if (delivery && delivery < today) return 'delivered';

  // Feature 2: In Transit — pickup date in the past
  if (pickup && pickup < today && hasDriver) return 'in_transit';
  // Feature 2: In Transit — pickup is today AND pickup time has arrived
  if (pickup === today && currentTime >= pickupTime && hasDriver) return 'in_transit';

  // Has driver (pickup in future or no pickup date) → assigned
  if (hasDriver) return 'assigned';
  return 'available';
}

/**
 * Map legacy dispatch_status values to the new 4-status system.
 */
export function normalizeDispatchStatus(status) {
  const map = {
    pending: 'available',
    dispatched: 'assigned',
    at_pickup: 'in_transit',
    at_delivery: 'in_transit',
    completed: 'delivered',
  };
  return map[status] || status || 'available';
}