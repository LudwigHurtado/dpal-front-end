import React, { useState, useRef } from 'react';
import {
  ShieldCheck, Search, AlertTriangle, Clock, CheckCircle, ChevronRight,
  Upload, Send, Phone, Mail, User, MapPin, Zap, Activity,
  RefreshCw, Eye, Camera, Loader, Hash, Shield, X, ChevronDown,
  Sparkles, Globe, Heart, Coins, Briefcase, Target, Database,
} from './icons';

/* ─── Types ─── */
type HelpTab = 'home' | 'tickets' | 'urgent' | 'support';

type TicketStatus = 'submitted' | 'in_review' | 'awaiting_evidence' | 'escalated' | 'resolved' | 'emergency';

interface SupportTicket {
  id: string;
  title: string;
  category: string;
  status: TicketStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created: string;
  lastUpdate: string;
  caseNumber: string;
}

interface HelpCategory {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  count?: number;
}

/* ─── Mock tickets ─── */
const MOCK_TICKETS: SupportTicket[] = [
  { id: 't1', caseNumber: 'DPAL-2024-0041', title: 'Unable to log in — account locked', category: 'Account Access', status: 'in_review', priority: 'high', created: '2 hours ago', lastUpdate: '35 min ago' },
  { id: 't2', caseNumber: 'DPAL-2024-0039', title: 'Trip payment not received by driver', category: 'Payment Issue', status: 'awaiting_evidence', priority: 'normal', created: '1 day ago', lastUpdate: '3 hours ago' },
  { id: 't3', caseNumber: 'DPAL-2024-0035', title: 'GPS map not working in Good Wheels', category: 'GPS / Map', status: 'resolved', priority: 'low', created: '3 days ago', lastUpdate: '1 day ago' },
  { id: 't4', caseNumber: 'DPAL-2024-0033', title: 'False report filed against my account', category: 'Appeals / Disputes', status: 'escalated', priority: 'urgent', created: '4 days ago', lastUpdate: '2 hours ago' },
];

/* ─── Help categories ─── */
const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'account', icon: <User className="w-5 h-5" />, title: 'Account Access', desc: 'Login, password recovery, locked accounts', accent: '#0077C8', count: 12 },
  { id: 'driver', icon: <Briefcase className="w-5 h-5" />, title: 'Driver Issues', desc: 'Trip problems, earnings, vehicle verification', accent: '#7C3AED', count: 8 },
  { id: 'passenger', icon: <Heart className="w-5 h-5" />, title: 'Passenger Help', desc: 'Ride issues, safety, booking problems', accent: '#0D3B66', count: 5 },
  { id: 'payment', icon: <Coins className="w-5 h-5" />, title: 'Payments & Donations', desc: 'Charge disputes, donation errors, refunds', accent: '#F4A300', count: 14 },
  { id: 'gps', icon: <MapPin className="w-5 h-5" />, title: 'GPS / Map Problems', desc: 'Location errors, route issues, map failures', accent: '#059669', count: 7 },
  { id: 'reports', icon: <Database className="w-5 h-5" />, title: 'Report Errors', desc: 'Incorrect filings, upload failures, lost data', accent: '#dc2626', count: 3 },
  { id: 'mission', icon: <Target className="w-5 h-5" />, title: 'Mission Support', desc: 'Mission status, rewards, task disputes', accent: '#0077C8', count: 6 },
  { id: 'appeals', icon: <Shield className="w-5 h-5" />, title: 'Appeals & Disputes', desc: 'Challenge decisions, moderation appeals', accent: '#7C3AED', count: 9 },
  { id: 'charity', icon: <Globe className="w-5 h-5" />, title: 'Charity Support', desc: 'Charity verification, donation issues', accent: '#2FB344', count: 2 },
  { id: 'verification', icon: <ShieldCheck className="w-5 h-5" />, title: 'Verification Issues', desc: 'ID verification, vehicle checks, trust score', accent: '#0D3B66', count: 4 },
  { id: 'technical', icon: <Zap className="w-5 h-5" />, title: 'Technical Bugs', desc: 'App crashes, sync errors, feature failures', accent: '#F4A300', count: 11 },
  { id: 'urgent', icon: <AlertTriangle className="w-5 h-5" />, title: 'Urgent Escalation', desc: 'Safety concerns, immediate action needed', accent: '#dc2626', count: 1 },
];

