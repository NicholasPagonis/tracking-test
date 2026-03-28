'use strict';

/**
 * WebEOC Adapter — STUB IMPLEMENTATION
 *
 * This stub demonstrates the interface that a real WebEOC integration would implement.
 * All methods log their inputs and return mock responses.
 *
 * HOW TO IMPLEMENT FOR REAL:
 * --------------------------
 * WebEOC exposes a SOAP/REST API depending on version.
 * The typical approach is:
 *
 * 1. POST to /WebEOCProxy/api/login with credentials to obtain a session token
 * 2. POST to /WebEOCProxy/api/board/{boardName}/data to push records
 * 3. GET  /WebEOCProxy/api/board/{boardName}/data to read records
 *
 * Field mapping from this system's DeviceWithStatus → WebEOC board record:
 *   device_id        → resource_id
 *   display_name     → resource_name
 *   role_label       → resource_type
 *   status           → operational_status
 *   zone_name        → last_known_location
 *   last_seen_utc    → last_update
 *   lat/lon          → lat/lon (or reference the ArcGIS layer by map service URL)
 *
 * ArcGIS Integration Path into WebEOC:
 * ------------------------------------
 * The most reliable path for this proof of concept is:
 * 1. ArcGIS hosted feature layer is kept current by the arcgis-adapter
 * 2. A WebEOC map widget references the ArcGIS feature service URL
 * 3. WebEOC board records link to the ArcGIS layer for map display
 * This avoids the need for a real-time WebEOC API push while still showing
 * resource positions in the WebEOC environment.
 */
class WebEOCAdapter {
  constructor({ baseUrl, username, password, boardName }) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
    this.boardName = boardName;
    this._sessionToken = null;
  }

  /**
   * Authenticate against WebEOC.
   * STUB: logs and returns a mock token.
   */
  async connect() {
    console.log(`[WebEOC STUB] connect() → ${this.baseUrl}, board: ${this.boardName}`);
    this._sessionToken = 'stub-session-token-' + Date.now();
    return { ok: true, token: this._sessionToken };
  }

  /**
   * Push current resource status for all tracked devices to the WebEOC board.
   * STUB: logs the payload and returns mock success.
   *
   * @param {Array} devices - DeviceWithStatus records from the API
   */
  async pushResourceStatus(devices) {
    console.log(`[WebEOC STUB] pushResourceStatus() — ${devices.length} devices`);

    const records = devices.map((d) => ({
      resource_id: d.device_id,
      resource_name: d.display_name,
      resource_type: d.role_label,
      platform: d.platform,
      operational_status: d.status,
      last_known_location: d.zone_name || 'Unknown',
      last_update: d.last_seen_utc,
      lat: d.lat,
      lon: d.lon,
      arcgis_layer_note: 'See ArcGIS feature layer for real-time map position',
    }));

    console.log('[WebEOC STUB] Records that would be pushed:', JSON.stringify(records, null, 2));

    return {
      ok: true,
      pushed: devices.length,
      board: this.boardName,
      note: 'STUB — no real WebEOC connection made',
    };
  }

  /**
   * Push a single resource update.
   * STUB: logs and returns mock response.
   */
  async pushSingleResource(device) {
    console.log(`[WebEOC STUB] pushSingleResource() — ${device.device_id} status=${device.status}`);
    return { ok: true, device_id: device.device_id, note: 'STUB' };
  }

  /**
   * Disconnect / invalidate session.
   */
  async disconnect() {
    console.log('[WebEOC STUB] disconnect()');
    this._sessionToken = null;
  }
}

module.exports = { WebEOCAdapter };
