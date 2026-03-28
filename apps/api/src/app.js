'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const routes = require('./routes/index');
const { errorHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');

function createApp() {
  const app = express();

  // Security headers — relaxed CSP for dashboard serving
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS — configured for dashboard origin
  app.use(cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Device-Key'],
  }));

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));

  // Request logging (skip health checks to reduce noise)
  app.use((req, res, next) => {
    if (!req.path.includes('/health')) {
      logger.debug({ method: req.method, path: req.path }, 'Request');
    }
    next();
  });

  app.use('/', routes);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
