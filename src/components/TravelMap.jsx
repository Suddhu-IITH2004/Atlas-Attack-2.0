import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinAssetUrl = new URL('icons/map-pin.png', import.meta.env.BASE_URL).href;

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl || !rawUrl.includes('/file/d/')) return rawUrl;
  const parts = rawUrl.split('/file/d/')[1];
  if (!parts) return rawUrl;
  const fileId = parts.split('/')[0];
  if (!fileId) return rawUrl;
  // Google Drive preview assets proxy through lh3; add a size modifier so the CDN responds quickly.
  return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
};


const customPinIcon = new L.Icon({
  iconUrl: pinAssetUrl,
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

  return (
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
      {pins.map((pin) => {
        const imageSrc = resolveImageUrl(pin.imageUrl);
        return (
        <Marker key={pin.id || `${pin.latitude}-${pin.longitude}-${pin.date}`} position={[pin.latitude, pin.longitude]}>
          <Popup>
            <div className="max-w-xs">
              <p className="text-sm font-semibold text-slate-950">{pin.placeName || 'Unnamed location'}</p>
              <p className="mt-1 text-xs text-slate-700">{pin.country} · {pin.continent}</p>
              <p className="mt-2 text-sm text-slate-700">{pin.date} • {pin.time}</p>
              {imageSrc && (
                <img 
                  src={imageSrc} 
                  alt={pin.placeName} 
                  className="mt-3 h-36 w-full rounded-2xl object-cover" 
                />
              )}
              {pin.description && <p className="mt-3 text-sm text-slate-700">{pin.description}</p>}
              {pin.companions && <p className="mt-3 text-sm text-slate-700"><strong>Companions:</strong> {pin.companions}</p>}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onEditPin(pin)}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Edit pin
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      );})}

      {tripPolylines.map((positions, index) => (
        <Polyline
          key={`trip-${index}`}
          positions={positions}
          pathOptions={{ color: '#38bdf8', dashArray: '5, 10', weight: 3, opacity: 0.85 }}
        />
      ))}

      <AdminMapEvents isAdmin={isAdmin} onMapCreate={onCreatePin} />
    </MapContainer>
  );
}
