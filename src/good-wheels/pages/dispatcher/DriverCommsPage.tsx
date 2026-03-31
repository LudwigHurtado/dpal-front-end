import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';

/* ─── Palette ───────────────────────────────────────────────────────────── */
const C = {
  bg:         '#070D1A',
  surface:    '#0D1526',
  card:       '#111B2E',
  cardHov:    '#162035',
  border:     'rgba(255,255,255,0.07)',
  borderHov:  'rgba(0,198,255,0.25)',
  primary:    '#0077C8',
  accent:     '#00C6FF',
  accentGlow: 'rgba(0,198,255,0.18)',
  green:      '#22C55E',
  amber:      '#F59E0B',
  purple:     '#8B5CF6',
  red:        '#EF4444',
  orange:     '#F97316',
  text:       '#F1F5F9',
  muted:      '#64748B',
  mutedLight: '#94A3B8',
  white:      '#FFFFFF',
};

/* ─── Mock data ─────────────────────────────────────────────────────────── */
type DriverStatus = 'available' | 'on_trip' | 'mission' | 'offline' | 'returning';

interface MockDriver {
  id: string;
  name: string;
  avatar: string;   // emoji initials
  status: DriverStatus;
  lastMsg: string;
  time: string;
  unread: number;
  vehicle: string;
  zone: string;
}

const MOCK_DRIVERS: MockDriver[] = [
  { id: 'd1', name: 'Carlos M.',    avatar: 'CM', status: 'available',  lastMsg: 'Ready for next assignment',         time: '2m',  unread: 0, vehicle: 'Toyota Camry', zone: 'Downtown' },
  { id: 'd2', name: 'Rosa L.',      avatar: 'RL', status: 'on_trip',    lastMsg: 'ETA 6 min to dropoff',              time: '5m',  unread: 2, vehicle: 'Honda Civic',  zone: 'Midtown' },
  { id: 'd3', name: 'James K.',     avatar: 'JK', status: 'mission',    lastMsg: 'Picked up senior, heading to clinic', time: '8m',  unread: 0, vehicle: 'Ford Transit', zone: 'Westside' },
  { id: 'd4', name: 'Amara N.',     avatar: 'AN', status: 'available',  lastMsg: 'Can do charity ride request',        time: '12m', unread: 1, vehicle: 'Kia Sorento',  zone: 'Eastside' },
  { id: 'd5', name: 'Miguel R.',    avatar: 'MR', status: 'returning',  lastMsg: 'Completed trip, back in 4 min',     time: '15m', unread: 0, vehicle: 'Chevy Bolt',   zone: 'Harbor' },
  { id: 'd6', name: 'Lin T.',       avatar: 'LT', status: 'offline',    lastMsg: 'Going offline for the day',          time: '1h',  unread: 0, vehicle: 'Tesla M3',     zone: '—' },
  { id: 'd7', name: 'Samuel O.',    avatar: 'SO', status: 'available',  lastMsg: 'All good here, any requests?',       time: '2h',  unread: 0, vehicle: 'VW Passat',    zone: 'Uptown' },
];

interface ChatMessage {
  id: string;
  from: 'dispatch' | 'driver';
  text: string;
  time: string;
  read: boolean;
}

const MOCK_THREADS: Record<string, ChatMessage[]> = {
  d1: [
    { id: 'm1', from: 'dispatch', text: 'Carlos, we have a ride request at 5th & Main. Can you take it?', time: '09:41', read: true },
    { id: 'm2', from: 'driver',   text: 'Yes, heading there now. ETA 3 min.', time: '09:42', read: true },
    { id: 'm3', from: 'dispatch', text: 'Perfect. Passenger needs wheelchair assistance.', time: '09:42', read: true },
    { id: 'm4', from: 'driver',   text: 'Ready for next assignment', time: '10:05', read: true },
  ],
  d2: [
    { id: 'm1', from: 'dispatch', text: 'Rosa, can you confirm pickup at Hope Shelter?', time: '09:58', read: true },
    { id: 'm2', from: 'driver',   text: 'On my way. Traffic is slow on 3rd Ave.', time: '10:00', read: true },
    { id: 'm3', from: 'driver',   text: 'ETA 6 min to dropoff', time: '10:10', read: false },
    { id: 'm4', from: 'driver',   text: 'Almost there', time: '10:12', read: false },
  ],
  d3: [
    { id: 'm1', from: 'dispatch', text: 'James, mission briefing: elder transport to Central Clinic.', time: '09:30', read: true },
    { id: 'm2', from: 'driver',   text: 'Acknowledged. En route to pickup.', time: '09:31', read: true },
    { id: 'm3', from: 'driver',   text: 'Picked up senior, heading to clinic', time: '09:55', read: true },
  ],
  d4: [
    { id: 'm1', from: 'driver',   text: 'Can do charity ride request', time: '10:02', read: false },
  ],
};

