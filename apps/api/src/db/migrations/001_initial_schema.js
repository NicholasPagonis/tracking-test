'use strict';

/**
 * Migration 001 — Core schema: roles, devices, locations, device_status
 */
exports.up = async function (knex) {
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.string('code', 20).notNullable().unique();       // e.g. 'GTA', 'TDM', 'ADM'
    t.string('label', 100).notNullable();              // e.g. 'Ground Transport Agent'
    t.string('color_hex', 7).notNullable().defaultTo('#3388ff');
    t.string('icon_name', 50).notNullable().defaultTo('default');
  });

  await knex.schema.createTable('devices', (t) => {
    t.increments('id').primary();
    t.string('device_id', 50).notNullable().unique(); // Matches Traccar identifier / OsmAnd ?id=
    t.integer('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT');
    t.string('display_name', 100).notNullable();
    t.string('platform', 20).notNullable().defaultTo('unknown'); // 'android' | 'ios' | 'unknown'
    t.string('api_key_hash', 64).notNullable();        // SHA-256 hex of raw device API key
    t.integer('is_active').notNullable().defaultTo(1);
    t.string('notes', 500);
    t.string('created_at', 30).notNullable().defaultTo(knex.raw("(strftime('%Y-%m-%dT%H:%M:%fZ','now'))"));
  });

  await knex.schema.createTable('locations', (t) => {
    t.increments('id').primary();
    t.string('device_id', 50).notNullable().references('device_id').inTable('devices').onDelete('CASCADE');
    t.float('lat').notNullable();
    t.float('lon').notNullable();
    t.float('altitude_m');
    t.float('speed_ms');                               // metres per second from Traccar
    t.float('bearing_deg');
    t.float('accuracy_m');
    t.float('battery_pct');
    t.string('source_timestamp_utc', 30).notNullable(); // Timestamp from device GPS fix
    t.string('received_timestamp_utc', 30).notNullable().defaultTo(knex.raw("(strftime('%Y-%m-%dT%H:%M:%fZ','now'))"));
    t.string('zone_name', 100);
  });

  // Composite index: most common query pattern is latest N points per device
  await knex.raw('CREATE INDEX idx_locations_device_ts ON locations(device_id, source_timestamp_utc DESC)');
  await knex.raw('CREATE INDEX idx_locations_received ON locations(received_timestamp_utc DESC)');

  await knex.schema.createTable('device_status', (t) => {
    t.string('device_id', 50).primary().references('device_id').inTable('devices').onDelete('CASCADE');
    t.float('lat');
    t.float('lon');
    t.float('speed_ms');
    t.float('bearing_deg');
    t.float('battery_pct');
    t.float('accuracy_m');
    t.string('zone_name', 100);
    t.string('last_seen_utc', 30);
    t.string('source_timestamp_utc', 30);
    t.string('status', 10).notNullable().defaultTo('offline'); // 'active' | 'stale' | 'offline'
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('device_status');
  await knex.schema.dropTableIfExists('locations');
  await knex.schema.dropTableIfExists('devices');
  await knex.schema.dropTableIfExists('roles');
};
