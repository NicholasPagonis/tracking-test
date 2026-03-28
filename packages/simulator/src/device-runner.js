'use strict';

const { generatePatrolRoute, generateTransitRoute } = require('./route-generator');
const airportBounds = require('../config/airport-bounds.json');

/**
 * Simulates a single device moving around the airport.
 *
 * Behaviours by role:
 *   ground_transport  — wide-ranging patrols between multiple zones
 *   terminal_manager  — slower patrol confined mostly to one terminal
 *   airport_manager   — moves across all areas
 *   security          — airside patrols
 */
class DeviceRunner {
  constructor(device, options = {}) {
    this.device = device;
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:3000';
    this.intervalMs = options.intervalMs || 5000;
    this.simulateStale = options.simulateStale || false;
    this.staleAfterMs = options.staleAfterMs || 0;

    this.waypoints = [];
    this.waypointIndex = 0;
    this.currentLat = null;
    this.currentLon = null;
    this.battery = 85 + Math.floor(Math.random() * 15); // 85-100
    this.timer = null;
    this.startedAt = Date.now();

    this._initPosition();
  }

  _initPosition() {
    const zones = airportBounds.zones;
    const startZone = this.device.start_zone && zones[this.device.start_zone]
      ? zones[this.device.start_zone]
      : Object.values(zones)[0];

    this.currentLat = startZone.center.lat + (Math.random() - 0.5) * 0.002;
    this.currentLon = startZone.center.lon + (Math.random() - 0.5) * 0.002;
    this._generateRoute();
  }

  _generateRoute() {
    const zones = airportBounds.zones;
    const role = this.device.scenario_role;

    if (role === 'terminal_manager') {
      // Stay near their assigned terminal
      const startZone = zones[this.device.start_zone] || Object.values(zones)[0];
      this.waypoints = generatePatrolRoute(startZone.center.lat, startZone.center.lon, startZone.patrol_radius_m, 8);
    } else if (role === 'security') {
      // Airside patrol
      const airsideZones = { 'Airside East': zones['Airside East'], 'Airside West': zones['Airside West'] };
      this.waypoints = generateTransitRoute(airsideZones, airportBounds.bounds);
    } else {
      // ground_transport, airport_manager — wide range
      this.waypoints = generateTransitRoute(zones, airportBounds.bounds);
    }
    this.waypointIndex = 0;
  }

  _nextPosition() {
    if (this.waypoints.length === 0) this._generateRoute();

    const target = this.waypoints[this.waypointIndex];
    const [targetLat, targetLon] = target;

    // Move 20-60% of the way toward the next waypoint each tick
    const step = 0.2 + Math.random() * 0.4;
    this.currentLat = this.currentLat + (targetLat - this.currentLat) * step;
    this.currentLon = this.currentLon + (targetLon - this.currentLon) * step;

    // Advance waypoint when close enough
    const dist = Math.abs(this.currentLat - targetLat) + Math.abs(this.currentLon - targetLon);
    if (dist < 0.0002) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      if (this.waypointIndex === 0) this._generateRoute();
    }

    // Slowly drain battery
    if (Math.random() < 0.05) {
      this.battery = Math.max(5, this.battery - 1);
    }

    // Add small GPS jitter
    this.currentLat += (Math.random() - 0.5) * 0.00005;
    this.currentLon += (Math.random() - 0.5) * 0.00005;
  }

  async _send() {
    const now = new Date().toISOString();
    const body = {
      id: this.device.device_id,
      lat: this.currentLat,
      lon: this.currentLon,
      timestamp: now,
      speed: 2 + Math.random() * 8,     // 2-10 m/s
      bearing: Math.random() * 360,
      accuracy: 3 + Math.random() * 7,  // 3-10m accuracy
      batt: this.battery,
    };

    try {
      const res = await fetch(`${this.apiBaseUrl}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': this.device.api_key,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`[${this.device.device_id}] Ingest failed ${res.status}: ${text}`);
      }
    } catch (err) {
      console.error(`[${this.device.device_id}] Network error:`, err.message);
    }
  }

  start() {
    console.log(`[${this.device.device_id}] Starting simulation (${this.device.platform})`);

    const tick = async () => {
      // Simulate a stale/offline device after staleAfterMs
      if (this.simulateStale && Date.now() - this.startedAt > this.staleAfterMs) {
        console.log(`[${this.device.device_id}] Simulating stale — pausing updates`);
        clearInterval(this.timer);
        return;
      }

      this._nextPosition();
      await this._send();
    };

    this.timer = setInterval(tick, this.intervalMs);
    // Fire immediately
    tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    console.log(`[${this.device.device_id}] Stopped`);
  }
}

module.exports = { DeviceRunner };