type BroadcastType = 'nearby' | 'all' | 'mission' | 'emergency' | 'community' | 'surge' | 'charity' | 'hazard';
interface BroadcastTemplate { id: BroadcastType; label: string; icon: string; color: string; bg: string }

const BROADCAST_TYPES: BroadcastTemplate[] = [
  { id: 'nearby',    label: 'Nearby Drivers',     icon: '📍', color: C.accent,  bg: C.accentGlow },
  { id: 'all',       label: 'All Active',          icon: '📡', color: C.green,   bg: 'rgba(34,197,94,0.12)' },
  { id: 'mission',   label: 'Mission Drivers',     icon: '🎯', color: C.purple,  bg: 'rgba(139,92,246,0.12)' },
  { id: 'emergency', label: 'Emergency Alert',     icon: '🚨', color: C.red,     bg: 'rgba(239,68,68,0.12)' },
  { id: 'community', label: 'Community Need',      icon: '🤝', color: C.amber,   bg: 'rgba(245,158,11,0.12)' },
  { id: 'surge',     label: 'High Demand Zone',    icon: '⚡', color: '#FCD34D', bg: 'rgba(252,211,77,0.1)' },
  { id: 'charity',   label: 'Charity Transport',   icon: '💚', color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
  { id: 'hazard',    label: 'Road Hazard Alert',   icon: '⚠️', color: C.orange,  bg: 'rgba(249,115,22,0.12)' },
];

const QUICK_MESSAGES = [
  'Ride request in downtown zone',
  'Volunteer driver needed for elder assistance',
  'Urgent charity transport — animal shelter',
  'Surge demand — city center (3x fares)',
  'Safety alert: road closure on Route 9',
  'Mission briefing: community food drive transport',
  'Hospital pickup needed — Priority',
];

type FilterTab = 'all' | 'nearby' | 'on_duty' | 'mission' | 'charity';
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',     label: 'All Drivers' },
  { id: 'nearby',  label: 'Nearby' },
  { id: 'on_duty', label: 'On Duty' },
  { id: 'mission', label: 'Mission' },
  { id: 'charity', label: 'Charity' },
];

/* ─── Status helpers ─────────────────────────────────────────────────────── */
function statusColor(s: DriverStatus) {
  if (s === 'available')  return C.green;
  if (s === 'on_trip')    return C.amber;
  if (s === 'mission')    return C.purple;
  if (s === 'returning')  return C.accent;
  return C.muted;
}
function statusLabel(s: DriverStatus) {
  if (s === 'available')  return 'Available';
  if (s === 'on_trip')    return 'On Trip';
  if (s === 'mission')    return 'Mission';
  if (s === 'returning')  return 'Returning';
  return 'Offline';
}

