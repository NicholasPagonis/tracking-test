'use strict';

const knex = require('knex');
const config = require('../config');
const logger = require('../utils/logger');

if (!config.db.url) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}

const db = knex({
  client: 'pg',
  connection: config.db.url,
  pool: { min: 2, max: 10 },
});

logger.info('Database connection initialised (PostgreSQL)');

module.exports = db;
