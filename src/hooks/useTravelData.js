import { useCallback, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function parsePinObject(raw) {
  return {
    id: raw.id?.toString() ?? raw[0]?.toString() ?? '',
    latitude: Number(raw.latitude ?? raw[1]) || 0,
    longitude: Number(raw.longitude ?? raw[2]) || 0,
    placeName: raw.placeName ?? raw[3] ?? '',
    country: raw.country ?? raw[4] ?? '',
    continent: raw.continent ?? raw[5] ?? '',
    date: raw.date ?? raw[6] ?? '',
    time: raw.time ?? raw[7] ?? '',
    description: raw.description ?? raw[8] ?? '',
    companions: raw.companions ?? raw[9] ?? '',
    imageUrl: raw.imageUrl ?? raw[10] ?? '',
    tripId: raw.tripId ?? raw[11] ?? '',
    sequenceOrder: Number(raw.sequenceOrder ?? raw[12]) || 0
  };
}

export default function useTravelData() {
  const [pins, setPins] = useState([]);
  const [filteredPins, setFilteredPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => window.localStorage.getItem('atlas-attack-admin') === 'true');
  const [configPassword, setConfigPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tripFilter, setTripFilter] = useState('all');

  const filterPins = useCallback((term, tripId, items) => {
    const normalized = term.trim().toLowerCase();
    return items.filter((pin) => {
      const candidate = `${pin.placeName} ${pin.country} ${pin.continent} ${pin.description} ${pin.companions}`.toLowerCase();
      const matchesSearch = !normalized || candidate.includes(normalized);
      const matchesTrip = !tripId || tripId === 'all' || pin.tripId === tripId;
      return matchesSearch && matchesTrip;
    });
  }, []);

  const refreshPins = useCallback(async () => {
    if (!API_URL) {
      console.warn('Missing VITE_API_URL environment variable');
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}?action=read`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      const data = await response.json();
      const rows = Array.isArray(data.pins) ? data.pins.map(parsePinObject) : [];
      setPins(rows);
      setConfigPassword(data.configPassword || '');
      setFilteredPins(filterPins(searchTerm, tripFilter, rows));
    } catch (error) {
      console.error('Failed to refresh travel pins', error);
    } finally {
      setLoading(false);
    }
  }, [filterPins, searchTerm, tripFilter]);

  const updateSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const verifyAdmin = useCallback(
    (password) => {
      if (!password || !configPassword) return false;
      const valid = password === configPassword;
      if (valid) {
        setIsAdmin(true);
        window.localStorage.setItem('atlas-attack-admin', 'true');
      }
      return valid;
    },
    [configPassword]
  );

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
    window.localStorage.removeItem('atlas-attack-admin');
  }, []);

  const savePin = useCallback(
    async (pin) => {
      if (!API_URL) return null;
      setLoading(true);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify({ action: 'create', pin })
        });
        const data = await response.json();
        if (data.status === 'success' && data.pin) {
          const parsed = parsePinObject(data.pin);
          const updated = [parsed, ...pins];
          setPins(updated);
          setFilteredPins(filterPins(searchTerm, tripFilter, updated));
          return parsed;
        }
      } catch (error) {
        console.error('Failed to create pin', error);
      } finally {
        setLoading(false);
      }
      return null;
    },
    [API_URL, filterPins, pins, searchTerm, tripFilter]
  );

  const updatePin = useCallback(
    async (pin) => {
      if (!API_URL) return null;
      setLoading(true);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify({ action: 'update', pin })
        });
        const data = await response.json();
        if (data.status === 'success' && data.pin) {
          const updatedRow = parsePinObject(data.pin);
          const updated = pins.map((item) => (item.id === updatedRow.id ? updatedRow : item));
          setPins(updated);
          setFilteredPins(filterPins(searchTerm, tripFilter, updated));
          return updatedRow;
        }
      } catch (error) {
        console.error('Failed to update pin', error);
      } finally {
        setLoading(false);
      }
      return null;
    },
    [API_URL, filterPins, pins, searchTerm, tripFilter]
  );

  useEffect(() => {
    refreshPins();
  }, [refreshPins]);

  useEffect(() => {
    setFilteredPins(filterPins(searchTerm, tripFilter, pins));
  }, [filterPins, pins, searchTerm, tripFilter]);

  return {
    pins,
    filteredPins,
    loading,
    isAdmin,
    searchTerm,
    tripFilter,
    refreshPins,
    verifyAdmin,
    logoutAdmin,
    savePin,
    updatePin,
    setFilterTerm: updateSearch,
    setTripFilter
  };
}
