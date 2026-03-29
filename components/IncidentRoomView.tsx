
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import type { SituationRoomSummary } from '../services/situationService';
import { type Report, type Hero, type ChatMessage, Category } from '../types';
import { ArrowLeft, Broadcast, ShieldCheck, Zap, Target, Clock, MapPin, CheckCircle, Search, FileText, Activity, Heart, Scale, User, Info, Pill, Home, Database, RefreshCw, Loader, ChevronRight, Send, Sparkles, Crosshair, X, Maximize2, AlertTriangle, Link, ChevronDown } from './icons';
import MissionChatroom from './MissionChatroom';
import { CATEGORIES_WITH_ICONS } from '../constants';
import { performIAReview } from '../services/geminiService';
import { buildReportVerifyUrl, buildSituationRoomUrl } from '../utils/deepLinks';

/** Matches certificate / print-to-PDF QR generation so scans from the room match the document. */
const CERTIFICATE_QR_OPTIONS = {
    width: 168,
    margin: 2,
    errorCorrectionLevel: 'M' as const,
    color: { dark: '#0a0a0a', light: '#ffffff' },
};

interface IncidentRoomViewProps {
    report: Report;
    onReturn: () => void;
    hero: Hero;
    messages: ChatMessage[];
    onSendMessage: (text: string, imageUrl?: string, audioUrl?: string) => void;
    roomsIndex?: SituationRoomSummary[];
    onJoinRoom?: (roomId: string) => void | Promise<void>;
    errorBanner?: string | null;
}

interface AnalyticalSector {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
}

interface Finding {
    id: string;
    title: string;
    value: string;
    status: 'VERIFIED' | 'ANOMALY' | 'MATCHED';
    hash: string;
}

const DEFAULT_SECTORS: AnalyticalSector[] = [
    { id: 'intel', label: 'INTEL_DISPATCH', description: 'Raw incoming dispatch packets and beacon control.', icon: <Broadcast className="w-6 h-6"/> },
    { id: 'audit', label: 'VERIFICATION_QUEUE', description: 'Peer-to-peer verification streams.', icon: <ShieldCheck className="w-6 h-6"/> },
    { id: 'comms', label: 'PUBLIC_RELAY', description: 'Standard citizen reporting channel.', icon: <Activity className="w-6 h-6"/> },
];

const ForensicValue: React.FC<{ label: string; value?: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800 space-y-2 group hover:border-cyan-500/30 transition-all">
        <div className="flex items-center space-x-2 text-[8px] font-black text-cyan-600/80 uppercase tracking-widest">
            {icon} <span>{label}</span>
        </div>
        <p className="text-xs font-bold text-white uppercase tracking-tight line-clamp-2">{value || 'DATA_MISSING'}</p>
    </div>
);

