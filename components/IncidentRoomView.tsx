
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import type { SituationRoomSummary } from '../services/situationService';
import { type Report, type Hero, type ChatMessage, Category } from '../types';
import { ArrowLeft, Broadcast, ShieldCheck, Zap, Target, Clock, MapPin, CheckCircle, Search, FileText, Activity, Heart, Scale, User, Info, Pill, Home, Database, RefreshCw, Loader, ChevronRight, Send, Sparkles, Maximize2, AlertTriangle, Link, ChevronDown } from './icons';
import MissionChatroom from './MissionChatroom';
import DeployBeaconPanel, { type BeaconCoordStatus } from './DeployBeaconPanel';
import { CATEGORIES_WITH_ICONS, CHAT_SURFACE_CLASS } from '../constants';
import { performIAReview } from '../services/geminiService';
import { buildReportVerifyUrl, buildSituationRoomUrl } from '../utils/deepLinks';
import {
  fetchActiveBeacons,
  publishBeacon,
  resolveBeaconOnNetwork,
  type BeaconRecord,
} from '../services/beaconService';

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
    { id: 'intel', label: 'COORDINATION', description: 'Updates, beacon context, and shared signals for this room.', icon: <Broadcast className="w-6 h-6"/> },
    { id: 'audit', label: 'VERIFICATION', description: 'Checks and confirmations from peers and reviewers.', icon: <ShieldCheck className="w-6 h-6"/> },
    { id: 'comms', label: 'COMMUNITY', description: 'Open thread and supportive back-and-forth.', icon: <Activity className="w-6 h-6"/> },
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
    const [beaconDeployedAt, setBeaconDeployedAt] = useState<number | null>(null);
    const [beaconCoordStatus, setBeaconCoordStatus] = useState<BeaconCoordStatus>('idle');
    const [mapLoading, setMapLoading] = useState(false);
    const [mapInteractive, setMapInteractive] = useState(false);
    
    const [beaconInput, setBeaconInput] = useState(report.location || '');
    const [lockedMapLocation, setLockedMapLocation] = useState(report.location || '');
    const [beaconCoords, setBeaconCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [networkBeacons, setNetworkBeacons] = useState<BeaconRecord[]>([]);
    const [beaconNetworkHint, setBeaconNetworkHint] = useState<string | null>(null);
    const [beaconSyncError, setBeaconSyncError] = useState<string | null>(null);
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

    const refreshNetworkBeacons = useCallback(async () => {
        const { beacons, error } = await fetchActiveBeacons();
        setNetworkBeacons(beacons);
        if (error && beacons.length === 0) {
            setBeaconSyncError('Could not reach the beacon service; list may be empty until the API is online.');
        } else {
            setBeaconSyncError(null);
        }
    }, []);

    useEffect(() => {
        void refreshNetworkBeacons();
        const t = window.setInterval(() => void refreshNetworkBeacons(), 15000);
        return () => window.clearInterval(t);
    }, [refreshNetworkBeacons]);

    const handleDeployBeacon = async (payload: {
        area: string;
        urgency: 'standard' | 'elevated' | 'urgent';
        alertKind: string;
        notes: string;
    }) => {
        if (!payload.area.trim()) return;
        setLockedMapLocation(payload.area);
        setIsBeaconActive(true);
        const deployedAt = Date.now();
        setBeaconDeployedAt(deployedAt);
        setBeaconCoordStatus('active');

        let lat: number | undefined;
        let lng: number | undefined;
        await new Promise<void>((resolve) => {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
                resolve();
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                    setBeaconCoords({ lat, lng: lng! });
                    resolve();
                },
                () => resolve(),
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
            );
        });

        const pub = await publishBeacon({
            reportId: report.id,
            title: report.title,
            areaLabel: payload.area.trim(),
            urgency: payload.urgency,
            alertKind: payload.alertKind,
            deployedAt,
            latitude: lat,
            longitude: lng,
        });
        setBeaconNetworkHint(pub.error ?? null);
        void refreshNetworkBeacons();

        const kindLabel = payload.alertKind.replace(/_/g, ' ');
        const noteLine = payload.notes.trim() ? ` Notes: ${payload.notes.trim()}` : '';
        const geoNote =
            lat != null && lng != null
                ? ` Coordinates shared for map (${lat.toFixed(5)}, ${lng.toFixed(5)}).`
                : '';
        onSendMessage(
            `[Beacon] Support signal active for "${report.title}" near ${payload.area}. Type: ${kindLabel}. Urgency: ${payload.urgency}.${noteLine}${geoNote} — Live coordination thread is open; helpers and moderators can join and respond.`
        );
    };

    const handleResolveBeacon = async () => {
        setIsBeaconActive(false);
        setBeaconCoordStatus('resolved');
        setBeaconDeployedAt(null);
        setBeaconCoords(null);
        const res = await resolveBeaconOnNetwork(report.id);
        setBeaconNetworkHint(res.error ?? null);
        void refreshNetworkBeacons();
        onSendMessage(
            `[Beacon] Coordination signal ended for ${lockedMapLocation || beaconInput}. Status: resolved. Thank you for keeping the record constructive and community-centered.`
        );
    };

    const scrollToLiveChat = () => {
        if (typeof document === 'undefined') return;
        document.getElementById('situation-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        if (beaconCoords && isBeaconActive) {
            return `https://www.google.com/maps?q=${beaconCoords.lat},${beaconCoords.lng}&z=17&output=embed`;
        }
        const z = isBeaconActive ? 16 : 15;
        return `https://maps.google.com/maps?q=${encodeURIComponent(lockedMapLocation || 'Earth')}&t=k&z=${z}&ie=UTF8&iwloc=&output=embed`;
    }, [lockedMapLocation, beaconCoords, isBeaconActive]);

    const publicMapUrl = useMemo(() => {
        if (beaconCoords && isBeaconActive) {
            return `https://www.google.com/maps?q=${beaconCoords.lat},${beaconCoords.lng}&z=17`;
        }
        const q = lockedMapLocation.trim() || 'Earth';
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }, [beaconCoords, isBeaconActive, lockedMapLocation]);
    
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
                <section id="situation-chat" className="flex flex-col min-h-0 flex-1 bg-slate-100 border-b border-slate-200 scroll-mt-4">
                    <div className={`flex h-full min-h-[min(420px,55vh)] max-h-[min(560px,60vh)] flex-col overflow-hidden ${CHAT_SURFACE_CLASS} border border-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_40px_-12px_rgba(15,23,42,0.08)] mx-2 mb-1 md:mx-4 md:mb-2`}>
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

                {/* Deploy Beacon + map — same corner radius as live chat above */}
                <section className="px-2 md:px-4 pb-8 md:pb-12 pt-2 md:pt-4">
                    <DeployBeaconPanel
                        report={report}
                        roomsIndex={roomsIndex}
                        areaLabel={beaconInput}
                        onAreaLabelChange={setBeaconInput}
                        lockedAreaLabel={lockedMapLocation}
                        isBeaconActive={isBeaconActive}
                        coordStatus={beaconCoordStatus}
                        deployedAt={beaconDeployedAt}
                        onDeploy={handleDeployBeacon}
                        onResolve={handleResolveBeacon}
                        onSendCoordinationNote={(text) => onSendMessage(text)}
                        onJoinLinkedRoom={onJoinRoom}
                        onOpenLiveChat={scrollToLiveChat}
                        mapUrl={mapUrl}
                        publicMapUrl={publicMapUrl}
                        mapLoading={mapLoading}
                        mapInteractive={mapInteractive}
                        onMapLoad={() => setMapLoading(false)}
                        onSetMapInteractive={setMapInteractive}
                        networkBeacons={networkBeacons}
                        beaconNetworkHint={beaconNetworkHint}
                        beaconSyncError={beaconSyncError}
                        hasPreciseLocation={!!beaconCoords}
                    />
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
