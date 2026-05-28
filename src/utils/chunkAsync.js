/**
 * Process an array of items in sequential chunks via async fn.
 * Prevents API overload on large bulk operations.
 *
 * @param {Array}    items    - items to process
 * @param {Function} fn       - async function called with each item
 * @param {number}   size     - chunk size (default 10)
 */
export async function chunkAsync(items, fn, size = 10) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}