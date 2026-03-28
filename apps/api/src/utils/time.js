'use strict';

/** Current UTC timestamp as ISO-8601 string. */
function nowUtc() {
  return new Date().toISOString();
}

/** Age in seconds between an ISO timestamp and now. */
function ageSeconds(isoTimestamp) {
  if (!isoTimestamp) return Infinity;
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  return diff / 1000;
}

module.exports = { nowUtc, ageSeconds };
