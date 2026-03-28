'use strict';

const logger = require('../utils/logger');

// Map of channel name → Set of WebSocket clients
const channels = new Map();

function subscribe(channel, ws) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(ws);
}

function unsubscribe(channel, ws) {
  if (channels.has(channel)) channels.get(channel).delete(ws);
}

function unsubscribeAll(ws) {
  for (const subs of channels.values()) {
    subs.delete(ws);
  }
}

function emit(channel, data) {
  const subs = channels.get(channel);
  if (!subs || subs.size === 0) return;

  const payload = JSON.stringify({ type: channel, data, ts: new Date().toISOString() });

  for (const ws of subs) {
    // ws.readyState === 1 means OPEN
    if (ws.readyState === 1) {
      try {
        ws.send(payload);
      } catch (err) {
        logger.warn({ err }, 'WebSocket send error, removing client');
        subs.delete(ws);
      }
    } else {
      subs.delete(ws);
    }
  }
}

function subscriberCount(channel) {
  return channels.get(channel)?.size ?? 0;
}

module.exports = { subscribe, unsubscribe, unsubscribeAll, emit, subscriberCount };
