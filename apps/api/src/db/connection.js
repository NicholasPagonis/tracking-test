'use strict';

const path = require('path');
const fs = require('fs');
const knex = require('knex');
const config = require('../config');
const logger = require('../utils/logger');

const dbPath = path.resolve(config.db.path);

// Ensure the data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = knex({
  client: 'better-sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true,
  pool: {
    afterCreate(conn, done) {
      // Enable WAL mode for better read/write concurrency
      conn.pragma('journal_mode = WAL');
      // Enforce foreign key constraints
      conn.pragma('foreign_keys = ON');
      // Reduce lock wait errors under load
      conn.pragma('busy_timeout = 5000');
      done(null, conn);
    },
  },
});

logger.info({ dbPath }, 'Database connection initialised');

module.exports = db;
