// ====================================================================
// ZOLVE AI DATA LOADER — Feature 6 Optimization
// Async loader for large synthetic AI datasets (out of main bundle)
// - forecastPredictions.json (20 cities ×14 services ×34 test dates)
// - trustHistory.json (234 providers ×60 days)
// No AI logic changed; schemas preserved exactly.
// ====================================================================

// In-memory cache for browser session (prevents refetch on navigation)
let forecastCache = null;
let forecastPromise = null;
let trustCache = null;
let trustPromise = null;

/**
 * Load forecast predictions asynchronously from public/data/
 * Schema: date, city, service_id, service_name, actual_booking_count, predicted_booking_count
 * Returns Promise<Array> — empty array on failure/empty
 */
export async function loadForecastPredictions() {
  if (forecastCache) return forecastCache;
  if (forecastPromise) return forecastPromise;
  forecastPromise = fetch('/data/forecastPredictions.json')
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load forecast predictions: ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Forecast predictions: expected array');
      if (data.length === 0) {
        console.warn('[aiDataLoader] forecast predictions empty');
        forecastCache = [];
        return forecastCache;
      }
      // Preserve exact schema, no transformation
      forecastCache = data;
      return forecastCache;
    })
    .catch((err) => {
      console.error('[aiDataLoader] forecast load failed', err);
      forecastCache = [];
      return forecastCache;
    })
    .finally(() => {
      forecastPromise = null;
    });
  return forecastPromise;
}

/**
 * Load trust history asynchronously from public/data/
 * Schema: provider_id, date, city, service_id, booking_count, completed_count,
 *         cancelled_count, rejected_count, rating, active_jobs, daily_earnings_proxy
 * Returns Promise<Array>
 */
export async function loadTrustHistory() {
  if (trustCache) return trustCache;
  if (trustPromise) return trustPromise;
  trustPromise = fetch('/data/trustHistory.json')
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load trust history: ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Trust history: expected array');
      if (data.length === 0) {
        console.warn('[aiDataLoader] trust history empty');
        trustCache = [];
        return trustCache;
      }
      trustCache = data;
      return trustCache;
    })
    .catch((err) => {
      console.error('[aiDataLoader] trust history load failed', err);
      trustCache = [];
      return trustCache;
    })
    .finally(() => {
      trustPromise = null;
    });
  return trustPromise;
}

/**
 * Clear in-memory caches (useful for tests or forced reload)
 */
export function clearAiDataCache() {
  forecastCache = null;
  forecastPromise = null;
  trustCache = null;
  trustPromise = null;
}

/**
 * Helpers to check if data is already cached (synchronous)
 */
export function getCachedForecast() { return forecastCache; }
export function getCachedTrustHistory() { return trustCache; }
