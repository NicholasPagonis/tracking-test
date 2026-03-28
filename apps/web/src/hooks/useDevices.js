import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDevices } from '../api/devices.js';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
const REFRESH_MS = parseInt(import.meta.env.VITE_REFRESH_INTERVAL_MS || '10000', 10);

export function useDevices() {
  const [devices, setDevices] = useState({});   // keyed by device_id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const loadDevices = useCallback(async () => {
    try {
      const { data } = await fetchDevices();
      setDevices(Object.fromEntries(data.map((d) => [d.device_id, d])));
      setLastSync(new Date().toISOString());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'position_update' }));
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'geofence_events' }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'snapshot') {
          const map = {};
          for (const d of msg.data) map[d.device_id] = d;
          setDevices(map);
          setLastSync(msg.ts);
        } else if (msg.type === 'position_update') {
          setDevices((prev) => ({ ...prev, [msg.data.device_id]: msg.data }));
          setLastSync(msg.ts);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      // Reconnect with backoff
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connectWS, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    loadDevices();
    connectWS();

    // Fallback REST poll if WS not delivering
    const pollTimer = setInterval(loadDevices, REFRESH_MS);

    return () => {
      clearInterval(pollTimer);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [loadDevices, connectWS]);

  return {
    devices: Object.values(devices),
    loading,
    error,
    lastSync,
    refresh: loadDevices,
  };
}
