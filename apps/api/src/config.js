'use strict';

require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name, defaultValue) {
  return process.env[name] ?? defaultValue;
}

function optionalInt(name, defaultValue) {
  const val = process.env[name];
  if (!val) return defaultValue;
  const n = parseInt(val, 10);
  if (isNaN(n)) throw new Error(`Environment variable ${name} must be an integer, got: ${val}`);
  return n;
}

function optionalBool(name, defaultValue = false) {
  const val = process.env[name];
  if (!val) return defaultValue;
  return val.toLowerCase() === 'true' || val === '1';
}

const config = {
  env: optional('NODE_ENV', 'development'),
  port: optionalInt('PORT', 3000),
  logLevel: optional('LOG_LEVEL', 'info'),

  db: {
    path: optional('DB_PATH', './data/tracking.db'),
  },

  auth: {
    dashboardKey: optional('API_KEY_DASHBOARD', 'dev-dashboard-key'),
    adminKey: optional('API_KEY_ADMIN', 'dev-admin-key'),
  },

  status: {
    activeSeconds: optionalInt('STATUS_ACTIVE_SECONDS', 180),
    staleSeconds: optionalInt('STATUS_STALE_SECONDS', 600),
  },

  history: {
    retentionHours: optionalInt('HISTORY_RETENTION_HOURS', 24),
    pruneIntervalMinutes: optionalInt('PRUNE_INTERVAL_MINUTES', 30),
  },

  arcgis: {
    enabled: optionalBool('ARCGIS_ENABLED', false),
    featureServiceUrl: optional('ARCGIS_FEATURE_SERVICE_URL', ''),
    clientId: optional('ARCGIS_CLIENT_ID', ''),
    clientSecret: optional('ARCGIS_CLIENT_SECRET', ''),
    tokenUrl: optional('ARCGIS_TOKEN_URL', 'https://www.arcgis.com/sharing/rest/oauth2/token'),
    syncIntervalSeconds: optionalInt('ARCGIS_SYNC_INTERVAL_SECONDS', 30),
  },

  webeoc: {
    enabled: optionalBool('WEBEOC_ENABLED', false),
    baseUrl: optional('WEBEOC_BASE_URL', ''),
    username: optional('WEBEOC_USERNAME', ''),
    password: optional('WEBEOC_PASSWORD', ''),
    boardName: optional('WEBEOC_BOARD_NAME', 'AirportOperations'),
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:5173'),
  },

  ws: {
    heartbeatIntervalMs: optionalInt('WS_HEARTBEAT_INTERVAL_MS', 30000),
  },
};

module.exports = config;
