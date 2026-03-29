'use strict';

/**
 * Migration 002 — Geofences and geofence events
 */
exports.up = async function (knex) {
  await knex.schema.createTable('geofences', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
    t.string('type', 20).notNullable().defaultTo('polygon');
    t.text('coordinates').notNullable();
    t.string('color_hex', 7).notNullable().defaultTo('#ff7800');
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('geofence_events', (t) => {
    t.increments('id').primary();
    t.string('device_id', 50).notNullable().references('device_id').inTable('devices').onDelete('CASCADE');
    t.integer('geofence_id').notNullable().references('id').inTable('geofences').onDelete('CASCADE');
    t.string('event_type', 10).notNullable();
    t.float('lat').notNullable();
    t.float('lon').notNullable();
    t.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_gf_events_device ON geofence_events(device_id, occurred_at DESC)');
  await knex.raw('CREATE INDEX idx_gf_events_fence ON geofence_events(geofence_id, occurred_at DESC)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('geofence_events');
  await knex.schema.dropTableIfExists('geofences');
};