const IncidentRoomView: React.FC<IncidentRoomViewProps> = ({ report, onReturn, hero, messages, onSendMessage, roomsIndex = [], onJoinRoom, errorBanner }) => {
    const sectors = DEFAULT_SECTORS;
    
    const [activeSectorId, setActiveSectorId] = useState(sectors[0].id);
    const [directoryExpanded, setDirectoryExpanded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isBeaconActive, setIsBeaconActive] = useState(false);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapInteractive, setMapInteractive] = useState(false);
    
    const [beaconInput, setBeaconInput] = useState(report.location || '');
    const [lockedMapLocation, setLockedMapLocation] = useState(report.location || '');
    const [findings, setFindings] = useState<Record<string, Finding[]>>({});

    const activeSector = useMemo(() => sectors.find(s => s.id === activeSectorId) || sectors[0], [sectors, activeSectorId]);
    const roomNumber = report.id.split('-').pop()?.toUpperCase() || '0000';
    const verifyUrl = useMemo(() => buildReportVerifyUrl(report.id), [report.id]);
    const roomShareUrl = useMemo(() => buildSituationRoomUrl(report.id), [report.id]);
    const [copyVerifyOk, setCopyVerifyOk] = useState(false);
    const [copyRoomOk, setCopyRoomOk] = useState(false);
    const [qrVerifyDataUrl, setQrVerifyDataUrl] = useState<string | null>(null);
    const [qrSituationDataUrl, setQrSituationDataUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(true);
    const [qrError, setQrError] = useState(false);

    const loadCertificateQrs = useCallback(async () => {
        if (typeof window === 'undefined') return ['', ''] as [string, string];
        const v = buildReportVerifyUrl(report.id);
        const s = buildSituationRoomUrl(report.id);
        return Promise.all([QRCode.toDataURL(v, CERTIFICATE_QR_OPTIONS), QRCode.toDataURL(s, CERTIFICATE_QR_OPTIONS)]);
    }, [report.id]);

    useEffect(() => {
        setQrLoading(true);
        setQrError(false);
        loadCertificateQrs()
            .then(([a, b]) => {
                setQrVerifyDataUrl(a);
                setQrSituationDataUrl(b);
            })
            .catch(() => setQrError(true))
            .finally(() => setQrLoading(false));
    }, [loadCertificateQrs]);

    const copyVerifyLink = async () => {
        if (!verifyUrl) return;
        try {
            await navigator.clipboard.writeText(verifyUrl);
            setCopyVerifyOk(true);
            window.setTimeout(() => setCopyVerifyOk(false), 2000);
        } catch {
            /* ignore */
        }
    };

    const copyRoomLink = async () => {
        if (!roomShareUrl) return;
        try {
            await navigator.clipboard.writeText(roomShareUrl);
            setCopyRoomOk(true);
            window.setTimeout(() => setCopyRoomOk(false), 2000);
        } catch {
            /* ignore */
        }
    };

    const handleSummonBeacon = () => {
        if (isBeaconActive) {
            setIsBeaconActive(false);
            onSendMessage(`[SYSTEM_NOTICE]: Community beacon deactivated for sector ${lockedMapLocation.toUpperCase()}.`);
            return;
        }
        if (!beaconInput.trim()) return;
        
        setMapLoading(true);
        setLockedMapLocation(beaconInput);
        setIsBeaconActive(true);
        onSendMessage(`[BEACON_DEPLOYED]: Global Signal Active in ${beaconInput.toUpperCase()}. Directive: Forensic verification requested.`);
    };

    const runDiagnostic = async () => {
        setIsScanning(true);
        try {
            if (activeSectorId === 'audit') {
                await new Promise(r => setTimeout(r, 1500));
                const mockFindings: Finding[] = [
                    { id: `FND-01`, title: 'Consensus Check', value: '4/5 Guardians Confirmed', status: 'VERIFIED', hash: '0x3E12B' },
                    { id: `FND-02`, title: 'Biometric Validity', status: 'MATCHED', value: 'Author Identity Sync OK', hash: '0xA119' }
                ];
                setFindings(prev => ({ ...prev, [activeSectorId]: mockFindings }));
            } else if (activeSectorId === 'intel') {
                const result = await performIAReview(report);
                setFindings(prev => ({ ...prev, [activeSectorId]: result.findings }));
            } else {
                await new Promise(r => setTimeout(r, 1200));
                const mockFindings: Finding[] = [
                    { id: `FND-COM`, title: 'Network Echo', value: 'Regional node broadcast stable', status: 'VERIFIED', hash: '0x99FF' }
                ];
                setFindings(prev => ({ ...prev, [activeSectorId]: mockFindings }));
            }
        } finally {
            setIsScanning(false);
        }
    };

    const mapUrl = useMemo(() => {
        return `https://maps.google.com/maps?q=${encodeURIComponent(lockedMapLocation || 'Earth')}&t=k&z=15&ie=UTF8&iwloc=&output=embed`;
    }, [lockedMapLocation]);
    
    const forensics = report.structuredData?.forensics || {
        jurisdiction: report.location,
        duty: 'GENERAL_OVERSIGHT',
        deviation: 'PENDING_ANALYSIS',
        impactRisk: report.severity
    };

    return (
        <div className="bg-zinc-950 text-white min-h-[92vh] h-auto rounded-[3.5rem] border border-zinc-800 shadow-3xl animate-fade-in font-mono flex flex-col relative">
            <header className="bg-zinc-900 border-b border-zinc-800 px-6 md:px-10 py-5 md:py-7 flex justify-between items-center z-30 flex-shrink-0">
                <div className="flex items-center space-x-4 md:space-x-8">
                    <div className="p-3 md:p-4 bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/30 relative shadow-2xl">
                        <Broadcast className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
                        <div className="absolute -top-1 -right-1 w-2 md:w-3 h-2 md:h-3 bg-emerald-500 rounded-full animate-ping shadow-[0_0_10px_emerald]"></div>
                    </div>
                    <div>
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
                            <h1 className="text-lg md:text-2xl font-black uppercase tracking-tighter truncate text-emerald-400">SITUATION_ROOM</h1>
                            <span className="bg-emerald-600 text-black px-3 py-1 rounded-xl text-[8px] md:text-xs font-black uppercase tracking-widest mt-1 md:mt-0 w-fit">FRAGMENT_{roomNumber}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                    <button onClick={onReturn} className="flex items-center space-x-2 md:space-x-3 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors group">
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-1" />
                        <span>Term_Exit</span>
                    </button>
                </div>
            </header>

            <div className="border-b border-zinc-800 bg-zinc-950/90 px-4 md:px-10 py-4 shrink-0 space-y-3">
                <div className="flex items-center gap-2 text-zinc-500">
                    <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em]">
                        Printable certificate & PDF — same QR payloads as your report
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 min-w-0">
                        <div className="shrink-0 w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-xl border border-zinc-600 bg-white flex items-center justify-center p-1.5">
                            {qrLoading ? (
                                <Loader className="w-8 h-8 text-zinc-400 animate-spin" />
                            ) : qrError ? (
                                <span className="text-[8px] font-bold text-rose-400 text-center px-1">QR error</span>
                            ) : qrVerifyDataUrl ? (
                                <img src={qrVerifyDataUrl} alt="Ledger verification QR — same as PDF certificate" className="w-full h-full object-contain" width={100} height={100} />
                            ) : null}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ledger verification (PDF QR)</p>
                            </div>
                            <p className="text-[9px] font-mono text-zinc-400 break-all leading-snug" title={verifyUrl}>
                                {verifyUrl || '…'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-auto pt-1">
                                <a
                                    href={verifyUrl || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-zinc-700 transition-colors"
                                >
                                    Open report
                                </a>
                                <button
                                    type="button"
                                    onClick={() => void copyVerifyLink()}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-600 transition-colors"
                                >
                                    {copyVerifyOk ? 'Copied' : 'Copy link'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 min-w-0">
                        <div className="shrink-0 w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-xl border border-zinc-600 bg-white flex items-center justify-center p-1.5">
                            {qrLoading ? (
                                <Loader className="w-8 h-8 text-zinc-400 animate-spin" />
                            ) : qrError ? (
                                <span className="text-[8px] font-bold text-rose-400 text-center px-1">QR error</span>
                            ) : qrSituationDataUrl ? (
                                <img src={qrSituationDataUrl} alt="Situation room QR — same as PDF certificate" className="w-full h-full object-contain" width={100} height={100} />
                            ) : null}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Link className="w-4 h-4 text-cyan-500 shrink-0" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Situation room (share link)</p>
                            </div>
                            <p className="text-[9px] font-mono text-zinc-400 break-all leading-snug" title={roomShareUrl}>
                                {roomShareUrl || '…'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-auto pt-1">
                                <a
                                    href={roomShareUrl || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-zinc-700 transition-colors"
                                >
                                    Open room
                                </a>
                                <button
                                    type="button"
                                    onClick={() => void copyRoomLink()}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-600 transition-colors"
                                >
                                    {copyRoomOk ? 'Copied' : 'Copy link'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <nav className="bg-zinc-900/50 border-b border-zinc-800/50 px-6 md:px-10 flex items-center justify-start lg:justify-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
                {sectors.map(s => (
                    <button key={s.id} onClick={() => setActiveSectorId(s.id)} className={`flex items-center space-x-3 md:space-x-4 px-6 md:px-10 py-4 md:py-6 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all relative group flex-shrink-0 ${activeSectorId === s.id ? 'text-emerald-400 bg-emerald-950/20 shadow-[inset_0_-4px_0_#10b981]' : 'text-zinc-600 hover:text-zinc-300'}`}>
                        {s.icon} <span className="inline">{s.label.split('_')[0]}</span>
                    </button>
                ))}
            </nav>

            <main className="flex-grow flex flex-col min-h-0 overflow-visible relative">
                {errorBanner && (
                    <div className="mx-4 md:mx-10 mt-4 p-3 rounded-xl border border-amber-600/40 bg-amber-950/30 text-amber-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                        {errorBanner}
                    </div>
                )}

                {/* Chat directly under QR + metadata (above directory + map) */}
                <section className="flex flex-col min-h-0 flex-1 bg-black border-b border-zinc-900">
                    <div className="flex h-full min-h-[min(420px,55vh)] max-h-[min(560px,60vh)] flex-col overflow-hidden border-l-4 border-zinc-900 shadow-[inset_20px_0_60px_rgba(0,0,0,0.8)] mx-0">
                        <MissionChatroom missionId={report.id} messages={messages} onSendMessage={onSendMessage} hero={hero} />
                    </div>
                </section>

                {/* Join room directory — own section; list expands from primary control */}
                <section id="room-directory" className="border-b border-zinc-800 bg-zinc-950/80 px-4 md:px-10 py-6 md:py-8 space-y-4 shrink-0">
                    <button
                        type="button"
                        onClick={() => setDirectoryExpanded((v) => !v)}
                        className="w-full flex items-center justify-between gap-4 rounded-2xl border-2 border-emerald-700/50 bg-emerald-950/30 px-5 py-4 text-left hover:bg-emerald-950/50 hover:border-emerald-600 transition-colors"
                        aria-expanded={directoryExpanded}
                    >
                        <span className="text-sm md:text-base font-black uppercase tracking-[0.2em] text-emerald-300">Join room directory</span>
                        <ChevronDown className={`w-5 h-5 text-emerald-400 shrink-0 transition-transform ${directoryExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {directoryExpanded && (
                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1 pt-2">
                            {roomsIndex.slice(0, 12).map((room) => {
                                const activeCount = room.activeUsers ?? room.participants ?? room.memberCount;
                                return (
                                    <div key={room.roomId} className="bg-black/50 border border-zinc-800 rounded-2xl p-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">{room.title}</p>
                                            <span className="text-[9px] text-zinc-400">{activeCount ?? '—'} active</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] text-zinc-500">
                                            <span>{room.lastActivityAt ? new Date(room.lastActivityAt).toLocaleString() : 'Activity unknown'}</span>
                                            <span className={`px-2 py-0.5 rounded-full border ${room.mediaPersistence === false ? 'border-amber-700 text-amber-400' : 'border-emerald-700 text-emerald-400'}`}>
                                                {room.mediaPersistence === false ? 'volatile media' : 'media persisted'}
                                            </span>
                                        </div>
                                        <button type="button" onClick={() => onJoinRoom?.(room.roomId)} className="w-full py-2 rounded-xl bg-emerald-600/20 border border-emerald-700 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-600/30">
                                            Join Room
                                        </button>
                                    </div>
                                );
                            })}
                            {roomsIndex.length === 0 && <p className="text-[10px] text-zinc-500 uppercase">No indexed rooms yet.</p>}
                        </div>
                    )}
                </section>

                {/* Map + beacon below directory */}
                <section className="p-6 md:p-10 space-y-8">
                    <div className={`p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border-4 transition-all duration-1000 flex flex-col items-center space-y-6 md:space-y-10 relative ${isBeaconActive ? 'bg-rose-950/20 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.1)]' : 'bg-zinc-950 border-zinc-800 shadow-2xl'}`}>
                        <div className="relative group/map w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border-4 border-zinc-900 bg-black shadow-4xl aspect-video">
                            <iframe
                                src={mapUrl}
                                className={`w-full h-full grayscale opacity-40 transition-all duration-1000 ${mapLoading ? 'blur-md' : 'blur-0'} ${mapInteractive ? 'grayscale-0 opacity-100' : 'pointer-events-none'}`}
                                frameBorder="0"
                                scrolling="no"
                                title="Tactical Feed"
                                onLoad={() => setMapLoading(false)}
                            />

                            {!mapInteractive && (
                                <div
                                    className="absolute inset-0 z-20 cursor-crosshair flex items-center justify-center bg-transparent group-hover/map:bg-cyan-500/5 transition-colors"
                                    onClick={() => setMapInteractive(true)}
                                >
                                    <div className="bg-zinc-950/80 backdrop-blur-md px-6 py-2 rounded-full border border-cyan-500/30 opacity-0 group-hover/map:opacity-100 transition-opacity shadow-2xl">
                                        <p className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Enable_Tactical_Link</p>
                                    </div>
                                </div>
                            )}

                            {mapInteractive && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMapInteractive(false); }}
                                    className="absolute top-4 right-4 z-40 bg-zinc-900 border border-zinc-700 p-2 rounded-lg text-white hover:bg-rose-900 transition-colors shadow-2xl"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}

                            <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
                                <div className="bg-zinc-950/90 border border-zinc-700/50 p-2 rounded-xl flex items-center space-x-2 shadow-2xl">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500/50"/>
                                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">RSA-4096_SYNC</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 md:space-y-8 w-full text-left">
                            <div className="space-y-3">
                                <label className="text-[10px] md:text-sm font-black text-cyan-600 uppercase tracking-[0.4em] ml-2">Geospatial_Target</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={beaconInput}
                                        onChange={(e) => setBeaconInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSummonBeacon()}
                                        placeholder="Target Sector..."
                                        className="w-full bg-black border-4 border-zinc-800 p-4 md:p-6 rounded-[1.2rem] md:rounded-[1.5rem] text-sm md:text-lg font-black uppercase text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
                                    />
                                    <Crosshair className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-zinc-800" />
                                </div>
                            </div>
                            <button
                                onClick={handleSummonBeacon}
                                disabled={!beaconInput.trim()}
                                className={`w-full py-5 md:py-7 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-xs md:text-sm tracking-[0.4em] transition-all border-4 shadow-4xl ${isBeaconActive ? 'bg-rose-600 border-rose-400 text-white animate-pulse' : 'bg-white border-zinc-200 text-black hover:bg-emerald-400 hover:border-emerald-400 disabled:opacity-20 active:scale-[0.98]'}`}
                            >
                                {isBeaconActive ? 'ABORT_BEACON' : 'DEPLOY_BEACON'}
                            </button>
                        </div>
                    </div>
                </section>

                <section className="border-t border-zinc-800 bg-zinc-900/30 px-4 md:px-10 py-6 md:py-8 shrink-0">
                    <h3 className="text-[10px] font-black uppercase text-cyan-500 tracking-[0.4em] flex items-center space-x-3 mb-4">
                        <Database className="w-4 h-4 text-cyan-500" />
                        <span>Case_Metadata</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                        <ForensicValue label="Jurisdiction" value={forensics?.jurisdiction} icon={<MapPin className="w-3 h-3 text-rose-500"/>} />
                        <ForensicValue label="Duty_Standard" value={forensics?.duty} icon={<ShieldCheck className="w-3 h-3 text-emerald-500"/>} />
                        <ForensicValue label="Deviation" value={forensics?.deviation} icon={<Zap className="w-3 h-3 text-amber-500"/>} />
                        <ForensicValue label="Impact" value={forensics?.impactRisk} icon={<AlertTriangle className="w-3 h-3 text-rose-600"/>} />
                    </div>
                </section>
            </main>
        </div>
    );
};

export default IncidentRoomView;
