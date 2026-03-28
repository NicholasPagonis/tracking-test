'use strict';

/**
 * ArcGIS OAuth2 token manager (client credentials flow).
 * Caches the token until near expiry.
 */
class ArcGISAuth {
  constructor({ clientId, clientSecret, tokenUrl }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenUrl = tokenUrl;
    this._token = null;
    this._expiresAt = 0;
  }

  async getToken() {
    if (this._token && Date.now() < this._expiresAt - 30_000) {
      return this._token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('ArcGIS credentials not configured');
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      expiration: '60',
    });

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`ArcGIS token request failed: ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`ArcGIS token error: ${data.error.message}`);
    }

    this._token = data.access_token;
    // ArcGIS returns expires_in in minutes
    this._expiresAt = Date.now() + (data.expires_in || 60) * 60 * 1000;
    return this._token;
  }
}

module.exports = { ArcGISAuth };
