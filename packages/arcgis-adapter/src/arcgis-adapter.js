'use strict';

const { ArcGISAuth } = require('./auth');
const { buildFeature } = require('./feature-builder');

/**
 * ArcGIS Feature Service adapter.
 *
 * Implements upsert logic:
 *   1. Query the layer for existing features keyed on device_id
 *   2. Update features that already exist
 *   3. Add features that do not exist
 *
 * This avoids duplicate points accumulating in the feature layer.
 */
class ArcGISAdapter {
  constructor({ featureServiceUrl, clientId, clientSecret, tokenUrl, dryRun = false }) {
    this.url = featureServiceUrl;
    this.dryRun = dryRun;
    this.auth = new ArcGISAuth({ clientId, clientSecret, tokenUrl });
  }

  async _post(endpoint, params) {
    const token = await this.auth.getToken();
    const url = `${this.url}/${endpoint}`;

    const body = new URLSearchParams({ ...params, token, f: 'json' });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`ArcGIS API error at ${endpoint}: ${JSON.stringify(data.error)}`);
    }
    return data;
  }

  /**
   * Query existing features to get their OBJECTIDs keyed by device_id.
   */
  async _queryExisting() {
    const token = await this.auth.getToken();
    const url = `${this.url}/query?where=1%3D1&outFields=OBJECTID,device_id&f=json&token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(`ArcGIS query failed: ${JSON.stringify(data.error)}`);

    const map = {};
    for (const f of data.features || []) {
      map[f.attributes.device_id] = f.attributes.OBJECTID;
    }
    return map;
  }

  /**
   * Upsert a single device's current position into the feature layer.
   */
  async upsertDevice(device) {
    if (this.dryRun) {
      console.log(`[ArcGIS DRY RUN] Would upsert: ${device.device_id} @ ${device.lat},${device.lon}`);
      return;
    }

    if (!device.lat || !device.lon) return; // No position to sync

    const existing = await this._queryExisting();
    const objectId = existing[device.device_id];

    if (objectId !== undefined) {
      // Update existing feature
      const feature = buildFeature(device, objectId);
      await this._post('updateFeatures', {
        features: JSON.stringify([feature]),
      });
    } else {
      // Add new feature
      const feature = buildFeature(device);
      await this._post('addFeatures', {
        features: JSON.stringify([feature]),
      });
    }
  }

  /**
   * Batch upsert all devices. More efficient than individual upserts.
   */
  async upsertAll(devices) {
    if (this.dryRun) {
      devices.forEach((d) => console.log(`[ArcGIS DRY RUN] Would upsert: ${d.device_id}`));
      return { synced: devices.length, mode: 'dry-run' };
    }

    const existing = await this._queryExisting();
    const toAdd = [];
    const toUpdate = [];

    for (const device of devices) {
      if (!device.lat || !device.lon) continue;
      const objectId = existing[device.device_id];
      if (objectId !== undefined) {
        toUpdate.push(buildFeature(device, objectId));
      } else {
        toAdd.push(buildFeature(device));
      }
    }

    const results = { added: 0, updated: 0, errors: 0 };

    if (toAdd.length > 0) {
      const r = await this._post('addFeatures', { features: JSON.stringify(toAdd) });
      results.added = (r.addResults || []).filter((x) => x.success).length;
      results.errors += (r.addResults || []).filter((x) => !x.success).length;
    }

    if (toUpdate.length > 0) {
      const r = await this._post('updateFeatures', { features: JSON.stringify(toUpdate) });
      results.updated = (r.updateResults || []).filter((x) => x.success).length;
      results.errors += (r.updateResults || []).filter((x) => !x.success).length;
    }

    return results;
  }

  async removeDevice(deviceId) {
    if (this.dryRun) {
      console.log(`[ArcGIS DRY RUN] Would delete: ${deviceId}`);
      return;
    }
    const existing = await this._queryExisting();
    const objectId = existing[deviceId];
    if (objectId === undefined) return;

    await this._post('deleteFeatures', { objectIds: String(objectId) });
  }
}

module.exports = { ArcGISAdapter };
