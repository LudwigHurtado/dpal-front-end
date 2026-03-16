import React, { useState, useMemo } from 'react';
import { ArrowLeft, Broadcast, MapPin, Loader, Send, X, Clock, Coins, Scale, Target } from './icons';
import type { Mission } from '../types';
import type { FieldBeacon } from '../App';

const DEFAULT_CENTER = 'Earth';
const MOCK_HELP_REQUESTS: Array<{
  id: string;
  name: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  locationLabel: string;
}> = [
  { id: 'hr-1', name: 'Jordan M.', title: 'Need witness for landlord dispute', description: 'Documenting unsafe conditions. Someone nearby to sign as witness.', lat: 34.0522, lng: -118.2437, locationLabel: 'Los Angeles, CA' },
  { id: 'hr-2', name: 'Sam K.', title: 'Water quality testing volunteer', description: 'Community well testing. Bring phone for photos.', lat: 40.7128, lng: -74.0060, locationLabel: 'New York, NY' },
  { id: 'hr-3', name: 'Riley T.', title: 'Traffic hazard documentation', description: 'Recurring pothole and flooding at intersection. Need timestamps.', lat: 41.8781, lng: -87.6298, locationLabel: 'Chicago, IL' },
];

type MissionTier = 'Local' | 'National' | 'Global';

interface CampaignMission {
  id: string;
  title: string;
  location: string;
  tier: MissionTier;
  deadlineIso: string;
  rewardPool: { funded: number; target: number; currency: string };
  teamMission: boolean;
  sponsor?: string;
}

interface FieldMissionsViewProps {
  onReturn: () => void;
  missions: Mission[];
  beacons: FieldBeacon[];
  onPublishBeacon: (latitude: number, longitude: number, label?: string) => void;
}

