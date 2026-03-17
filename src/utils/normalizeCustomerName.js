/**
 * Normalizes a company/customer name for fuzzy matching and grouping.
 * Strips common suffixes, removes spaces/punctuation, lowercases.
 * Returns a canonical key used to group similar names together.
 */

const STRIP_SUFFIXES = [
  'llc', 'inc', 'corp', 'co', 'ltd', 'lp', 'group', 'company',
  'logistics', 'transport', 'transportation', 'trucking', 'freight',
  'carriers', 'carrier', 'services', 'service', 'solutions', 'solution',
];

export function normalizeCustomerName(name) {
  if (!name) return '';
  let n = name.toLowerCase();
  // Remove punctuation and extra spaces
  n = n.replace(/[.,\-_'&]/g, ' ').replace(/\s+/g, ' ').trim();
  // Remove common business suffixes
  const words = n.split(' ').filter(w => w.length > 0 && !STRIP_SUFFIXES.includes(w));
  // Collapse to a single string with no spaces for comparison
  return words.join('').replace(/\s/g, '');
}

/**
 * Given a raw name and a map of { canonicalKey -> displayName },
 * returns the best existing display name if a match is found,
 * otherwise returns the raw name (and adds it to the map).
 *
 * Usage: call this once per name while building your aggregation map.
 */
export function resolveCanonicalName(rawName, canonicalMap) {
  const key = normalizeCustomerName(rawName);
  if (!key) return rawName;
  if (canonicalMap[key]) return canonicalMap[key];
  canonicalMap[key] = rawName;
  return rawName;
}

/**
 * Groups an array of items by a fuzzy-matched customer name field.
 * Returns { [canonicalDisplayName]: T[] }
 */
export function groupByCustomer(items, getNameFn) {
  const keyToDisplay = {}; // canonical key → first seen display name
  const groups = {};

  items.forEach(item => {
    const raw = getNameFn(item) || 'Unknown';
    const key = normalizeCustomerName(raw);
    // First time we see this key, register the display name
    if (!keyToDisplay[key]) keyToDisplay[key] = raw;
    const display = keyToDisplay[key];
    if (!groups[display]) groups[display] = [];
    groups[display].push(item);
  });

  return groups;
}