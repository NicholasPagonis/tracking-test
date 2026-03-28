'use strict';

const path = require('path');
const db = require('./connection');
const logger = require('../utils/logger');

async function runMigrations() {
  logger.info('Running database migrations...');
  await db.migrate.latest({
    directory: path.join(__dirname, 'migrations'),
    loadExtensions: ['.js'],
  });
  const [, migrations] = await db.migrate.list({
    directory: path.join(__dirname, 'migrations'),
    loadExtensions: ['.js'],
  });
  logger.info({ applied: migrations.map((m) => m.name) }, 'Migrations complete');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err, 'Migration failed');
      process.exit(1);
    });
}

module.exports = { runMigrations };
