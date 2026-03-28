import { useState, useEffect } from 'react';
import { fetchGeofences } from '../api/geofences.js';

export function useGeofences() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGeofences()
      .then(({ data }) => {
        setGeofences(data.filter((z) => z.active));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { geofences, loading };
}
