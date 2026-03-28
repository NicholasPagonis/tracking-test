'use strict';

const { WebSocketServer } = require('ws');
const broadcast = require('../services/broadcast.service');
const deviceRepo = require('../repositories/device.repository');
const config = require('../config');
const logger = require('../utils/logger');

const VALID_CHANNELS = ['position_update', 'geofence_events'];

function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info({ ip }, 'WebSocket client connected');

    // Send a heartbeat ping on interval to detect dead connections
    const heartbeat = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'ping', ts: new Date().toISOString() }));
      } else {
        clearInterval(heartbeat);
      }
    }, config.ws.heartbeatIntervalMs);

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      if (msg.type === 'subscribe') {
        const channel = msg.channel;
        if (!VALID_CHANNELS.includes(channel)) {
          ws.send(JSON.stringify({ type: 'error', message: `Unknown channel: ${channel}` }));
          return;
        }
        broadcast.subscribe(channel, ws);
        logger.debug({ ip, channel }, 'Client subscribed');

        // Send current snapshot when subscribing to positions
        if (channel === 'position_update') {
          try {
            const devices = await deviceRepo.findAll();
            ws.send(JSON.stringify({ type: 'snapshot', data: devices, ts: new Date().toISOString() }));
          } catch (err) {
            logger.warn({ err }, 'Failed to send position snapshot');
          }
        }
      } else if (msg.type === 'unsubscribe') {
        broadcast.unsubscribe(msg.channel, ws);
      } else if (msg.type === 'pong') {
        // Client acknowledged our ping — connection is alive
      }
    });

    ws.on('close', () => {
      clearInterval(heartbeat);
      broadcast.unsubscribeAll(ws);
      logger.info({ ip }, 'WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.warn({ err, ip }, 'WebSocket error');
      broadcast.unsubscribeAll(ws);
    });
  });

  logger.info('WebSocket server attached at /ws');
  return wss;
}

module.exports = { attachWebSocket };
