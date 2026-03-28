'use strict';

/**
 * Migration 002 — Geofences and geofence events
 */
exports.up = async function (knex) {
  await knex.schema.createTable('geofences', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
    t.string('type', 20).notNullable().defaultTo('polygon'); // 'polygon' | 'circle'
    t.text('coordinates').notNullable();  // JSON: [[lat,lon],...] or {center:[lat,lon],radius:m}
    t.string('color_hex', 7).notNullable().defaultTo('#ff7800');
    t.integer('active').notNullable().defaultTo(1);
    t.string('created_at', 30).notNullable().defaultTo(knex.raw("(strftime('%Y-%m-%dT%H:%M:%fZ','now'))"));
  });

  await knex.schema.createTable('geofence_events', (t) => {
    t.increments('id').primary();
    t.string('device_id', 50).notNullable().references('device_id').inTable('devices').onDelete('CASCADE');
    t.integer('geofence_id').notNullable().references('id').inTable('geofences').onDelete('CASCADE');
    t.string('event_type', 10).notNullable(); // 'enter' | 'exit'
    t.float('lat').notNullable();
    t.float('lon').notNullable();
    t.string('occurred_at', 30).notNullable().defaultTo(knex.raw("(strftime('%Y-%m-%dT%H:%M:%fZ','now'))"));
  });

  await knex.raw('CREATE INDEX idx_gf_events_device ON geofence_events(device_id, occurred_at DESC)');
  await knex.raw('CREATE INDEX idx_gf_events_fence ON geofence_events(geofence_id, occurred_at DESC)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('geofence_events');
  await knex.schema.dropTableIfExists('geofences');
};
