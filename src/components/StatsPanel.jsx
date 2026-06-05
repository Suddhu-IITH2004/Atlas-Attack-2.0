import { BarChart3, Compass, HeartHandshake, MapPin, Sparkles, Truck } from 'lucide-react';
import { useMemo } from 'react';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StatsPanel({ pins }) {
  const stats = useMemo(() => {
    const countries = new Set();
    const cities = new Set();
    const continentCounts = {};
    const companionCounts = {};
    const trips = {};

    pins.forEach((pin) => {
      if (pin.country) countries.add(pin.country);
      if (pin.placeName) cities.add(pin.placeName);
      if (pin.continent) {
        continentCounts[pin.continent] = (continentCounts[pin.continent] || 0) + 1;
      }
      if (pin.companions) {
        const companionKey = pin.companions.trim().toLowerCase();
        companionCounts[companionKey] = (companionCounts[companionKey] || 0) + 1;
      }
      if (pin.tripId) {
        trips[pin.tripId] = trips[pin.tripId] || [];
        trips[pin.tripId].push(pin);
      }
    });

    const bestContinent = Object.entries(continentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
    const topCompanion = Object.entries(companionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Solo';

    const totalDistance = Object.values(trips).reduce((acc, tripPins) => {
      const sorted = [...tripPins].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      const distance = sorted.reduce((tripAcc, current, index) => {
        if (index === 0) return 0;
        const previous = sorted[index - 1];
        return tripAcc + haversineDistance(previous.latitude, previous.longitude, current.latitude, current.longitude);
      }, 0);
      return acc + distance;
    }, 0);

    return {
      totalCountries: countries.size,
      totalCities: cities.size,
      bestContinent,
      topCompanion: topCompanion === 'solo' ? 'Solo travels' : topCompanion,
      totalDistance: Math.round(totalDistance)
    };
  }, [pins]);

  const tiles = [
    {
      icon: MapPin,
      label: 'Countries visited',
      value: stats.totalCountries
    },
    {
      icon: Compass,
      label: 'Cities logged',
      value: stats.totalCities
    },
    {
      icon: BarChart3,
      label: 'Most visited continent',
      value: stats.bestContinent
    },
    {
      icon: HeartHandshake,
      label: 'Top companion type',
      value: stats.topCompanion
    },
    {
      icon: Truck,
      label: 'Total travel distance',
      value: `${stats.totalDistance} km`
    }
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-800/90 bg-slate-950/90 p-5 shadow-lg shadow-slate-950/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Travel stats</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-100">Your travel intelligence</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">This panel computes meaningful travel metrics instantly from your pin history.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[28px] border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl shadow-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
