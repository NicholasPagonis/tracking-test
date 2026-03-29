'use strict';

const db = require('../db/connection');

async function findAll({ roleCode, status } = {}) {
  let query = db('devices as d')
    .leftJoin('roles as r', 'd.role_id', 'r.id')
    .leftJoin('device_status as s', 'd.device_id', 's.device_id')
    .select(
      'd.device_id',
      'd.display_name',
      'd.platform',
      'd.notes',
      'd.is_active',
      'd.created_at',
      'r.code as role_code',
      'r.label as role_label',
      'r.color_hex',
      'r.icon_name',
      's.lat',
      's.lon',
      's.speed_ms',
      's.bearing_deg',
      's.battery_pct',
      's.accuracy_m',
      's.zone_name',
      's.last_seen_utc',
      's.source_timestamp_utc',
      's.status'
    );

  if (roleCode) query = query.where('r.code', roleCode.toUpperCase());
  if (status) query = query.where('s.status', status);

  return query.where('d.is_active', 1).orderBy('d.device_id');
}

async function findById(deviceId) {
  return db('devices as d')
    .leftJoin('roles as r', 'd.role_id', 'r.id')
    .leftJoin('device_status as s', 'd.device_id', 's.device_id')
    .select(
      'd.device_id',
      'd.display_name',
      'd.platform',
      'd.notes',
      'd.is_active',
      'd.created_at',
      'r.code as role_code',
      'r.label as role_label',
      'r.color_hex',
      'r.icon_name',
      's.lat',
      's.lon',
      's.speed_ms',
      's.bearing_deg',
      's.battery_pct',
      's.accuracy_m',
      's.zone_name',
      's.last_seen_utc',
      's.source_timestamp_utc',
      's.status'
    )
    .where('d.device_id', deviceId)
    .first();
}

async function findByApiKeyHash(hash) {
  return db('devices').where('api_key_hash', hash).where('is_active', 1).first();
}

async function upsertStatus(deviceId, { lat, lon, speed_ms, bearing_deg, battery_pct, accuracy_m, zone_name, last_seen_utc, source_timestamp_utc, status }) {
  await db('device_status')
    .insert({ device_id: deviceId, lat, lon, speed_ms, bearing_deg, battery_pct, accuracy_m, zone_name, last_seen_utc, source_timestamp_utc, status })
    .onConflict('device_id')
    .merge();
}

async function updateStatus(deviceId, status) {
  await db('device_status').where('device_id', deviceId).update({ status });
}

// Returns all devices with status != 'offline' for the status sweep job
async function findActiveOrStale() {
  return db('device_status').whereNot('status', 'offline');
}

async function update(deviceId, fields) {
  await db('devices').where('device_id', deviceId).update(fields);
  return findById(deviceId);
}

async function create({ device_id, role_id, display_name, platform, api_key_hash, notes }) {
  await db('devices').insert({ device_id, role_id, display_name, platform, api_key_hash, notes, is_active: 1 });
  await db('device_status').insert({ device_id, status: 'offline' }).onConflict('device_id').merge();
  return findById(device_id);
}

async function findAllRoles() {
  return db('roles').orderBy('code');
}

// Return the received_timestamp_utc of the most recent ingest for a device
async function latestIngestTime(deviceId) {
  return db('locations')
    .where('device_id', deviceId)
    .orderBy('received_timestamp_utc', 'desc')
    .select('received_timestamp_utc')
    .first();
}

module.exports = { findAll, findById, findByApiKeyHash, upsertStatus, updateStatus, findActiveOrStale, update, create, findAllRoles, latestIngestTime };
