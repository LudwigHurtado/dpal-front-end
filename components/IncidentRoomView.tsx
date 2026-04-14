
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import type { SituationRoomSummary } from '../services/situationService';
import { type Report, type Hero, type ChatMessage, Category } from '../types';
import { ArrowLeft, Broadcast, ShieldCheck, Zap, Target, Clock, MapPin, CheckCircle, Search, FileText, Activity, Heart, Scale, User, Info, Pill, Home, Database, RefreshCw, Loader, ChevronRight, Send, Sparkles, Maximize2, Minimize2, AlertTriangle, Link, ChevronDown, GripVertical, Camera, Star } from './icons';
import MissionChatroom from './MissionChatroom';
import DeployBeaconPanel, { type BeaconCoordStatus } from './DeployBeaconPanel';
import { GlobalAlertsPanel } from './GlobalAlertsPanel';
import { CATEGORIES_WITH_ICONS, CHAT_SURFACE_CLASS, DEFAULT_MAP_LOCATION } from '../constants';
import { performIAReview } from '../services/geminiService';
import { buildReportVerifyUrl, buildSituationRoomUrl } from '../utils/deepLinks';
import {
  fetchActiveBeacons,
  publishBeacon,
  resolveBeaconOnNetwork,
  type BeaconRecord,
} from '../services/beaconService';

/** Collect visual URLs filed with the report — works across categories (imageUrls + common structuredData shapes). */
function collectReportImageUrls(report: Report): string[] {
  const out: string[] = [];
  const push = (u: unknown) => {
    if (typeof u === 'string' && u.trim().length > 0) out.push(u.trim());
  };
  if (Array.isArray(report.imageUrls)) {
    report.imageUrls.forEach(push);
  }
  const sd = report.structuredData;
  if (sd && typeof sd === 'object') {
    const o = sd as Record<string, unknown>;
    for (const key of ['photos', 'images', 'imageUrls', 'filingImages', 'attachmentUrls'] as const) {
      const v = o[key];
      if (!Array.isArray(v)) continue;
      for (const item of v) {
        if (typeof item === 'string') push(item);
        else if (item && typeof item === 'object' && 'url' in item) push((item as { url: string }).url);
      }
    }
  }
  return [...new Set(out)];
}

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
    onEnterMissionRoom?: (report: Report) => void;
    hero: Hero;
    messages: ChatMessage[];
    onSendMessage: (text: string, imageUrl?: string, audioUrl?: string) => void;
    /** Upload a new main filing image (data URL or http after parent uploads). Prepends to gallery + history. */
    onFilingImageUpload?: (dataUrl: string) => void | Promise<void>;
    /** Move an existing URL to hero (main) without deleting others. */
    onSetMainFilingImage?: (imageUrl: string) => void;
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

const SITUATION_CHAT_HEIGHT_STORAGE_KEY = 'dpal-situation-chat-height-px';
const CHAT_HEIGHT_DEFAULT_PX = 440;
const CHAT_HEIGHT_MIN_PX = 280;
const CHAT_HEIGHT_COMPACT_PX = 360;

