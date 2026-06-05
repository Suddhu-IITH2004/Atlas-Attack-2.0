import { useMemo, useRef, useState } from 'react';
import { Globe2, MapPin, ShieldCheck, Plus, LogOut, Menu, X } from 'lucide-react';
import useTravelData from './hooks/useTravelData';
import StatsPanel from './components/StatsPanel';
import TravelMap from './components/TravelMap';
import PinFormModal from './components/PinFormModal';

export default function App() {
  const {
    pins,
    filteredPins,
    loading,
    isAdmin,
    refreshPins,
    verifyAdmin,
    logoutAdmin,
    savePin,
    updatePin,
    searchTerm,
    tripFilter,
    setTripFilter,
    setFilterTerm
  } = useTravelData();

  const [showLogin, setShowLogin] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const statsSectionRef = useRef(null);
  const mapSectionRef = useRef(null);
  const showMap = !showLogin && !formVisible;
  const mainPaddingClass = navOpen ? 'pt-56 md:pt-32' : 'pt-28 md:pt-32';

  const scrollToStats = () => {
    setNavOpen(false);
    statsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToMap = () => {
    setNavOpen(false);
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // console.log('Loaded pins:', pins);
  // console.log('Show Map:', showMap, 'Show Login:', showLogin, 'Form Visible:', formVisible);
  const openCreatePin = (location) => {
    setEditingPin(null);
    setPendingLocation(location);
    setFormVisible(true);
  };

  const openEditPin = (pin) => {
    if (!isAdmin) return;
    setEditingPin(pin);
    setPendingLocation({ lat: pin.latitude, lng: pin.longitude });
    setFormVisible(true);
  };

  const handleSave = async (data) => {
    const result = editingPin ? await updatePin({ ...editingPin, ...data }) : await savePin(data);
    if (result) {
      setEditingPin(null);
      setPendingLocation(null);
      setFormVisible(false);
    }
  };

  const tripOptions = useMemo(() => {
    const ids = pins
      .map((pin) => (pin.tripId ? pin.tripId.toString().trim() : ''))
      .filter((id) => id);
    return Array.from(new Set(ids));
  }, [pins]);

  const companionOptions = useMemo(() => {
    const names = new Set();
    pins.forEach((pin) => {
      if (!pin.companions) return;
      pin.companions
        .split(/[,;\n]/)
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((name) => names.add(name));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [pins]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-800/70 bg-slate-950/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-cyan-300">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Atlas Attack</p>
              <h1 className="text-xl font-semibold text-slate-50">Travel Tracker</h1>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
            <div className="relative flex min-w-[220px] items-center rounded-2xl border border-slate-800 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-sm shadow-slate-950/20">
              <label htmlFor="trip-filter" className="mr-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                Trip
              </label>
              <select
                id="trip-filter"
                value={tripFilter}
                onChange={(event) => setTripFilter(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 outline-none"
              >
                <option value="all" className="text-slate-900">
                  All trips
                </option>
                {tripOptions.map((tripId) => (
                  <option key={tripId} value={tripId} className="text-slate-900">
                    Trip {tripId}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={scrollToStats}
              className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-500/40"
            >
              View stats
            </button>
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  logoutAdmin();
                } else {
                  setShowLogin(true);
                }
              }}
              className="rounded-2xl border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
            >
              {isAdmin ? 'Sign out' : 'Admin Login'}
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setNavOpen((value) => !value)}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-slate-100"
              aria-label="Toggle navigation"
            >
              {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="mx-auto max-w-7xl px-4 pb-4 md:hidden">
            <div className="space-y-3 rounded-[28px] border border-slate-800/80 bg-slate-900/95 p-4 shadow-xl shadow-slate-950/30">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    openCreatePin(null);
                    setNavOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-3xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  <Plus className="h-4 w-4" /> Add Pin
                </button>
              )}
              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 px-3 py-3 text-sm text-slate-100">
                <label htmlFor="trip-filter-mobile" className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
                  Trip filter
                </label>
                <select
                  id="trip-filter-mobile"
                  value={tripFilter}
                  onChange={(event) => setTripFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm text-slate-100 outline-none"
                >
                  <option value="all" className="text-slate-900">
                    All trips
                  </option>
                  {tripOptions.map((tripId) => (
                    <option key={tripId} value={tripId} className="text-slate-900">
                      Trip {tripId}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={scrollToStats}
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100"
              >
                Jump to stats
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isAdmin) {
                    logoutAdmin();
                  } else {
                    setShowLogin(true);
                  }
                  setNavOpen(false);
                }}
                className="w-full rounded-3xl border border-cyan-500 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
              >
                {isAdmin ? 'Sign out' : 'Admin Login'}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className={`relative mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-8 ${mainPaddingClass} md:px-6`}>
        {showMap && (
          <section
            ref={mapSectionRef}
            id="map-section"
            className="relative w-full min-h-[calc(100vh-140px)] overflow-hidden rounded-[32px] border border-slate-800/90 bg-slate-900/80 shadow-2xl shadow-slate-950/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/80 px-4 py-4 text-slate-100/90">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Interactive map</p>
                  <p className="text-sm text-slate-100">Pin touch, view details, and build journeys from every location.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="hidden md:inline">{filteredPins.length} pins</span>
                {loading && <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">Syncing</span>}
              </div>
            </div>

            <TravelMap
              pins={filteredPins}
              isAdmin={isAdmin}
              onCreatePin={openCreatePin}
              onEditPin={openEditPin}
            />

            <div className="pointer-events-none absolute left-4 top-4 hidden rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-200 shadow-lg shadow-slate-950/30 md:flex">
              <MapPin className="mr-2 h-4 w-4 text-cyan-300" />
              Focus the map, then tap any pin to show details.
            </div>
          </section>
        )}

        <section
          ref={statsSectionRef}
          id="stats-section"
          className="w-full rounded-[32px] border border-slate-800/80 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Live Dashboard</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">Travel insights</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Scroll here to inspect trends, totals, and context about every recorded journey.
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToMap}
              className="self-start rounded-3xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-500/40"
            >
              Back to map
            </button>
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-800/90 bg-slate-950/90 p-4 shadow-xl shadow-slate-950/40">
            <StatsPanel pins={filteredPins} />
          </div>
        </section>
      </main>

      {isAdmin && (
        <button
          type="button"
          onClick={() => openCreatePin(null)}
          className="fixed bottom-6 right-6 z-20 hidden h-16 w-16 items-center justify-center rounded-full bg-cyan-500 text-slate-950 shadow-2xl shadow-cyan-500/30 transition hover:scale-105 md:flex"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 hidden border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur md:flex md:justify-center">
        <div className="flex w-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <span>{isAdmin ? 'Admin mode active' : 'Viewer mode'}</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={logoutAdmin} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800">
                <LogOut className="mr-2 inline h-4 w-4" /> Sign out
              </button>
            )}
          </div>
        </div>
      </div>

      <PinFormModal
        visible={formVisible}
        isAdmin={isAdmin}
        initialData={editingPin}
        initialLocation={pendingLocation}
        companionOptions={companionOptions}
        onClose={() => {
          setFormVisible(false);
          setEditingPin(null);
          setPendingLocation(null);
        }}
        onSave={handleSave}
      />

      {showLogin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/95 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <div className="mb-4 flex items-center justify-between z-100">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Secure Admin</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Admin Login</h2>
              </div>
              <button onClick={() => setShowLogin(false)} className="rounded-full bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-400">Enter the admin password from the backend configuration. This session persists in localStorage until you sign out.</p>
              <LoginForm onVerify={verifyAdmin} onSuccess={() => setShowLogin(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginForm({ onVerify, onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const valid = onVerify(password);
    if (valid) {
      onSuccess();
    } else {
      setError('Password did not match backend configuration.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm text-slate-200">
        <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">Admin Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setError('');
            setPassword(event.target.value);
          }}
          className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
          placeholder="Enter secret admin phrase"
        />
      </label>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" className="w-full rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
        Unlock Admin
      </button>
    </form>
  );
}
