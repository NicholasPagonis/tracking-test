'use strict';

const db = require('../db/connection');

async function insert(record) {
  const [row] = await db('locations').insert(record).returning('id');
  return row.id;
}

async function findHistory(deviceId, { from, to, limit = 500 } = {}) {
  let query = db('locations')
    .where('device_id', deviceId)
    .orderBy('source_timestamp_utc', 'desc')
    .limit(Math.min(limit, 1000));

  if (from) query = query.where('source_timestamp_utc', '>=', from);
  if (to) query = query.where('source_timestamp_utc', '<=', to);

  return query;
}

// Trail: last N points, ordered chronologically for polyline rendering
async function findTrail(deviceId, minutes = 60) {
  const from = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  return db('locations')
    .where('device_id', deviceId)
    .where('source_timestamp_utc', '>=', from)
    .orderBy('source_timestamp_utc', 'asc')
    .select('lat', 'lon', 'source_timestamp_utc');
}

// Delete locations older than retentionHours
async function pruneOld(retentionHours) {
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();
  return db('locations').where('received_timestamp_utc', '<', cutoff).delete();
}

module.exports = { insert, findHistory, findTrail, pruneOld };