const FieldMissionsView: React.FC<FieldMissionsViewProps> = ({
  onReturn,
  missions,
  beacons,
  onPublishBeacon,
}) => {
  const [mapCenter, setMapCenter] = useState<string>(DEFAULT_CENTER);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [beaconLoading, setBeaconLoading] = useState(false);
  const [beaconError, setBeaconError] = useState<string | null>(null);
  const [messageFor, setMessageFor] = useState<{ id: string; name: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [requestSentIds, setRequestSentIds] = useState<Set<string>>(new Set());

  const campaignMissions = useMemo<CampaignMission[]>(() => {
    const now = Date.now();
    return missions.slice(0, 8).map((m, idx) => {
      const tier: MissionTier = idx % 3 === 0 ? 'Global' : idx % 2 === 0 ? 'National' : 'Local';
      const hours = tier === 'Global' ? 96 : tier === 'National' ? 72 : 36;
      const target = tier === 'Global' ? 10000 : tier === 'National' ? 6000 : 2000;
      const funded = Math.min(target, Math.max(300, Math.round(target * (0.25 + (idx * 0.09 % 0.6)))));
      return {
        id: m.id,
        title: m.title,
        location: m.location || 'Location TBD',
        tier,
        deadlineIso: new Date(now + hours * 60 * 60 * 1000).toISOString(),
        rewardPool: { funded, target, currency: 'DPAL' },
        teamMission: true,
        sponsor: idx % 2 === 0 ? 'Community Treasury' : 'Civic Sponsor Pool',
      };
    });
  }, [missions]);

  const mapUrl = useMemo(() => {
    const q = mapCenter || DEFAULT_CENTER;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=k&z=12&ie=UTF8&iwloc=&output=embed`;
  }, [mapCenter]);

  const handleBeacon = () => {
    setBeaconError(null);
    setBeaconLoading(true);
    if (!navigator.geolocation) {
      setBeaconError('Location not supported');
      setBeaconLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onPublishBeacon(latitude, longitude, 'Field beacon – need backup');
        setMapCenter(`${latitude},${longitude}`);
        setBeaconLoading(false);
      },
      () => {
        setBeaconError('Could not get location. Enable location and try again.');
        setBeaconLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const showOnMap = (query: string) => setMapCenter(query);

  const handleRequestJoin = (id: string) => {
    setRequestSentIds((prev) => new Set(prev).add(id));
  };

  const openMessage = (id: string, name: string) => setMessageFor({ id, name });
  const closeMessage = () => {
    setMessageFor(null);
    setMessageText('');
  };
  const sendMessage = () => {
    // Mock send
    closeMessage();
  };

  return (
    <div className="font-mono text-zinc-100 min-h-[70vh] flex flex-col">
      <header className="flex-shrink-0 flex items-center justify-between gap-4 p-4 border-b border-zinc-800 bg-zinc-950/80">
        <button
          onClick={onReturn}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-lg font-black uppercase tracking-tight truncate">Field Missions</h1>
        <div className="w-20" />
      </header>

      {/* Beacon button – publishes location to group */}
      <div className="flex-shrink-0 p-4 border-b border-zinc-800 bg-zinc-900/50">
        <button
          type="button"
          onClick={handleBeacon}
          disabled={beaconLoading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-black uppercase tracking-wider border-2 border-emerald-400/50 shadow-lg transition-all"
        >
          {beaconLoading ? (
            <Loader className="w-6 h-6 animate-spin" />
          ) : (
            <Broadcast className="w-6 h-6" />
          )}
          <span>{beaconLoading ? 'Getting location…' : 'Send beacon – share location with group'}</span>
        </button>
        {beaconError && (
          <p className="mt-2 text-rose-500 text-xs font-bold uppercase">{beaconError}</p>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-shrink-0 w-full aspect-video min-h-[200px] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
            <Loader className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        )}
        <iframe
          src={mapUrl}
          className="w-full h-full border-0"
          style={{ opacity: mapLoaded ? 1 : 0 }}
          title="Field missions map"
          onLoad={() => setMapLoaded(true)}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* List: missions + help requests + beacons */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Missions & help requests</h2>
        <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-[10px] uppercase text-cyan-300 font-bold tracking-wide">
          Mission Engine 2.0 active: Tiered campaigns, time-bound investigations, reward pools, team ops, and sponsor-funded missions.
        </div>

        {campaignMissions.map((m) => {
          const fundedPct = Math.min(100, Math.round((m.rewardPool.funded / m.rewardPool.target) * 100));
          const hoursLeft = Math.max(0, Math.ceil((new Date(m.deadlineIso).getTime() - Date.now()) / (1000 * 60 * 60)));
          const tierColor = m.tier === 'Global' ? 'text-rose-400' : m.tier === 'National' ? 'text-amber-400' : 'text-emerald-400';

          return (
            <div
              key={m.id}
              className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`text-[9px] font-black uppercase ${tierColor}`}>Mission 2.0 · {m.tier}</span>
                  <h3 className="text-sm font-black text-white uppercase truncate">{m.title}</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{m.location}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => showOnMap(m.location || DEFAULT_CENTER)}
                    className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                    aria-label="Show on map"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestJoin(`mission-${m.id}`)}
                    disabled={requestSentIds.has(`mission-${m.id}`)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
                  >
                    {requestSentIds.has(`mission-${m.id}`) ? 'Joined campaign' : 'Join campaign'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] uppercase">
                <div className="bg-black/40 border border-zinc-800 rounded-lg p-2 flex items-center gap-2"><Clock className="w-3 h-3 text-amber-400" />{hoursLeft}h left</div>
                <div className="bg-black/40 border border-zinc-800 rounded-lg p-2 flex items-center gap-2"><Coins className="w-3 h-3 text-emerald-400" />{m.rewardPool.funded}/{m.rewardPool.target} {m.rewardPool.currency}</div>
                <div className="bg-black/40 border border-zinc-800 rounded-lg p-2 flex items-center gap-2"><Target className="w-3 h-3 text-cyan-400" />Team mission</div>
                <div className="bg-black/40 border border-zinc-800 rounded-lg p-2 flex items-center gap-2"><Scale className="w-3 h-3 text-purple-400" />{m.sponsor}</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 uppercase font-bold">
                  <span>Reward Pool Funding</span>
                  <span>{fundedPct}%</span>
                </div>
                <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-emerald-500" style={{ width: `${fundedPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}

        {MOCK_HELP_REQUESTS.map((hr) => (
          <div
            key={hr.id}
            className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-amber-500">Help request</span>
                <h3 className="text-sm font-black text-white uppercase truncate">{hr.title}</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">{hr.name} · {hr.locationLabel}</p>
                <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{hr.description}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => showOnMap(`${hr.lat},${hr.lng}`)}
                  className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                  aria-label="Show on map"
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openMessage(hr.id, hr.name)}
                  className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                  aria-label="Message"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestJoin(hr.id)}
                  disabled={requestSentIds.has(hr.id)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
                >
                  {requestSentIds.has(hr.id) ? 'Request sent' : 'Request to join'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {beacons.map((b) => (
          <div
            key={b.id}
            className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-emerald-500">
                  {b.isOwn ? 'Your beacon' : 'Beacon'}
                </span>
                <h3 className="text-sm font-black text-white uppercase truncate">{b.label || 'Location shared with group'}</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</p>
              </div>
              <button
                type="button"
                onClick={() => showOnMap(`${b.latitude},${b.longitude}`)}
                className="p-2 rounded-lg border border-emerald-700/50 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                aria-label="Show on map"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Message modal */}
      {messageFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-sm font-black uppercase text-white">Message {messageFor.name}</h3>
              <button
                type="button"
                onClick={closeMessage}
                className="p-2 rounded-lg text-zinc-500 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message…"
                className="w-full h-24 px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm placeholder:text-zinc-600 resize-none"
                rows={4}
              />
              <button
                type="button"
                onClick={sendMessage}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldMissionsView;
