import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, Clock, Globe2, Loader2, MapPin, Save, X } from 'lucide-react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=';

export default function PinFormModal({ visible, isAdmin, initialData, initialLocation, onClose, onSave }) {
  const [placeName, setPlaceName] = useState('');
  const [country, setCountry] = useState('');
  const [continent, setContinent] = useState('');
  const [latitude, setLatitude] = useState(initialLocation?.lat || 0);
  const [longitude, setLongitude] = useState(initialLocation?.lng || 0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [companions, setCompanions] = useState('');
  const [tripId, setTripId] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState(1);
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPlaceName(initialData?.placeName || '');
    setCountry(initialData?.country || '');
    setContinent(initialData?.continent || '');
    setLatitude(initialLocation?.lat ?? initialData?.latitude ?? 0);
    setLongitude(initialLocation?.lng ?? initialData?.longitude ?? 0);
    setDate(initialData?.date || '');
    setTime(initialData?.time || '');
    setDescription(initialData?.description || '');
    setCompanions(initialData?.companions || '');
    setTripId(initialData?.tripId || '');
    setSequenceOrder(initialData?.sequenceOrder || 1);
    setLocationQuery(initialData?.placeName || '');
    setImageUrl(initialData?.imageUrl || '');
    setImageBase64('');
    setImageFile(null);
    setError('');
    setSuggestions([]);
  }, [visible, initialData, initialLocation]);

  useEffect(() => {
    if (!locationQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${NOMINATIM_URL}${encodeURIComponent(locationQuery)}`);
        const results = await response.json();
        setSuggestions(results);
      } catch (err) {
        console.error('Autocomplete failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [locationQuery]);

  useEffect(() => {
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result?.toString() ?? '');
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const fileNameSuggestion = useMemo(() => {
    const locationToken = `${placeName || country}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const dateToken = date.replace(/-/g, '_');
    if (!locationToken || !dateToken) return '';
    return `${locationToken}_${dateToken}.jpg`;
  }, [placeName, country, date]);

  const heicWarning = useMemo(() => {
    const name = imageFile?.name || fileNameSuggestion;
    return name.toLowerCase().endsWith('.heic') || name.toLowerCase().endsWith('.heif');
  }, [imageFile, fileNameSuggestion]);

  const resolvePlaceName = (item) => {
    const address = item.address || {};
    return (
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.neighbourhood ||
      address.suburb ||
      address.road ||
      item.display_name ||
      placeName
    );
  };

  const resolveCountry = (item) => item.address?.country || country;
  const resolveContinent = (item) => item.address?.continent || continent;

  if (!visible) return null;

  const handleSuggestionSelect = (item) => {
    const derivedPlace = resolvePlaceName(item);
    const derivedCountry = resolveCountry(item);
    const derivedContinent = resolveContinent(item);

    setPlaceName(derivedPlace);
    setCountry(derivedCountry);
    setContinent(derivedContinent);
    setLatitude(Number(item.lat));
    setLongitude(Number(item.lon));
    setLocationQuery(derivedPlace || item.display_name || '');
    setSuggestions([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      setError('Only admins can save travel pins.');
      return;
    }
    if (!placeName || !country || !date || !latitude || !longitude) {
      setError('Place, country, date, and coordinates are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSave({
        id: initialData?.id,
        placeName,
        country,
        continent,
        latitude,
        longitude,
        date,
        time,
        description,
        companions,
        tripId,
        sequenceOrder,
        imageUrl,
        imageBase64: imageBase64 || '',
        suggestedName: fileNameSuggestion
      });
    } catch (saveError) {
      console.error(saveError);
      setError('Unable to save pin. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-slate-950/95 p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-slate-950/80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Pin editor</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">Share a new travel moment</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-900 p-3 text-slate-300 transition hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          {heicWarning && (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 text-rose-300" />
                <div>
                  <p className="font-semibold">HEIC/HEIF detected</p>
                  <p>Please export your image as <strong>.jpg</strong> or <strong>.png</strong> before upload.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Location</span>
              <input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                onBlur={() => setTimeout(() => setSuggestions([]), 120)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                placeholder="Search city, landmark, address"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Country</span>
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                placeholder="Country name"
              />
            </label>
          </div>

          {suggestions.length > 0 && (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/95 p-3 text-sm text-slate-200">
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">Suggestions</p>
              <div className="space-y-2">
                {suggestions.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSuggestionSelect(item)}
                    className="w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-500/40"
                  >
                    <p className="font-medium text-slate-100">{item.display_name}</p>
                    <p className="mt-1 text-xs text-slate-500">Lat {parseFloat(item.lat).toFixed(4)} · Lon {parseFloat(item.lon).toFixed(4)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Place name</span>
              <input
                value={placeName}
                onChange={(event) => setPlaceName(event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                placeholder="Tokyo Tower, Main Street, etc."
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Continent</span>
              <input
                value={continent}
                onChange={(event) => setContinent(event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                placeholder="Asia, Europe, North America"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Time</span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Latitude</span>
              <input
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(event) => setLatitude(Number(event.target.value))}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Longitude</span>
              <input
                type="number"
                step="0.000001"
                value={longitude}
                onChange={(event) => setLongitude(Number(event.target.value))}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows="4"
              className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
              placeholder="Add your travel notes, mood, or memory details."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Companions</span>
              <input
                value={companions}
                onChange={(event) => setCompanions(event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                placeholder="Family, friends, solo, business"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Trip ID</span>
              <input
                value={tripId}
                onChange={(event) => setTripId(event.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                placeholder="trip-2026-spring"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-200">
            <span className="text-slate-400">Sequence order</span>
            <input
              type="number"
              value={sequenceOrder}
              min="1"
              onChange={(event) => setSequenceOrder(Number(event.target.value))}
              className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span className="flex items-center gap-2 text-slate-400"><Camera className="h-4 w-4" /> Upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none file:rounded-3xl file:border-0 file:bg-slate-800/90 file:px-3 file:py-2 file:text-slate-100"
              />
            </label>
            <div className="space-y-2 text-sm text-slate-200">
              <span className="text-slate-400">Suggested file name</span>
              <div className="rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-300">{fileNameSuggestion || 'Pick a location and date to generate'}</div>
            </div>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-3xl border border-slate-700 bg-slate-900/90 px-5 py-3 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {initialData ? 'Save changes' : 'Add travel pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
