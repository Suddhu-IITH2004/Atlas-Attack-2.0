import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const assetUrl = (relativePath) => {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = relativePath.replace(/^\//, '');
  return `${base}${normalized}`;
};

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl || !rawUrl.includes('/file/d/')) return rawUrl;
  const parts = rawUrl.split('/file/d/')[1];
  if (!parts) return rawUrl;
  const fileId = parts.split('/')[0];
  if (!fileId) return rawUrl;
  // Google Drive preview assets proxy through lh3; add a size modifier so the CDN responds quickly.
  return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
};

const formatCoordinate = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(4);
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric.toFixed(4);
  }
  return value || '—';
};


const customPinIcon = new L.Icon({
  iconUrl: assetUrl('icons/map-pin.png'),
  iconSize: [34, 42],
  iconAnchor: [17, 42],
  popupAnchor: [0, -36]
});

L.Marker.prototype.options.icon = customPinIcon;

function AdminMapEvents({ isAdmin, onMapCreate }) {
  useMapEvents({
    click(event) {
      if (isAdmin && onMapCreate) {
        onMapCreate(event.latlng);
      }
    }
  });
  return null;
}



export default function TravelMap({ pins, isAdmin, onCreatePin, onEditPin }) {
  const defaultCenter = useMemo(() => {
    if (!pins.length) return [36.2048, 138.2529];
    const avgLat = pins.reduce((sum, pin) => sum + pin.latitude, 0) / pins.length;
    const avgLon = pins.reduce((sum, pin) => sum + pin.longitude, 0) / pins.length;
    return [avgLat, avgLon];
  }, [pins]);

  const [selectedPin, setSelectedPin] = useState(null);

  const tripPolylines = useMemo(() => {
    const trips = pins.reduce((acc, pin) => {
      if (!pin.tripId) return acc;
      acc[pin.tripId] = acc[pin.tripId] || [];
      acc[pin.tripId].push(pin);
      return acc;
    }, {});

    return Object.values(trips)
      .map((trip) => trip.sort((a, b) => a.sequenceOrder - b.sequenceOrder))
      .filter((route) => route.length > 1)
      .map((route) => route.map((point) => [point.latitude, point.longitude]));
  }, [pins]);

  useEffect(() => {
    if (!selectedPin) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedPin]);

  useEffect(() => {
    if (!selectedPin) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setSelectedPin(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPin]);

  const selectedImageSrc = selectedPin ? resolveImageUrl(selectedPin.imageUrl) : null;

  const closeSelectedPin = () => setSelectedPin(null);
  const handleEditSelectedPin = () => {
    if (!selectedPin) return;
    onEditPin(selectedPin);
    setSelectedPin(null);
  };

  return (
    <>
      <MapContainer
      center={defaultCenter}
      zoom={3}
      minZoom={2}
      maxZoom={16}
      scrollWheelZoom
      className="h-full w-full"
      style={{ minHeight: '55vh', height: '100%', width: '100%' }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {pins.map((pin) => (
        <Marker
          key={pin.id || `${pin.latitude}-${pin.longitude}-${pin.date}`}
          position={[pin.latitude, pin.longitude]}
          eventHandlers={{ click: () => setSelectedPin(pin) }}
        />
      ))}

      {tripPolylines.map((positions, index) => (
        <Polyline
          key={`trip-${index}`}
          positions={positions}
          pathOptions={{ color: '#38bdf8', dashArray: '5, 10', weight: 3, opacity: 0.85 }}
        />
      ))}

      <AdminMapEvents isAdmin={isAdmin} onMapCreate={onCreatePin} />
    </MapContainer>

      {selectedPin && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/95 px-4 py-6 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-slate-50 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Selected Pin</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedPin.placeName || 'Unnamed location'}</h3>
                <p className="text-sm text-slate-500">{selectedPin.country} · {selectedPin.continent}</p>
              </div>
              <button
                type="button"
                onClick={closeSelectedPin}
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-600 transition hover:text-slate-900"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 pb-6 pt-4 text-slate-800">
              <p className="text-sm text-slate-500">
                {selectedPin.date || 'Unknown date'} • {selectedPin.time || 'Unknown time'}
              </p>
              {selectedImageSrc && (
                <img
                  src={selectedImageSrc}
                  alt={selectedPin.placeName}
                  className="mt-4 h-64 w-full rounded-3xl object-cover"
                />
              )}
              {selectedPin.description && (
                <p className="mt-4 text-base text-slate-700">{selectedPin.description}</p>
              )}
              {selectedPin.companions && (
                <p className="mt-4 text-sm text-slate-600">
                  <strong className="font-semibold text-slate-800">Companions:</strong> {selectedPin.companions}
                </p>
              )}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-500">
                Lat {formatCoordinate(selectedPin.latitude)} · Lon {formatCoordinate(selectedPin.longitude)}
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeSelectedPin}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Close
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleEditSelectedPin}
                    className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Edit pin
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
