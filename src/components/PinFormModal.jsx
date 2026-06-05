import { useEffect, useMemo, useState, useId, useCallback } from 'react';
import { AlertTriangle, Camera, Clock, Globe2, Loader2, MapPin, Save, X } from 'lucide-react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&limit=6&q=';
const DEFAULT_CONTINENT = 'Asia';

const tokenizeCompanions = (value = '') =>
  value
    .split(/[,;\n]/)
    .map((name) => name.trim())
    .filter(Boolean);

export default function PinFormModal({ visible, isAdmin, initialData, initialLocation, companionOptions = [], onClose, onSave }) {
  const companionListId = useId();
  const addCompanion = useCallback((value) => {
    const normalized = value.trim();
    if (!normalized) return;
    setCompanions((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setCompanionInput('');
  }, []);

  const removeCompanion = useCallback((value) => {
    setCompanions((prev) => prev.filter((item) => item !== value));
  }, []);

  const toggleSavedCompanion = useCallback(
    (value) => {
      setCompanions((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
      setCompanionInput('');
    },
    []
  );

  const handleCompanionInputKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
        event.preventDefault();
        addCompanion(event.currentTarget.value);
      }
    },
    [addCompanion]
  );
  const [placeName, setPlaceName] = useState('');
  const [country, setCountry] = useState('');
  const [continent, setContinent] = useState(DEFAULT_CONTINENT);
  const [latitude, setLatitude] = useState(initialLocation?.lat || 0);
  const [longitude, setLongitude] = useState(initialLocation?.lng || 0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [companions, setCompanions] = useState([]);
  const [companionInput, setCompanionInput] = useState('');
  const [tripId, setTripId] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState(1);
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPlaceName(initialData?.placeName || '');
    setCountry(initialData?.country || '');
    setContinent(initialData?.continent || DEFAULT_CONTINENT);
    setLatitude(initialLocation?.lat ?? initialData?.latitude ?? 0);
    setLongitude(initialLocation?.lng ?? initialData?.longitude ?? 0);
    setDate(initialData?.date || '');
    setTime(initialData?.time || '');
    setDescription(initialData?.description || '');
    setCompanions(tokenizeCompanions(initialData?.companions || ''));
    setCompanionInput('');
    setTripId(initialData?.tripId || '');
    setSequenceOrder(initialData?.sequenceOrder || 1);
    setLocationQuery(initialData?.placeName || '');
    setImageUrl(initialData?.imageUrl || '');
    setImageBase64('');
    setImageFile(null);
    setError('');
    setSuggestions([]);
    setLocationPanelOpen(false);
  }, [visible, initialData, initialLocation]);

  useEffect(() => {
    if (!locationQuery.trim()) {
      setSuggestions([]);
      setLocationPanelOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`${NOMINATIM_URL}${encodeURIComponent(locationQuery)}`, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.8'
          }
        });
        const results = await response.json();
        setSuggestions(results);
        if (results.length) {
          setLocationPanelOpen(true);
        }
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

  const normalizedCompanionOptions = useMemo(() => companionOptions.filter(Boolean), [companionOptions]);

  const resolvePlaceName = (item) => {
    const address = item.address || {};
    const displayRoot = item.display_name ? item.display_name.split(',')[0] : '';
    return (
      item.namedetails?.['name:en'] ||
      item.namedetails?.name ||
      address.tourism ||
      address.attraction ||
      address.shop ||
      address.building ||
      address.leisure ||
      address.amenity ||
      address.city ||
      address.town ||
      address.village ||
      displayRoot ||
      placeName
    );
  };

  const resolveLocationLabel = (item) => {
    const address = item.address || {};
    return (
      address.state ||
      address.province ||
      address.prefecture ||
      address.region ||
      address.state_district ||
      address.county ||
      address.city ||
      address.town ||
      address.village ||
      address.country ||
      resolvePlaceName(item)
    );
  };

  const resolveCountry = (item) => item.address?.country || country;
  const resolveContinent = (item) => item.address?.continent || continent || DEFAULT_CONTINENT;

  if (!visible) return null;

  const handleSuggestionSelect = (item) => {
    const derivedPlace = resolvePlaceName(item);
    const derivedLocationLabel = resolveLocationLabel(item);
    const derivedCountry = resolveCountry(item);
    const derivedContinent = resolveContinent(item);

    setPlaceName(derivedPlace);
    setCountry(derivedCountry);
    setContinent(derivedContinent || DEFAULT_CONTINENT);
    setLatitude(Number(item.lat));
    setLongitude(Number(item.lon));
    setLocationQuery((derivedLocationLabel || derivedPlace || item.display_name || '').trim());
    setSuggestions([]);
    setLocationPanelOpen(false);
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
        companions: companions.join(', '),
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
              <div className="relative">
                <input
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  onFocus={() => {
                    if (suggestions.length) {
                      setLocationPanelOpen(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setLocationPanelOpen(false);
                    }, 150);
                  }}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                  placeholder="Search city, landmark, address"
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-400" />
                )}
                {locationPanelOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-950/40">
                    {suggestions.map((item) => (
                      <button
                        key={item.place_id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSelect(item)}
                        className="w-full border-b border-slate-800/60 px-4 py-3 text-left text-sm text-slate-200 last:border-b-0 hover:bg-slate-900"
                      >
                        <p className="font-medium text-slate-100">{resolvePlaceName(item)}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.display_name}</p>
                        <p className="mt-1 text-xs text-slate-500">Lat {parseFloat(item.lat).toFixed(4)} · Lon {parseFloat(item.lon).toFixed(4)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              <div className="rounded-3xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-slate-100 focus-within:border-cyan-400">
                <div className="flex flex-wrap items-center gap-2">
                  {companions.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                      {name}
                      <button
                        type="button"
                        onClick={() => removeCompanion(name)}
                        className="text-cyan-200 transition hover:text-cyan-100"
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    list={companionListId}
                    value={companionInput}
                    onChange={(event) => setCompanionInput(event.target.value)}
                    onKeyDown={handleCompanionInputKeyDown}
                    className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm text-slate-100 outline-none"
                    placeholder={companions.length ? 'Add another companion' : 'Type a name and press Enter'}
                  />
                  <button
                    type="button"
                    onClick={() => addCompanion(companionInput)}
                    className="rounded-2xl border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-400"
                  >
                    Add
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">Press Enter or tap Add to capture multiple companions.</p>
              {normalizedCompanionOptions.length > 0 && (
                <>
                  <datalist id={companionListId}>
                    {normalizedCompanionOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {normalizedCompanionOptions.slice(0, 8).map((name) => {
                      const isSelected = companions.includes(name);
                      return (
                        <button
                          key={`${name}-chip`}
                          type="button"
                          onClick={() => toggleSavedCompanion(name)}
                          className={`rounded-2xl border px-3 py-1 text-xs transition ${
                            isSelected
                              ? 'border-cyan-500 bg-cyan-500/20 text-cyan-50'
                              : 'border-slate-700 text-slate-200 hover:border-cyan-400'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
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
