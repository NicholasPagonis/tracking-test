'use strict';

const { DeviceRunner } = require('./device-runner');
const devicesConfig = require('../config/devices.json');

/**
 * Scenarios define per-device overrides for behaviour.
 */
const SCENARIOS = {
  'normal-ops': {
    // All devices running normally
    overrides: {},
  },
  'stale-ios': {
    // Simulate iPhone devices going stale after 4 minutes
    overrides: {
      GTA_2: { simulateStale: true, staleAfterMs: 4 * 60 * 1000 },
      TDM_1: { simulateStale: true, staleAfterMs: 6 * 60 * 1000 },
    },
  },
  'emergency': {
    // All devices move faster (500ms interval)
    intervalMsOverride: 500,
    overrides: {},
  },
};

class Simulator {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || process.env.SIMULATOR_API_BASE_URL || 'http://localhost:3000';
    this.intervalMs = options.intervalMs || parseInt(process.env.SIMULATOR_INTERVAL_MS, 10) || 5000;
    this.scenario = options.scenario || process.env.SIMULATOR_SCENARIO || 'normal-ops';
    this.runners = [];
  }

  start() {
    const scenarioCfg = SCENARIOS[this.scenario] || SCENARIOS['normal-ops'];
    const intervalMs = scenarioCfg.intervalMsOverride || this.intervalMs;

    console.log(`Starting simulator: scenario=${this.scenario}, interval=${intervalMs}ms, api=${this.apiBaseUrl}`);
    console.log(`Simulating ${devicesConfig.devices.length} devices`);

    for (const device of devicesConfig.devices) {
      const overrides = scenarioCfg.overrides[device.device_id] || {};
      const runner = new DeviceRunner(device, {
        apiBaseUrl: this.apiBaseUrl,
        intervalMs,
        ...overrides,
      });
      this.runners.push(runner);
      // Stagger starts by 1-2 seconds to avoid thundering herd
      const delay = Math.random() * 2000;
      setTimeout(() => runner.start(), delay);
    }

    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop() {
    console.log('\nStopping simulator...');
    this.runners.forEach((r) => r.stop());
    process.exit(0);
  }
}

module.exports = { Simulator };