/* ─── Status config ─── */
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string; dot: string }> = {
  submitted:        { label: 'Submitted',         color: '#6B7280', bg: '#F9FAFB', dot: '#9CA3AF' },
  in_review:        { label: 'In Review',          color: '#0077C8', bg: '#EFF6FF', dot: '#0077C8' },
  awaiting_evidence:{ label: 'Awaiting Evidence',  color: '#F4A300', bg: '#FFFBEB', dot: '#F4A300' },
  escalated:        { label: 'Escalated',          color: '#dc2626', bg: '#FEF2F2', dot: '#dc2626' },
  resolved:         { label: 'Resolved',           color: '#2FB344', bg: '#F0FDF4', dot: '#2FB344' },
  emergency:        { label: 'Emergency Review',   color: '#dc2626', bg: '#FEF2F2', dot: '#dc2626' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#9CA3AF' },
  normal: { label: 'Normal', color: '#0077C8' },
  high:   { label: 'High',   color: '#F4A300' },
  urgent: { label: 'Urgent', color: '#dc2626' },
};

/* ─── Timeline steps ─── */
const TIMELINE_STEPS = [
  { key: 'submitted',  label: 'Issue Submitted',    icon: <Send className="w-4 h-4" /> },
  { key: 'review',     label: 'Under Review',        icon: <Eye className="w-4 h-4" /> },
  { key: 'assigned',   label: 'Reviewer Assigned',  icon: <User className="w-4 h-4" /> },
  { key: 'evidence',   label: 'Proof Received',      icon: <Upload className="w-4 h-4" /> },
  { key: 'decision',   label: 'Decision Made',       icon: <CheckCircle className="w-4 h-4" /> },
  { key: 'resolved',   label: 'Repaired / Resolved', icon: <ShieldCheck className="w-4 h-4" /> },
];

/* ─── AI suggestions ─── */
const AI_QUICK = [
  'My account is locked and I cannot log in',
  'My payment was charged but the trip failed',
  'I received a false report against me',
  'The GPS is not working on my device',
  'I need to appeal a moderation decision',
  'My charity donation did not process',
];

/* ═══════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════ */

const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  return (
    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
      {cfg.label}
    </span>
  );
};

