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

  // CORS — wildcard for LAN/PoC use; lock down for production
  const corsOrigin = config.cors.origin === '*' ? true : config.cors.origin;
  app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Device-Key'],
  }));

  app.use(express.json({ limit: '100kb' }));
  // Traccar Client iOS POSTs application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

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
