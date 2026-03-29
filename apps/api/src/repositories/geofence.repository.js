'use strict';

const db = require('../db/connection');

async function findAll(activeOnly = true) {
  let query = db('geofences').orderBy('name');
  if (activeOnly) query = query.where('active', true);
  return query;
}

async function findById(id) {
  return db('geofences').where('id', id).first();
}

async function create(data) {
  const [row] = await db('geofences').insert(data).returning('id');
  return findById(row.id);
}

async function update(id, data) {
  await db('geofences').where('id', id).update(data);
  return findById(id);
}

async function remove(id) {
  return db('geofences').where('id', id).delete();
}

async function insertEvent({ device_id, geofence_id, event_type, lat, lon }) {
  const [row] = await db('geofence_events').insert({ device_id, geofence_id, event_type, lat, lon }).returning('id');
  return row.id;
}

async function findEvents({ deviceId, geofenceId, from, to, limit = 100 } = {}) {
  let query = db('geofence_events as e')
    .join('geofences as g', 'e.geofence_id', 'g.id')
    .select('e.*', 'g.name as geofence_name')
    .orderBy('e.occurred_at', 'desc')
    .limit(Math.min(limit, 500));

  if (deviceId) query = query.where('e.device_id', deviceId);
  if (geofenceId) query = query.where('e.geofence_id', geofenceId);
  if (from) query = query.where('e.occurred_at', '>=', from);
  if (to) query = query.where('e.occurred_at', '<=', to);

  return query;
}

module.exports = { findAll, findById, create, update, remove, insertEvent, findEvents };
