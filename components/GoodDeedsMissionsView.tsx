import React, { useMemo, useState } from 'react';
import { ArrowLeft, Coins, Heart, MapPin, Clock, Upload, CheckCircle, User, List, Map, Search, Filter } from './icons';

type MissionState = 'live' | 'upcoming' | 'full' | 'verified' | 'pending_parent';
type MissionType = 'family' | 'beginner' | 'teaching_demo' | 'reward';

interface KindnessMission {
  id: string;
  title: string;
  learn: string;
  type: MissionType;
  time: string;
  distance: string;
  ageRange: string;
  parentRequired: boolean;
  parentMustAttend: boolean;
  coins: number;
  spotsLeft: number;
  proofNeeded: string;
  state: MissionState;
  host: string;
  image: string;
}

interface GoodDeedsMissionsViewProps {
  onReturn: () => void;
}

const MISSIONS: KindnessMission[] = [
  {
    id: 'gd-1',
    title: 'Help at the Park Cleanup',
    learn: 'Respect public spaces and teamwork basics',
    type: 'family',
    time: 'Today 2:00 PM',
    distance: '0.8 mi',
    ageRange: '6-15',
    parentRequired: true,
    parentMustAttend: true,
    coins: 25,
    spotsLeft: 2,
    proofNeeded: 'Photo + organizer confirm',
    state: 'live',
    host: 'DPAL Family Hub',
    image: '/category-cards/good-deeds.png',
  },
  {
    id: 'gd-2',
    title: 'Hold the Door Open',
    learn: 'Courtesy, awareness, and social respect',
    type: 'beginner',
    time: 'Today 4:00 PM',
    distance: '1.1 mi',
    ageRange: '6-12',
    parentRequired: false,
    parentMustAttend: false,
    coins: 10,
    spotsLeft: 2,
    proofNeeded: 'Photo check-in',
    state: 'upcoming',
    host: 'Central Plaza Team',
    image: '/main-screen/my-reports.png',
  },
  {
    id: 'gd-3',
    title: 'Kind Notes for Seniors',
    learn: 'Empathy, communication, and gratitude',
    type: 'family',
    time: 'Tomorrow 10:00 AM',
    distance: '2.0 mi',
    ageRange: '8-16',
    parentRequired: true,
    parentMustAttend: false,
    coins: 30,
    spotsLeft: 4,
    proofNeeded: 'Photo + note upload',
    state: 'pending_parent',
    host: 'Neighborhood Care Circle',
    image: '/main-screen/asset-archive.png',
  },
  {
    id: 'gd-4',
    title: 'Return Dropped Items',
    learn: 'Integrity and situational responsibility',
    type: 'reward',
    time: 'Saturday 9:00 AM',
    distance: '1.6 mi',
    ageRange: '7-15',
    parentRequired: false,
    parentMustAttend: false,
    coins: 20,
    spotsLeft: 0,
    proofNeeded: 'Check-in + witness',
    state: 'full',
    host: 'Civic Mentor Unit',
    image: '/main-screen/file-a-report.png',
  },
];