/* ─── Tiny SVG map ───────────────────────────────────────────────────────── */
function MiniMap() {
  return (
    <svg viewBox="0 0 300 160" style={{ width: '100%', height: 160 }} xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="300" height="160" fill="#070D1A" rx="12" />
      {/* Road grid */}
      {[40, 80, 120, 160, 200, 240].map(x => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="160" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {[32, 64, 96, 128].map(y => (
        <line key={`h${y}`} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Main roads */}
      <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      <line x1="150" y1="0" x2="150" y2="160" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      <line x1="0" y1="40" x2="100" y2="80" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <line x1="200" y1="80" x2="300" y2="120" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      {/* Heat zone */}
      <ellipse cx="150" cy="80" rx="55" ry="35" fill="rgba(245,158,11,0.08)" />
      <ellipse cx="150" cy="80" rx="30" ry="18" fill="rgba(245,158,11,0.14)" />
      {/* Driver dots */}
      {[
        { cx: 80,  cy: 60,  c: C.green,  pulse: true  },
        { cx: 175, cy: 90,  c: C.amber,  pulse: false },
        { cx: 220, cy: 55,  c: C.purple, pulse: false },
        { cx: 60,  cy: 110, c: C.green,  pulse: true  },
        { cx: 240, cy: 110, c: C.accent, pulse: true  },
        { cx: 130, cy: 40,  c: C.green,  pulse: true  },
        { cx: 185, cy: 130, c: C.muted,  pulse: false },
      ].map((d, i) => (
        <g key={i}>
          {d.pulse && <circle cx={d.cx} cy={d.cy} r="10" fill={d.c} opacity="0.15" />}
          <circle cx={d.cx} cy={d.cy} r="5" fill={d.c} />
          <circle cx={d.cx} cy={d.cy} r="3" fill="white" opacity="0.6" />
        </g>
      ))}
      {/* Zone label */}
      <rect x="112" y="67" width="76" height="18" rx="4" fill="rgba(245,158,11,0.2)" />
      <text x="150" y="80" textAnchor="middle" fill="#F59E0B" fontSize="9" fontWeight="bold" fontFamily="sans-serif">SURGE ZONE</text>
      {/* Legend */}
      <circle cx="16" cy="148" r="4" fill={C.green} />
      <text x="24" y="151" fill={C.mutedLight} fontSize="8" fontFamily="sans-serif">Available</text>
      <circle cx="76" cy="148" r="4" fill={C.amber} />
      <text x="84" y="151" fill={C.mutedLight} fontSize="8" fontFamily="sans-serif">On Trip</text>
      <circle cx="126" cy="148" r="4" fill={C.purple} />
      <text x="134" y="151" fill={C.mutedLight} fontSize="8" fontFamily="sans-serif">Mission</text>
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function DriverCommsPage() {
  const navigate = useNavigate();
  const [panel, setPanel]               = useState<'chat' | 'broadcast'>('chat');
  const [filterTab, setFilterTab]       = useState<FilterTab>('all');
  const [searchQ, setSearchQ]           = useState('');
  const [activeDriverId, setActiveDriverId] = useState<string>('d1');
  const [msgInput, setMsgInput]         = useState('');
  const [threads, setThreads]           = useState(MOCK_THREADS);
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('nearby');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sending, setSending]           = useState(false);
  const [sentBanner, setSentBanner]     = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeDriverId, threads]);

  const activeDriver = MOCK_DRIVERS.find(d => d.id === activeDriverId)!;
  const thread = threads[activeDriverId] ?? [];

  const filteredDrivers = MOCK_DRIVERS.filter(d => {
    if (searchQ && !d.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filterTab === 'on_duty')  return d.status === 'on_trip' || d.status === 'returning';
    if (filterTab === 'mission')  return d.status === 'mission';
    if (filterTab === 'nearby')   return d.status !== 'offline';
    if (filterTab === 'charity')  return d.id === 'd3' || d.id === 'd4';
    return true;
  });

  function sendMessage() {
    if (!msgInput.trim()) return;
    const msg: ChatMessage = { id: `m${Date.now()}`, from: 'dispatch', text: msgInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false };
    setThreads(t => ({ ...t, [activeDriverId]: [...(t[activeDriverId] ?? []), msg] }));
    setMsgInput('');
  }

  function sendBroadcast() {
    if (!broadcastMsg.trim()) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSentBanner(true);
      setBroadcastMsg('');
      setTimeout(() => setSentBanner(false), 4000);
    }, 1800);
  }

  const activeBroadcast = BROADCAST_TYPES.find(b => b.id === broadcastType)!;
  const totalActive = MOCK_DRIVERS.filter(d => d.status !== 'offline').length;

  /* ── shared styles ── */
  const pill = (bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 100, background: bg, color,
    fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em',
    padding: '3px 8px', whiteSpace: 'nowrap', ...extra,
  });

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(GW_PATHS.driver.dashboard)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke={C.mutedLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
            <span style={{ fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>Driver Comms</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: C.accentGlow, border: `1px solid rgba(0,198,255,0.2)`, borderRadius: 6, padding: '2px 7px' }}>LIVE</span>
          </div>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{totalActive} active · Good Wheels Dispatch</p>
        </div>
        <button style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mutedLight} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>
        <div style={{ position: 'relative' }}>
          <button style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mutedLight} strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <span style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, background: C.red, borderRadius: '50%', fontSize: 8, fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.surface}` }}>3</span>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white', flexShrink: 0 }}>D</div>
      </div>

      {/* ── PANEL TOGGLE ── */}
      <div style={{ padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 3, gap: 3 }}>
          {(['chat', 'broadcast'] as const).map(p => (
            <button key={p} onClick={() => setPanel(p)} style={{ flex: 1, height: 36, borderRadius: 10, border: 'none', background: panel === p ? `linear-gradient(135deg, ${C.primary}, ${C.accent})` : 'transparent', color: panel === p ? 'white' : C.muted, fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {p === 'chat' ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Chat with Drivers</>
                           : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Broadcast</>}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════
          CHAT PANEL
      ══════════════════════════════════ */}
      {panel === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Filter tabs */}
          <div style={{ padding: '8px 16px', overflowX: 'auto', display: 'flex', gap: 6, scrollbarWidth: 'none' }}>
            {FILTER_TABS.map(t => (
              <button key={t.id} onClick={() => setFilterTab(t.id)} style={{ flexShrink: 0, height: 30, borderRadius: 8, border: `1px solid ${filterTab === t.id ? C.accent : C.border}`, background: filterTab === t.id ? C.accentGlow : 'transparent', color: filterTab === t.id ? C.accent : C.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '0 12px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ padding: '0 16px 8px' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search drivers…" style={{ width: '100%', height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, paddingLeft: 30, paddingRight: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Driver list (scrollable) */}
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4, scrollbarWidth: 'thin' }}>
              {filteredDrivers.map(d => {
                const isActive = d.id === activeDriverId;
                const threadMsgs = threads[d.id] ?? [];
                const unreadCount = threadMsgs.filter(m => m.from === 'driver' && !m.read).length;
                return (
                  <button key={d.id} onClick={() => setActiveDriverId(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1px solid ${isActive ? C.accent : 'transparent'}`, background: isActive ? C.accentGlow : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${statusColor(d.status)}33, ${statusColor(d.status)}66)`, border: `2px solid ${statusColor(d.status)}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: statusColor(d.status) }}>{d.avatar}</div>
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: statusColor(d.status), border: `2px solid ${C.bg}` }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? C.accent : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: C.muted }}>{d.time}</span>
                          {unreadCount > 0 && <span style={{ width: 18, height: 18, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#000' }}>{unreadCount}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={pill(statusColor(d.status) + '22', statusColor(d.status))}>{statusLabel(d.status)}</span>
                        <span style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.lastMsg}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Chat thread */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '8px 16px 0', borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden', minHeight: 220 }}>
              {/* Thread header */}
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${statusColor(activeDriver.status)}22`, border: `2px solid ${statusColor(activeDriver.status)}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: statusColor(activeDriver.status) }}>{activeDriver.avatar}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>{activeDriver.name}</p>
                  <p style={{ margin: 0, fontSize: 10, color: statusColor(activeDriver.status) }}>{statusLabel(activeDriver.status)} · {activeDriver.zone} · {activeDriver.vehicle}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['📞', '📎'].map(icon => (
                    <button key={icon} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'thin', minHeight: 0 }}>
                {thread.length === 0
                  ? <p style={{ textAlign: 'center', color: C.muted, fontSize: 12, margin: 'auto 0' }}>No messages yet. Start the conversation.</p>
                  : thread.map(msg => {
                    const isDispatch = msg.from === 'dispatch';
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isDispatch ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '78%' }}>
                          <div style={{ padding: '8px 12px', borderRadius: isDispatch ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isDispatch ? `linear-gradient(135deg, ${C.primary}, ${C.accent})` : 'rgba(255,255,255,0.08)', fontSize: 12, color: isDispatch ? 'white' : C.text, lineHeight: 1.45 }}>{msg.text}</div>
                          <p style={{ margin: '3px 4px 0', fontSize: 9, color: C.muted, textAlign: isDispatch ? 'right' : 'left' }}>
                            {msg.time} {isDispatch && (msg.read ? '✓✓' : '✓')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                <div ref={threadEndRef} />
              </div>

              {/* Composer */}
              <div style={{ padding: '8px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
                <button style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎙</button>
                <input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message ${activeDriver.name}…`}
                  style={{ flex: 1, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.text, fontSize: 12, padding: '0 12px', outline: 'none' }}
                />
                <button onClick={sendMessage} style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Start new chat CTA */}
          <div style={{ padding: '10px 16px 16px' }}>
            <button style={{ width: '100%', height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px dashed rgba(0,198,255,0.3)`, color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Start New Driver Chat
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          BROADCAST PANEL
      ══════════════════════════════════ */}
      {panel === 'broadcast' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Sent banner */}
          {sentBanner && (
            <div style={{ margin: '10px 16px 0', padding: '10px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.12)', border: `1px solid rgba(34,197,94,0.25)`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📡</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.green }}>Broadcast Sent!</p>
                <p style={{ margin: 0, fontSize: 11, color: C.mutedLight }}>{totalActive} active drivers notified · Awaiting acknowledgement</p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ padding: '12px 16px 8px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Active Drivers', value: totalActive, color: C.green },
              { label: 'On Mission',     value: 1,           color: C.purple },
              { label: 'Nearby (<2mi)',  value: 4,           color: C.accent },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</p>
                <p style={{ margin: '2px 0 0', fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Mini map */}
          <div style={{ margin: '0 16px', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Live Driver Map</span>
              <span style={{ fontSize: 10, color: C.amber, fontWeight: 700 }}>⚡ Surge Zone Active</span>
            </div>
            <MiniMap />
          </div>

          {/* Broadcast type grid */}
          <div style={{ padding: '14px 16px 8px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Broadcast Target</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
              {BROADCAST_TYPES.map(bt => {
                const sel = broadcastType === bt.id;
                return (
                  <button key={bt.id} onClick={() => setBroadcastType(bt.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: `1px solid ${sel ? bt.color + '55' : C.border}`, background: sel ? bt.bg : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{bt.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sel ? bt.color : C.mutedLight, lineHeight: 1.3 }}>{bt.label}</span>
                    {sel && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: bt.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick messages */}
          <div style={{ padding: '0 16px 8px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: C.mutedLight, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Quick Messages</p>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
              {QUICK_MESSAGES.map(qm => (
                <button key={qm} onClick={() => setBroadcastMsg(qm)} style={{ flexShrink: 0, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: broadcastMsg === qm ? C.accentGlow : 'rgba(255,255,255,0.03)', color: broadcastMsg === qm ? C.accent : C.muted, fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: '0 10px', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                  {qm}
                </button>
              ))}
            </div>
          </div>

          {/* Message composer */}
          <div style={{ margin: '0 16px', background: C.card, border: `1px solid ${activeBroadcast.color}33`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: activeBroadcast.bg }}>
              <span style={{ fontSize: 18 }}>{activeBroadcast.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: activeBroadcast.color }}>{activeBroadcast.label}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.muted }}>Message will reach {broadcastType === 'all' ? totalActive : broadcastType === 'mission' ? 1 : 4} drivers</p>
              </div>
            </div>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              placeholder="Type your broadcast message…"
              rows={3}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 13, lineHeight: 1.55, padding: '12px 14px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ padding: '0 12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: C.muted }}>{broadcastMsg.length}/280</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['📸', '📍'].map(icon => (
                  <button key={icon} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Send buttons */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={sendBroadcast} disabled={sending || !broadcastMsg.trim()} style={{ width: '100%', height: 50, borderRadius: 14, background: sending ? C.muted : `linear-gradient(135deg, ${activeBroadcast.color}, ${activeBroadcast.color}cc)`, border: 'none', color: 'white', fontSize: 14, fontWeight: 900, cursor: sending || !broadcastMsg.trim() ? 'not-allowed' : 'pointer', opacity: !broadcastMsg.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: broadcastMsg.trim() ? `0 4px 20px ${activeBroadcast.color}44` : 'none', transition: 'all 0.2s', letterSpacing: '0.02em' }}>
              {sending ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Sending…</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>Send {activeBroadcast.label}</>
              )}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Priority',  icon: '🚨', color: C.red    },
                { label: 'Schedule',  icon: '🕐', color: C.purple },
                { label: 'Mission',   icon: '🎯', color: C.amber  },
              ].map(btn => (
                <button key={btn.label} style={{ height: 40, borderRadius: 12, background: btn.color + '15', border: `1px solid ${btn.color}33`, color: btn.color, fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery receipts */}
          <div style={{ margin: '0 16px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Last Broadcast Receipt</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.text }}>Surge demand — city center</span>
              <span style={{ fontSize: 10, color: C.muted }}>10:04 AM</span>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ label: 'Sent', val: 6, color: C.mutedLight }, { label: 'Delivered', val: 6, color: C.accent }, { label: 'Acknowledged', val: 4, color: C.green }].map(r => (
                <div key={r.label} style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: r.color }}>{r.val}</p>
                  <p style={{ margin: 0, fontSize: 9, color: C.muted }}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * { -webkit-tap-highlight-color: transparent; }`}</style>
    </div>
  );
}
