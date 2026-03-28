'use strict';

require('dotenv').config();

const http = require('http');
const { createApp } = require('./app');
const { attachWebSocket } = require('./websocket/server');
const { runMigrations } = require('./db/migrate');
const { runSeeds } = require('./db/seed');
const { startPruneJob } = require('./jobs/prune.job');
const { startStatusSweepJob } = require('./jobs/status-sweep.job');
const { startArcGISSyncJob } = require('./jobs/arcgis-sync.job');
const config = require('./config');
const logger = require('./utils/logger');

async function start() {
  // Run migrations on every startup — safe to run on an already-migrated DB
  await runMigrations();

  // Seed only if the devices table is empty (first run)
  const db = require('./db/connection');
  const [{ count }] = await db('devices').count('id as count');
  if (Number(count) === 0) {
    logger.info('Empty database detected, running seeds...');
    await runSeeds();
  }

  const app = createApp();
  const server = http.createServer(app);

  attachWebSocket(server);

  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'API server started');
  });

  // Background jobs
  startPruneJob();
  startStatusSweepJob();
  startArcGISSyncJob();

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    server.close(() => {
      require('./db/connection').destroy().then(() => {
        logger.info('Database connection closed');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