const GoodDeedsMissionsView: React.FC<GoodDeedsMissionsViewProps> = ({ onReturn }) => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'missions' | 'myTasks' | 'record' | 'rewards' | 'profile'>('missions');
  const [mapMode, setMapMode] = useState<'map' | 'list'>('map');
  const [filter, setFilter] = useState<'all' | 'family' | 'beginner' | 'live'>('all');
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MISSIONS.filter((m) => {
      const filterOk =
        filter === 'all' ||
        (filter === 'family' && m.type === 'family') ||
        (filter === 'beginner' && m.type === 'beginner') ||
        (filter === 'live' && m.state === 'live');
      const queryOk = !q || m.title.toLowerCase().includes(q) || m.learn.toLowerCase().includes(q);
      return filterOk && queryOk;
    });
  }, [query, filter]);

  const stateLabel = (state: MissionState): string => {
    if (state === 'live') return 'Live Now';
    if (state === 'upcoming') return 'Upcoming';
    if (state === 'full') return 'Full';
    if (state === 'verified') return 'Verified Complete';
    return 'Parent Approval Pending';
  };

  const statePill = (state: MissionState): string => {
    if (state === 'live') return 'bg-emerald-600/20 border-emerald-400/50 text-emerald-300';
    if (state === 'upcoming') return 'bg-sky-600/20 border-sky-400/50 text-sky-300';
    if (state === 'full') return 'bg-zinc-700/30 border-zinc-500/50 text-zinc-300';
    if (state === 'verified') return 'bg-green-600/20 border-green-400/50 text-green-300';
    return 'bg-amber-600/20 border-amber-400/50 text-amber-300';
  };

  return (
    <div className="max-w-6xl mx-auto font-mono text-zinc-100 pb-24 animate-fade-in">
      <header className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onReturn}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.25em] text-sky-300">DPAL</div>
            <h1 className="text-lg md:text-2xl font-black tracking-tight">Kindness Missions</h1>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find & join good deed missions near you"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-sky-400"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
            <Coins className="w-4 h-4" />
            <span className="text-sm font-black">245</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'family', label: 'Family Safe' },
            { id: 'beginner', label: 'Beginner' },
            { id: 'live', label: 'Live Now' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as typeof filter)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider ${filter === f.id ? 'bg-sky-600 text-white border-sky-400/70' : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Map View</div>
            <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
              <button onClick={() => setMapMode('map')} className={`px-3 py-1.5 text-xs font-black uppercase ${mapMode === 'map' ? 'bg-sky-600 text-white' : 'bg-zinc-900 text-zinc-300'}`}><Map className="w-3.5 h-3.5 inline-block mr-1" />Map</button>
              <button onClick={() => setMapMode('list')} className={`px-3 py-1.5 text-xs font-black uppercase ${mapMode === 'list' ? 'bg-sky-600 text-white' : 'bg-zinc-900 text-zinc-300'}`}><List className="w-3.5 h-3.5 inline-block mr-1" />List</button>
            </div>
          </div>
          <div className="p-4">
            {mapMode === 'map' ? (
              <div className="relative h-56 rounded-2xl overflow-hidden border border-zinc-700">
                <img src="/category-cards/good-deeds.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
                <span className="absolute top-4 left-4 px-2 py-1 rounded-md text-[10px] font-black uppercase border border-emerald-400/60 bg-emerald-600/20 text-emerald-200">Live map preview</span>
                <span className="absolute top-16 left-12 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
                <span className="absolute top-24 right-20 w-4 h-4 rounded-full bg-sky-400 border-2 border-white" />
                <span className="absolute bottom-14 left-1/2 w-4 h-4 rounded-full bg-amber-400 border-2 border-white" />
                <span className="absolute bottom-6 right-5 text-[10px] uppercase tracking-wider text-zinc-300">Green: Active | Blue: Lesson | Gold: Reward</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {visible.map((m) => (
                  <div key={m.id} className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black">{m.title}</p>
                      <p className="text-xs text-zinc-400">{m.time} • {m.distance}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] border ${statePill(m.state)}`}>{stateLabel(m.state)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Featured Mission</div>
          <div className="mt-2 rounded-2xl overflow-hidden border border-zinc-700">
            <img src={MISSIONS[0].image} alt="" className="w-full h-40 object-cover" />
          </div>
          <h3 className="mt-3 text-lg font-black">{MISSIONS[0].title}</h3>
          <p className="text-sm text-zinc-300">{MISSIONS[0].learn}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2"><Clock className="w-3.5 h-3.5 inline mr-1 text-sky-300" /> {MISSIONS[0].time}</div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2"><Coins className="w-3.5 h-3.5 inline mr-1 text-amber-300" /> {MISSIONS[0].coins} DPAL</div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2"><User className="w-3.5 h-3.5 inline mr-1 text-emerald-300" /> Parent required</div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2"><Upload className="w-3.5 h-3.5 inline mr-1 text-coral-300" /> Proof needed</div>
          </div>
          <button
            type="button"
            onClick={() => setJoined((prev) => ({ ...prev, [MISSIONS[0].id]: true }))}
            className="mt-4 w-full rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black uppercase tracking-wider py-3 transition-colors"
          >
            {joined[MISSIONS[0].id] ? 'Joined Mission' : 'Join Mission'}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-300">Missions Near You</h2>
          <button className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-cyan-300"><Filter className="w-3.5 h-3.5" />Refine</button>
        </div>
        <div className="mt-3 grid gap-3">
          {visible.map((m) => (
            <article key={m.id} className="rounded-2xl border border-zinc-700 bg-zinc-950/70 p-3 md:p-4">
              <div className="grid gap-3 md:grid-cols-[140px_1fr_auto] items-start">
                <img src={m.image} alt="" className="w-full h-24 rounded-xl object-cover border border-zinc-700" />
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] border font-black uppercase ${statePill(m.state)}`}>{stateLabel(m.state)}</span>
                    <span className="px-2 py-1 rounded-md text-[10px] border border-sky-400/50 bg-sky-600/10 text-sky-200 uppercase">{m.type}</span>
                  </div>
                  <h3 className="text-base font-black">{m.title}</h3>
                  <p className="text-xs text-zinc-300">{m.learn}</p>
                  <div className="mt-2 text-[11px] text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span><Clock className="w-3.5 h-3.5 inline mr-1" />{m.time}</span>
                    <span><MapPin className="w-3.5 h-3.5 inline mr-1" />{m.distance}</span>
                    <span>Age {m.ageRange}</span>
                    <span>{m.spotsLeft} spots left</span>
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-400">
                    {m.parentRequired ? 'Parent permission required' : 'No parent permission required'}
                    {' • '}
                    {m.parentMustAttend ? 'Parent must attend' : 'Parent optional'}
                    {' • '}
                    {m.proofNeeded}
                  </div>
                </div>
                <div className="w-full md:w-40 space-y-2">
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm font-black text-amber-200 text-center">
                    <Coins className="w-4 h-4 inline mr-1" />
                    {m.coins} coins
                  </div>
                  <button
                    type="button"
                    disabled={m.state === 'full'}
                    onClick={() => setJoined((prev) => ({ ...prev, [m.id]: true }))}
                    className="w-full rounded-lg bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-black uppercase tracking-wider py-2"
                  >
                    {m.state === 'full' ? 'Mission Full' : joined[m.id] ? 'Joined' : 'Join Mission'}
                  </button>
                  <button className="w-full rounded-lg border border-zinc-600 hover:border-emerald-400 text-zinc-300 hover:text-emerald-300 text-xs font-black uppercase tracking-wider py-2">
                    <Upload className="w-3.5 h-3.5 inline mr-1" />
                    Upload Proof
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto grid grid-cols-5">
          {[
            { id: 'missions', label: 'Missions', icon: Heart },
            { id: 'myTasks', label: 'My Tasks', icon: List },
            { id: 'record', label: 'Record', icon: Upload },
            { id: 'rewards', label: 'Rewards', icon: Coins },
            { id: 'profile', label: 'Profile', icon: User },
          ].map((item) => {
            const ActiveIcon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as typeof tab)}
                className={`py-3 text-center text-[10px] font-black uppercase tracking-wider ${active ? 'text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <ActiveIcon className="w-4 h-4 mx-auto mb-1" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.35s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default GoodDeedsMissionsView;
