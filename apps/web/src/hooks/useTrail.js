import { useState, useEffect } from 'react';
import { fetchTrail } from '../api/devices.js';

export function useTrail(deviceId, minutes = 60, enabled = false) {
  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !deviceId) {
      setTrail(null);
      return;
    }
    setLoading(true);
    fetchTrail(deviceId, minutes)
      .then(({ data }) => {
        setTrail(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [deviceId, minutes, enabled]);

  return { trail, loading };
}