function readStoredChatHeightPx(): number {
    if (typeof window === 'undefined') return CHAT_HEIGHT_DEFAULT_PX;
    try {
        const raw = localStorage.getItem(SITUATION_CHAT_HEIGHT_STORAGE_KEY);
        if (raw) {
            const n = parseInt(raw, 10);
            if (!Number.isNaN(n)) return n;
        }
    } catch {
        /* ignore */
    }
    return CHAT_HEIGHT_DEFAULT_PX;
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

function collectFilingHistoryUrls(report: Report): string[] {
    const raw = report.filingImageHistory;
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of raw) {
        const s = String(u).trim();
        if (!s || seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

const IncidentRoomView: React.FC<IncidentRoomViewProps> = ({
    report,
    onReturn,
    onEnterMissionRoom,
    hero,
    messages,
    onSendMessage,
    onFilingImageUpload,
    onSetMainFilingImage,
    roomsIndex = [],
    onJoinRoom,
    errorBanner,
}) => {
    const reportImageUrls = useMemo(() => collectReportImageUrls(report), [report]);
    const filingHistoryUrls = useMemo(() => collectFilingHistoryUrls(report), [report]);
    const filingFileInputRef = useRef<HTMLInputElement>(null);
    const sectors = DEFAULT_SECTORS;
    const [filingUploadBusy, setFilingUploadBusy] = useState(false);

    const handleFilingFileSelected = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file || !file.type.startsWith('image/') || !onFilingImageUpload) return;
            setFilingUploadBusy(true);
            try {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('read'));
                    reader.readAsDataURL(file);
                });
                if (dataUrl.startsWith('data:')) await onFilingImageUpload(dataUrl);
            } catch {
                /* ignore */
            } finally {
                setFilingUploadBusy(false);
            }
        },
        [onFilingImageUpload],
    );
    
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
    const categoryLabel = useMemo(() => {
        const fromCatalog = CATEGORIES_WITH_ICONS.find((c) => c.value === report.category);
        if (fromCatalog?.value) return String(fromCatalog.value);
        return String(report.category || Category.Other);
    }, [report.category]);
    const situationRoomTitle = useMemo(
        () => `${categoryLabel.toUpperCase()} SITUATION ROOM`,
        [categoryLabel]
    );
    const verifyUrl = useMemo(() => buildReportVerifyUrl(report.id), [report.id]);
    const roomShareUrl = useMemo(() => buildSituationRoomUrl(report.id), [report.id]);
    const [copyVerifyOk, setCopyVerifyOk] = useState(false);
    const [copyRoomOk, setCopyRoomOk] = useState(false);
    const [qrVerifyDataUrl, setQrVerifyDataUrl] = useState<string | null>(null);
    const [qrSituationDataUrl, setQrSituationDataUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(true);
    const [qrError, setQrError] = useState(false);

    const [chatHeightPx, setChatHeightPx] = useState(readStoredChatHeightPx);
    const [maxChatHeightPx, setMaxChatHeightPx] = useState(() =>
        typeof window !== 'undefined' ? Math.min(Math.floor(window.innerHeight * 0.82), 920) : 920
    );
    const chatHeightDuringDragRef = useRef(chatHeightPx);

    useEffect(() => {
        chatHeightDuringDragRef.current = chatHeightPx;
    }, [chatHeightPx]);

    useEffect(() => {
        const updateMax = () => {
            const m = Math.min(Math.floor(window.innerHeight * 0.82), 920);
            setMaxChatHeightPx(m);
            setChatHeightPx((h) => Math.min(Math.max(h, CHAT_HEIGHT_MIN_PX), m));
        };
        updateMax();
        window.addEventListener('resize', updateMax);
        return () => window.removeEventListener('resize', updateMax);
    }, []);

    const persistChatHeight = useCallback((px: number) => {
        try {
            localStorage.setItem(SITUATION_CHAT_HEIGHT_STORAGE_KEY, String(px));
        } catch {
            /* ignore */
        }
    }, []);

    const clampChatHeight = useCallback(
        (px: number) => Math.min(Math.max(Math.round(px), CHAT_HEIGHT_MIN_PX), maxChatHeightPx),
        [maxChatHeightPx]
    );

    const onChatResizePointerDown = useCallback(
        (e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault();
            const el = e.currentTarget;
            el.setPointerCapture(e.pointerId);
            const startY = e.clientY;
            const startH = chatHeightDuringDragRef.current;

            const onMove = (ev: PointerEvent) => {
                const dy = ev.clientY - startY;
                const next = clampChatHeight(startH + dy);
                chatHeightDuringDragRef.current = next;
                setChatHeightPx(next);
            };
            const onUp = (ev: PointerEvent) => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                try {
                    el.releasePointerCapture(ev.pointerId);
                } catch {
                    /* ignore */
                }
                persistChatHeight(chatHeightDuringDragRef.current);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [clampChatHeight, persistChatHeight]
    );

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
        return `https://maps.google.com/maps?q=${encodeURIComponent((lockedMapLocation || '').trim() || DEFAULT_MAP_LOCATION)}&t=k&z=${z}&ie=UTF8&iwloc=&output=embed`;
    }, [lockedMapLocation, beaconCoords, isBeaconActive]);

    const publicMapUrl = useMemo(() => {
        if (beaconCoords && isBeaconActive) {
            return `https://www.google.com/maps?q=${beaconCoords.lat},${beaconCoords.lng}&z=17`;
        }
        const q = lockedMapLocation.trim() || DEFAULT_MAP_LOCATION;
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
                            <h1 className="text-base md:text-2xl font-black uppercase tracking-tighter truncate text-emerald-400">
                                {situationRoomTitle}
                            </h1>
                            <span className="bg-emerald-600 text-black px-3 py-1 rounded-xl text-[8px] md:text-xs font-black uppercase tracking-widest mt-1 md:mt-0 w-fit">FRAGMENT_{roomNumber}</span>
                        </div>
                        <p className="mt-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                            Report: {report.title || `Untitled ${categoryLabel}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                    {onEnterMissionRoom && (
                        <button
                            type="button"
                            onClick={() => onEnterMissionRoom(report)}
                            className="hidden sm:inline-flex items-center space-x-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            <Target className="w-4 h-4 md:w-5 md:h-5" />
                            <span>ENTER_MISSIONS_ROOM</span>
                        </button>
                    )}
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

                {/* Filing imagery — hero + gallery; uploads prepend; full history retained on the report. */}
                <section
                    aria-label="Report filing imagery"
                    className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/40 px-3 py-3 md:px-10 md:py-4"
                >
                    <input
                        ref={filingFileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFilingFileSelected}
                    />
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                            <Camera className="h-4 w-4 shrink-0 text-cyan-500" aria-hidden />
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                    Filing imagery — this report
                                </p>
                                <p className="mt-0.5 text-[9px] leading-relaxed text-zinc-600">
                                    Upload a new image to set it as the main filing photo; previous versions stay in the gallery and audit history.
                                </p>
                            </div>
                        </div>
                        {onFilingImageUpload && (
                            <button
                                type="button"
                                disabled={filingUploadBusy}
                                onClick={() => filingFileInputRef.current?.click()}
                                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-700/60 bg-cyan-950/40 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-300 hover:bg-cyan-950/70 disabled:opacity-50"
                            >
                                {filingUploadBusy ? (
                                    <>
                                        <Loader className="h-3.5 w-3.5 animate-spin" />
                                        Uploading…
                                    </>
                                ) : (
                                    <>
                                        <Camera className="h-3.5 w-3.5" />
                                        Add / update main image
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    {reportImageUrls.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            <div className="overflow-hidden rounded-2xl border border-zinc-700/80 bg-black/40 shadow-inner">
                                <img
                                    src={reportImageUrls[0]}
                                    alt=""
                                    className="max-h-[min(52vh,420px)] w-full object-contain object-center bg-zinc-950"
                                    loading="eager"
                                />
                                <div className="border-t border-zinc-800/80 bg-zinc-950/80 px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500/90">
                                        Main filing image
                                    </p>
                                </div>
                            </div>
                            {reportImageUrls.length > 1 && (
                                <div>
                                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                        All filing images ({reportImageUrls.length})
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {reportImageUrls.map((url, index) => (
                                            <div
                                                key={`${url}-${index}`}
                                                className={`group relative overflow-hidden rounded-xl border bg-zinc-900 ${
                                                    index === 0 ? 'border-emerald-600 ring-1 ring-emerald-600/40' : 'border-zinc-600'
                                                }`}
                                            >
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block aspect-[4/3] bg-black/50"
                                                >
                                                    <img
                                                        src={url}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                        loading={index === 0 ? 'eager' : 'lazy'}
                                                    />
                                                </a>
                                                <div className="flex flex-wrap gap-1 border-t border-zinc-800/80 bg-zinc-950/95 p-1.5">
                                                    {index === 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-400">
                                                            <Star className="h-3 w-3" />
                                                            Main
                                                        </span>
                                                    ) : (
                                                        onSetMainFilingImage && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onSetMainFilingImage(url)}
                                                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-zinc-600 bg-zinc-800/80 px-1.5 py-1 text-[8px] font-black uppercase tracking-wide text-zinc-200 hover:border-cyan-600 hover:text-cyan-300"
                                                            >
                                                                <Target className="h-3 w-3 shrink-0" />
                                                                Set main
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 px-4 py-6 text-zinc-500">
                            <Camera className="h-8 w-8 shrink-0 opacity-40" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                    No photos on file for this report
                                </p>
                                <p className="mt-1 text-[9px] leading-relaxed text-zinc-600">
                                    Images submitted with the filing appear here for everyone in this room. Use “Add / update main image” to attach one from this room, or add photos when you file a report (any category).
                                </p>
                            </div>
                        </div>
                    )}
                    {filingHistoryUrls.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
                            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                Filing image history (audit)
                            </p>
                            <p className="mb-2 text-[8px] leading-relaxed text-zinc-600">
                                Every version uploaded or merged into this room is listed in order. Removing an image from the live gallery does not remove it from this history.
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                                {filingHistoryUrls.map((url, hi) => (
                                    <a
                                        key={`hist-${hi}-${url.slice(-24)}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                                    >
                                        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                                        <span className="absolute bottom-0 left-0 right-0 bg-black/70 px-0.5 py-0.5 text-center text-[7px] font-mono text-zinc-400">
                                            #{hi + 1}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Live Global Alerts — USGS + NASA EONET real-time feed */}
                <GlobalAlertsPanel
                    reportLocation={report.location}
                    reportCategory={report.category}
                />

                {/* Chat — user-resizable height (drag handle + presets), persisted in localStorage */}
                <section id="situation-chat" className="flex shrink-0 flex-col scroll-mt-4 border-b border-zinc-800/80 bg-zinc-950 px-3 pb-3 pt-2 md:px-6 md:pb-4 md:pt-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Live coordination — drag edge to resize</p>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => {
                                    const v = clampChatHeight(CHAT_HEIGHT_COMPACT_PX);
                                    setChatHeightPx(v);
                                    persistChatHeight(v);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                                title="Shorter chat"
                            >
                                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                                <span className="hidden sm:inline">Short</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const v = clampChatHeight(CHAT_HEIGHT_DEFAULT_PX);
                                    setChatHeightPx(v);
                                    persistChatHeight(v);
                                }}
                                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                                title="Default height"
                            >
                                Default
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const v = clampChatHeight(maxChatHeightPx);
                                    setChatHeightPx(v);
                                    persistChatHeight(v);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                                title="Tall as fits on screen"
                            >
                                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                                <span className="hidden sm:inline">Tall</span>
                            </button>
                        </div>
                    </div>
                    <div
                        className={`flex w-full flex-col overflow-hidden ${CHAT_SURFACE_CLASS} border border-slate-200/90 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_48px_-16px_rgba(0,0,0,0.45)]`}
                        style={{ height: chatHeightPx }}
                    >
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <MissionChatroom missionId={report.id} messages={messages} onSendMessage={onSendMessage} hero={hero} />
                        </div>
                        <button
                            type="button"
                            aria-label={`Drag to resize chat height. Current height ${chatHeightPx} pixels.`}
                            onPointerDown={onChatResizePointerDown}
                            className="flex w-full shrink-0 cursor-ns-resize touch-none select-none items-center justify-center gap-0.5 border-t border-slate-200/90 bg-slate-200/70 py-2.5 text-slate-500 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100"
                        >
                            <GripVertical className="h-4 w-4 rotate-90 opacity-70" aria-hidden />
                        </button>
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