const TicketCard: React.FC<{ ticket: SupportTicket; onClick: () => void }> = ({ ticket, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
  >
    <div className="flex items-start justify-between gap-3 mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{ticket.caseNumber}</p>
        <p className="text-sm font-bold text-gray-900 leading-snug">{ticket.title}</p>
      </div>
      <StatusBadge status={ticket.status} />
    </div>
    <div className="flex items-center justify-between mt-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-0.5 rounded-md">{ticket.category}</span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
        <Clock className="w-3 h-3" />
        {ticket.lastUpdate}
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors ml-1" />
      </div>
    </div>
  </button>
);

/* ═══════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════ */
interface HelpCenterViewProps {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
}

const HelpCenterView: React.FC<HelpCenterViewProps> = ({ onReturn }) => {
  const [activeTab, setActiveTab] = useState<HelpTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [aiInput, setAiInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = searchQuery.trim()
    ? HELP_CATEGORIES.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : HELP_CATEGORIES;

  const handleAiSubmit = () => {
    if (!aiInput.trim()) return;
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setAiInput('');
    }, 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadedFiles(prev => [...prev, ...files.map(f => f.name)]);
  };

  /* ─── Ticket Detail Modal ─── */
  if (selectedTicket) {
    const cfg = STATUS_CONFIG[selectedTicket.status];
    const activeStep = ['submitted', 'in_review', 'awaiting_evidence', 'escalated', 'resolved', 'emergency']
      .indexOf(selectedTicket.status);
    return (
      <div className="min-h-screen bg-[#F5F7FA] font-sans">
        {/* Header */}
        <header className="bg-[#0D3B66] text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-40 shadow-lg">
          <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">{selectedTicket.caseNumber}</p>
            <p className="text-sm font-bold truncate">{selectedTicket.title}</p>
          </div>
          <StatusBadge status={selectedTicket.status} />
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Status card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                <StatusBadge status={selectedTicket.status} />
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-semibold">Last updated</p>
                <p className="text-xs font-bold text-gray-700">{selectedTicket.lastUpdate}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 font-medium leading-relaxed" style={{ background: cfg.bg, color: cfg.color }}>
              {selectedTicket.status === 'in_review' && 'A DPAL reviewer has been assigned and is examining your case. You will be notified of any updates.'}
              {selectedTicket.status === 'awaiting_evidence' && 'We need additional documentation to continue processing your case. Please upload proof below.'}
              {selectedTicket.status === 'escalated' && 'Your case has been escalated to a senior reviewer. Expect a response within 24 hours.'}
              {selectedTicket.status === 'resolved' && 'Your case has been resolved. If you are not satisfied with the outcome, you may reopen the ticket.'}
              {selectedTicket.status === 'submitted' && 'Your case has been received and is in our queue for review.'}
              {selectedTicket.status === 'emergency' && 'This has been flagged as an emergency. Our safety team is being notified immediately.'}
            </div>
          </div>

          {/* Resolution timeline */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Resolution Timeline</p>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, idx) => {
                const done = idx <= Math.min(activeStep, 4);
                const active = idx === Math.min(activeStep, 4);
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                        style={{
                          background: done ? '#0077C8' : 'white',
                          borderColor: done ? '#0077C8' : '#E5E7EB',
                          color: done ? 'white' : '#9CA3AF',
                          boxShadow: active ? '0 0 0 3px rgba(0,119,200,0.18)' : 'none',
                        }}
                      >
                        {step.icon}
                      </div>
                      {idx < TIMELINE_STEPS.length - 1 && (
                        <div className="w-0.5 h-6 mt-0.5" style={{ background: done ? '#0077C8' : '#E5E7EB' }} />
                      )}
                    </div>
                    <div className="pb-4 flex-1 pt-0.5">
                      <p className="text-sm font-bold" style={{ color: done ? '#0D3B66' : '#9CA3AF' }}>{step.label}</p>
                      {active && <p className="text-[11px] text-[#0077C8] font-semibold mt-0.5">Currently here</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence upload */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Attach Evidence</p>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
            >
              <Upload className="w-6 h-6 text-gray-400" />
              <p className="text-sm font-bold text-gray-500">Upload screenshots, documents, or video</p>
              <p className="text-[11px] text-gray-400">Images · PDFs · Videos · Audio</p>
            </button>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <Camera className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-blue-700 truncate flex-1">{f}</span>
                    <button onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5 text-blue-400" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-[#0077C8] text-white rounded-xl py-3 font-bold text-sm hover:bg-[#005fa3] transition-colors">
              <Send className="w-4 h-4" /> Reply to Case
            </button>
            <button className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl py-3 font-bold text-sm hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-4 h-4" /> Escalate
            </button>
          </div>
          {selectedTicket.status === 'resolved' && (
            <button className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl py-3 font-bold text-sm hover:bg-gray-100 transition-colors">
              <RefreshCw className="w-4 h-4" /> Reopen Ticket
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Main layout ─── */
  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans flex flex-col">

      {/* ── Command Header ── */}
      <header
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0D3B66 0%, #0077C8 60%, #005fa3 100%)' }}
      >
        {/* subtle pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(0,0,0,0.12) 0%, transparent 50%)',
        }} />
        <div className="relative px-4 pt-4 pb-0">
          {/* top row */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onReturn}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-200 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Support Online</span>
            </div>
          </div>

          {/* brand */}
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2.5 bg-white/15 rounded-2xl border border-white/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">DPAL Help Center</h1>
              <p className="text-blue-200 text-[11px] font-bold mt-1 leading-snug">
                Fix problems · Get support · Restore access · Resolve issues
              </p>
            </div>
          </div>

          {/* search bar */}
          <div className="relative mb-0 pb-5">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-lg">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                className="flex-1 text-sm text-gray-800 font-semibold bg-transparent border-none outline-none placeholder-gray-400"
                placeholder="Describe your problem or search for help…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative flex border-t border-white/10">
          {[
            { label: 'Open Tickets', value: '3', icon: <Activity className="w-3.5 h-3.5" /> },
            { label: 'Avg Resolution', value: '4 hrs', icon: <Clock className="w-3.5 h-3.5" /> },
            { label: 'Cases Resolved', value: '1.2k', icon: <CheckCircle className="w-3.5 h-3.5" /> },
          ].map((s, i) => (
            <div key={i} className={`flex-1 flex flex-col items-center py-3 gap-0.5 ${i < 2 ? 'border-r border-white/10' : ''}`}>
              <div className="flex items-center gap-1 text-blue-200">{s.icon}<span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span></div>
              <span className="text-lg font-black text-white">{s.value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="flex">
          {([
            { id: 'home',    label: 'Help Home',  icon: <Shield className="w-4 h-4" /> },
            { id: 'tickets', label: 'My Tickets', icon: <Hash className="w-4 h-4" />, badge: MOCK_TICKETS.filter(t => t.status !== 'resolved').length },
            { id: 'urgent',  label: 'Urgent',     icon: <AlertTriangle className="w-4 h-4" /> },
            { id: 'support', label: 'AI & Human', icon: <Sparkles className="w-4 h-4" /> },
          ] as { id: HelpTab; label: string; icon: React.ReactNode; badge?: number }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-[10px] font-black uppercase tracking-wide transition-colors relative ${
                activeTab === tab.id ? 'text-[#0077C8]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              <span className="hidden xs:inline">{tab.label}</span>
              {tab.badge ? (
                <span className="absolute top-2 right-3 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">{tab.badge}</span>
              ) : null}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0077C8]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ══════════════════ HOME TAB ══════════════════ */}
        {activeTab === 'home' && (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

            {/* Quick action row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Report Problem', icon: <AlertTriangle className="w-5 h-5" />, color: '#dc2626', bg: '#FEF2F2', onClick: () => setActiveTab('urgent') },
                { label: 'Track Ticket',   icon: <Eye className="w-5 h-5" />,           color: '#0077C8', bg: '#EFF6FF', onClick: () => setActiveTab('tickets') },
                { label: 'AI Support',     icon: <Sparkles className="w-5 h-5" />,      color: '#7C3AED', bg: '#F5F3FF', onClick: () => setActiveTab('support') },
              ].map((q, i) => (
                <button key={i} onClick={q.onClick}
                  className="flex flex-col items-center gap-2 rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all bg-white"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: q.bg, color: q.color }}>
                    {q.icon}
                  </div>
                  <span className="text-[10px] font-black text-gray-700 text-center leading-tight">{q.label}</span>
                </button>
              ))}
            </div>

            {/* Urgent help banner */}
            <div
              className="rounded-2xl p-4 flex items-center gap-4 border-2 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', borderColor: '#b91c1c' }}
              onClick={() => setActiveTab('urgent')}
            >
              <div className="p-2.5 bg-white/15 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-sm">Urgent Help Needed?</p>
                <p className="text-red-200 text-[11px] font-semibold mt-0.5">Safety issues · Fraud · Emergency support → Tap here</p>
              </div>
              <ChevronRight className="w-5 h-5 text-red-200 flex-shrink-0" />
            </div>

            {/* Category cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {searchQuery ? `Results for "${searchQuery}"` : 'Help Categories'}
                </p>
                <span className="text-[10px] text-gray-400 font-semibold">{filteredCategories.length} topics</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                    className="text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat.accent}15`, color: cat.accent }}>
                        {cat.icon}
                      </div>
                      {cat.count && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${cat.accent}15`, color: cat.accent }}>
                          {cat.count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-gray-900 leading-snug mb-1">{cat.title}</p>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight">{cat.desc}</p>
                    {expandedCategory === cat.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <button className="w-full text-left text-[11px] font-bold py-2 px-3 rounded-lg hover:bg-gray-50 text-blue-700 flex items-center gap-1.5">
                          <Send className="w-3 h-3" /> Open a new ticket
                        </button>
                        <button onClick={() => setActiveTab('support')} className="w-full text-left text-[11px] font-bold py-2 px-3 rounded-lg hover:bg-gray-50 text-purple-700 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> Ask AI for help
                        </button>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence upload module */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Upload className="w-4 h-4 text-[#0077C8]" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Submit Evidence for Support</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Screenshots · Documents · Videos · ID docs</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              >
                <Camera className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-400">Tap to upload proof of your issue</span>
              </button>
              {uploadedFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-lg px-2.5 py-1.5 text-[11px] font-bold">
                      <Camera className="w-3 h-3" /> {f.length > 18 ? f.slice(0, 15) + '…' : f}
                      <button onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100" /></button>
                    </div>
                  ))}
                </div>
              )}
              {uploadedFiles.length > 0 && (
                <button className="mt-3 w-full bg-[#0077C8] text-white rounded-xl py-2.5 font-bold text-sm hover:bg-[#005fa3] transition-colors">
                  Attach to New Ticket
                </button>
              )}
            </div>

            {/* Nearby support */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[#0077C8]" />
                <p className="text-sm font-black text-gray-900">Nearby Support Points</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { name: 'DPAL Community Hub', type: 'Resource Center', dist: '0.4 mi', color: '#0077C8' },
                  { name: 'Legal Aid Clinic',   type: 'Legal Support',   dist: '1.1 mi', color: '#7C3AED' },
                  { name: 'Hope Shelter Help',  type: 'Charity Partner', dist: '1.8 mi', color: '#2FB344' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50/40 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15`, color: s.color }}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-800">{s.name}</p>
                      <p className="text-[10px] text-gray-500 font-semibold">{s.type}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold flex-shrink-0">
                      <MapPin className="w-3 h-3" />{s.dist}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TICKETS TAB ══════════════════ */}
        {activeTab === 'tickets' && (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Support Tickets</p>
              <button className="flex items-center gap-1.5 text-[11px] font-black text-[#0077C8] bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
                <Send className="w-3.5 h-3.5" /> New Ticket
              </button>
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {['All', 'In Review', 'Escalated', 'Awaiting Evidence', 'Resolved'].map(f => (
                <button
                  key={f}
                  className="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-full border transition-colors"
                  style={f === 'All' ? { background: '#0077C8', color: 'white', borderColor: '#0077C8' } : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}
                >
                  {f}
                </button>
              ))}
            </div>

            {MOCK_TICKETS.map(t => (
              <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />
            ))}

            {/* New ticket form teaser */}
            <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-gray-200 text-center">
              <p className="text-sm font-black text-gray-500 mb-1">Need to report a new issue?</p>
              <p className="text-[11px] text-gray-400 font-semibold mb-3">Describe your problem and attach proof for the fastest resolution.</p>
              <button className="bg-[#0077C8] text-white font-black text-sm px-6 py-2.5 rounded-xl hover:bg-[#005fa3] transition-colors">
                Open New Support Ticket
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ URGENT TAB ══════════════════ */}
        {activeTab === 'urgent' && (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

            {/* Emergency banner */}
            <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-base">Emergency Support</p>
                  <p className="text-red-200 text-[11px] font-semibold">Immediate action · Safety first</p>
                </div>
              </div>
              <p className="text-red-100 text-xs leading-relaxed">
                If you are in immediate danger or experiencing harassment, use the options below to escalate now.
                DPAL does not hide from problems — we resolve them.
              </p>
            </div>

            {/* Emergency action grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Unsafe Trip',           icon: '🚨', desc: 'In-progress trip emergency', color: '#dc2626', bg: '#FEF2F2' },
                { label: 'Account Fraud',          icon: '🔒', desc: 'Unauthorized access detected', color: '#dc2626', bg: '#FEF2F2' },
                { label: 'Harassment',             icon: '🛡️', desc: 'Report abuse or threats', color: '#F4A300', bg: '#FFFBEB' },
                { label: 'False Accusation',       icon: '⚖️', desc: 'Challenge a wrong action', color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Locked Account',         icon: '🔑', desc: 'Urgent access recovery', color: '#0077C8', bg: '#EFF6FF' },
                { label: 'Donation Emergency',     icon: '❤️', desc: 'Charity fund issue', color: '#2FB344', bg: '#F0FDF4' },
              ].map((item, i) => (
                <button
                  key={i}
                  className="text-left bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-md transition-all active:scale-95"
                  style={{ borderColor: `${item.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-black" style={{ color: item.color }}>{item.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold">{item.desc}</p>
                </button>
              ))}
            </div>

            {/* Live contact options */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Immediate Contact</p>
              <div className="space-y-3">
                {[
                  { icon: <Phone className="w-5 h-5" />,  label: 'Call Urgent Support Line',   sub: 'Available 24/7',         color: '#dc2626', bg: '#FEF2F2' },
                  { icon: <Send className="w-5 h-5" />,   label: 'Live Chat with Human Agent', sub: 'Avg wait: 3 min',         color: '#0077C8', bg: '#EFF6FF' },
                  { icon: <Mail className="w-5 h-5" />,   label: 'Escalation Email',           sub: 'urgent@dpal.network',    color: '#7C3AED', bg: '#F5F3FF' },
                ].map((c, i) => (
                  <button key={i} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors bg-white group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.bg, color: c.color }}>
                      {c.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-black text-gray-800">{c.label}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{c.sub}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Priority escalation form */}
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Submit Urgent Report</p>
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 resize-none outline-none focus:border-red-400 transition-colors"
                rows={4}
                placeholder="Describe your urgent situation clearly. Include what happened, when, and any relevant details…"
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-gray-100 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Attach Proof
                </button>
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 font-black text-sm transition-colors flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Escalate Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ AI + HUMAN SUPPORT TAB ══════════════════ */}
        {activeTab === 'support' && (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

            {/* AI support panel */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3 border-b border-purple-50" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600 shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-sm text-gray-900">DPAL Support AI</p>
                  <p className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" /> Online · Instant guidance
                  </p>
                </div>
              </div>

              {/* AI chat area */}
              <div className="p-4 space-y-3 min-h-[140px]">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 font-medium max-w-[80%]">
                    Hello! I'm the DPAL Support AI. Describe your issue and I'll guide you to the right solution or escalate to a human reviewer if needed.
                  </div>
                </div>
                {submitSuccess && (
                  <div className="flex gap-2.5 justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm font-medium max-w-[80%]">{aiInput}</div>
                  </div>
                )}
                {submitSuccess && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Loader className="w-3.5 h-3.5 text-white animate-spin" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 font-medium">
                      Analyzing your issue and preparing the best resolution path…
                    </div>
                  </div>
                )}
              </div>

              {/* Quick suggestions */}
              <div className="px-4 pb-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Common Issues</p>
                <div className="flex flex-wrap gap-1.5">
                  {AI_QUICK.map((q, i) => (
                    <button key={i} onClick={() => setAiInput(q)}
                      className="text-[10px] font-bold px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input bar */}
              <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
                <input
                  type="text"
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 transition-colors font-medium text-gray-800"
                  placeholder="Ask DPAL Support AI anything…"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiSubmit(); }}
                />
                <button onClick={handleAiSubmit} disabled={!aiInput.trim()}
                  className="w-9 h-9 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Human support pathways */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Human Review Support</p>
              <div className="space-y-3">
                {[
                  { icon: <User className="w-5 h-5" />,        label: 'Request Human Reviewer',     sub: 'Senior case reviewer · Avg 2 hrs',       color: '#0077C8',  available: true },
                  { icon: <Scale className="w-5 h-5" />,       label: 'Escalate to Case Manager',   sub: 'Complex disputes · Legal support',        color: '#7C3AED',  available: true },
                  { icon: <ShieldCheck className="w-5 h-5" />, label: 'Public Interest Review',     sub: 'Community impact · Transparency report',  color: '#059669',  available: true },
                  { icon: <AlertTriangle className="w-5 h-5" />,label: 'Safety Officer Escalation', sub: 'Harassment · Threat · Emergency',         color: '#dc2626',  available: true },
                ].map((h, i) => (
                  <button key={i} className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group text-left">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${h.color}12`, color: h.color }}>
                      {h.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-800 leading-snug">{h.label}</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{h.sub}</p>
                    </div>
                    {h.available && <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution promise */}
            <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #0D3B66 0%, #0077C8 100%)' }}>
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-blue-200 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-sm mb-1">The DPAL Promise</p>
                  <p className="text-blue-100 text-[11px] font-semibold leading-relaxed">
                    "If something goes wrong, DPAL does not hide from the problem. We give you a place to report it, prove it, repair it, escalate it, and track the resolution."
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* inline Scale icon */}
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

/* tiny inline Scale icon since it may not be in icons.tsx */
const Scale: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16H8" /><path d="m22 7-9.17 9.17a4 4 0 0 1-5.66 0l-.12-.12a4 4 0 0 1 0-5.66L16 2" /><path d="M2 22h20" />
  </svg>
);

export default HelpCenterView;
