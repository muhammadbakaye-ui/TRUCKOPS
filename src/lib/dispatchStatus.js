import { getTimezone } from './useTimezone';

// Returns today's date as YYYY-MM-DD in the user's local timezone
export function getLocalDateString(timezone) {
  const tz = timezone || getTimezone();
  // en-CA locale produces YYYY-MM-DD format natively
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

/**
 * Compute the correct dispatch_status for a load based on 4-status rules.
 * - available: no driver assigned
 * - assigned:  driver assigned, pickup in the future
 * - in_transit: pickup date today or past, driver assigned, delivery not yet passed
 * - delivered: delivery date has passed OR manually set to delivered
 */
export function computeDispatchStatus(load, timezone) {
  const today = getLocalDateString(timezone);
  const pickup = load.pickup_date || '';
  const delivery = load.delivery_date || '';
  const hasDriver = !!(load.driver_1_id);
  const current = normalizeDispatchStatus(load.dispatch_status);

  // Already delivered, or delivery date passed → delivered
  if (current === 'delivered') return 'delivered';
  if (delivery && delivery < today) return 'delivered';

  // Pickup today or past + driver assigned + delivery not passed → in_transit
  if (pickup && pickup <= today && hasDriver) return 'in_transit';

  // Driver assigned (pickup in future) → assigned
  if (hasDriver) return 'assigned';

  // No driver → available
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