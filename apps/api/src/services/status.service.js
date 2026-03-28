'use strict';

const config = require('../config');
const { ageSeconds } = require('../utils/time');

/**
 * Classify a device status based on the age of its last fix.
 * Pure function — no I/O.
 */
function classify(lastSeenUtc) {
  const age = ageSeconds(lastSeenUtc);
  if (age <= config.status.activeSeconds) return 'active';
  if (age <= config.status.staleSeconds) return 'stale';
  return 'offline';
}

module.exports = { classify };
