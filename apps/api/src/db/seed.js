'use strict';

const path = require('path');
const { runMigrations } = require('./migrate');
const db = require('./connection');
const logger = require('../utils/logger');

async function runSeeds() {
  // Always migrate before seeding
  await runMigrations();

  logger.info('Running database seeds...');
  await db.seed.run({
    directory: path.join(__dirname, 'seeds'),
    loadExtensions: ['.js'],
    specific: undefined,
  });
  logger.info('Seeds complete');
}

if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err, 'Seed failed');
      process.exit(1);
    });
}

module.exports = { runSeeds };
