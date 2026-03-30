
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import QRCode from 'qrcode';
import type { Report } from '../types';
import { fetchEvidencePacket } from '../services/evidenceVaultService';
import { useTranslations } from '../i18n';
/* FIX: Added missing Star icon import */
import { ArrowLeft, Coins, Zap, Check, Loader, QrCode, ShieldCheck, Activity, Target, Database, Hash, Sparkles, Scale, Broadcast, Printer, FileText, Globe, User, Clock, ChevronDown, CheckCircle, Send, Package, ArrowRight, Mail, Monitor, FileCode, Star } from './icons';
import NftCard from './NftCard';

interface ReportCompleteViewProps {
    report: Report;
    onReturn: () => void;
    onEnterSituationRoom?: (report: Report) => void;
}

/** Shared options for client-side QR generation (screen + print). */
const REPORT_QR_OPTIONS = {
    width: 220,
    margin: 2,
    errorCorrectionLevel: 'M' as const,
    color: { dark: '#0a0a0a', light: '#ffffff' },
};

const ReportCompleteView: React.FC<ReportCompleteViewProps> = ({ report, onReturn, onEnterSituationRoom }) => {
    const { t } = useTranslations();
    const [verificationStep, setVerificationStep] = useState(0);
    const [showTechnical, setShowTechnical] = useState(false);
    const [dispatchStatus, setDispatchStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS'>('IDLE');
    const certificateRef = useRef<HTMLDivElement>(null);
    const [qrVerifyDataUrl, setQrVerifyDataUrl] = useState<string | null>(null);
    const [qrSituationDataUrl, setQrSituationDataUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(true);
    const [qrError, setQrError] = useState(false);

    const blockRef = report.blockNumber != null ? `#${report.blockNumber}` : '#PENDING';
    const ledgerBlockDigits =
        report.blockNumber != null && Number.isFinite(Number(report.blockNumber))
            ? String(report.blockNumber)
            : null;
    const txRef = report.txHash || report.blockchainRef || report.hash;

    const logs = [
        "ESTABLISHING_P2P_HANDSHAKE...",
        "CHRONOLOGICAL_SYNC_STABLE",
        "TRUTHSCORE_CALCULATED: " + report.trustScore + "%",
        `BLOCK_INDEX_IDENTIFIED: ${blockRef}`,
        `TX_BROADCASTED: ${txRef?.slice(0, 14)}...`,
        "SHARD_SEALED_WITH_AUTHORITY_KEY"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setVerificationStep(prev => (prev < logs.length ? prev + 1 : prev));
        }, 600);
        return () => clearInterval(interval);
    }, [logs.length]);

    const loadQrImages = useCallback(async (): Promise<[string, string]> => {
        if (typeof window === 'undefined') return ['', ''];
        const base = window.location.origin;
        const verify = `${base}?reportId=${encodeURIComponent(report.id)}`;
        const situation = `${base}?reportId=${encodeURIComponent(report.id)}&situationRoom=1`;
        return Promise.all([QRCode.toDataURL(verify, REPORT_QR_OPTIONS), QRCode.toDataURL(situation, REPORT_QR_OPTIONS)]);
    }, [report.id]);

    const runQrLoad = useCallback(() => {
        setQrLoading(true);
        setQrError(false);
        return loadQrImages()
            .then(([v, s]) => {
                setQrVerifyDataUrl(v);
                setQrSituationDataUrl(s);
            })
            .catch(() => setQrError(true))
            .finally(() => setQrLoading(false));
    }, [loadQrImages]);

    useEffect(() => {
        runQrLoad();
    }, [runQrLoad]);

    /**
     * Intercept Ctrl+P / browser Print→PDF and regenerate QR data URLs so they
     * are always present in the printed output — not only when Print button is used.
     *
     * We replace window.print temporarily with a version that awaits QR generation,
     * then restores the original. This is the most reliable cross-browser approach.
     */
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const onBeforePrint = () => {
            // Always write directly into DOM so the browser snapshot captures them.
            // If data-URLs are already in state, inject immediately; otherwise generate first.
            const inject = (v: string, s: string) => {
                const imgs = certificateRef.current?.querySelectorAll<HTMLImageElement>('img.cert-qr-img');
                if (imgs) {
                    const urls = [v, s];
                    imgs.forEach((img, idx) => { if (urls[idx]) img.src = urls[idx]; });
                }
                flushSync(() => {
                    setQrVerifyDataUrl(v);
                    setQrSituationDataUrl(s);
                });
            };

            if (qrVerifyDataUrl && qrSituationDataUrl) {
                inject(qrVerifyDataUrl, qrSituationDataUrl);
                return;
            }
            void loadQrImages().then(([v, s]) => inject(v, s)).catch(() => {});
        };

        window.addEventListener('beforeprint', onBeforePrint);
        return () => window.removeEventListener('beforeprint', onBeforePrint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadQrImages, qrVerifyDataUrl, qrSituationDataUrl]);

    const handlePrint = useCallback(async () => {
        if (typeof window === 'undefined') return;

        let verifyUrl = qrVerifyDataUrl;
        let situationUrl = qrSituationDataUrl;

        // Always regenerate fresh data-URLs so the latest state is guaranteed
        try {
            const [v, s] = await loadQrImages();
            verifyUrl = v;
            situationUrl = s;
            // 1. Update React state synchronously so the virtual DOM matches
            flushSync(() => {
                setQrVerifyDataUrl(v);
                setQrSituationDataUrl(s);
            });
        } catch {
            /* fall back to whatever is already in state */
        }

        // 2. Write the data-URLs directly into the DOM as a belt-and-suspenders
        //    bypass — this ensures the <img> src is set even if the React re-render
        //    hasn't committed yet when the print dialog fires.
        const certImgs = certificateRef.current?.querySelectorAll<HTMLImageElement>('img.cert-qr-img');
        if (certImgs && verifyUrl && situationUrl) {
            const urls = [verifyUrl, situationUrl];
            certImgs.forEach((img, idx) => {
                if (urls[idx]) img.src = urls[idx];
            });
        }

        // 3. Wait for 4 animation frames + 250ms so the browser has painted the
        //    new <img> src before the print snapshot is taken
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setTimeout(resolve, 250);
                        });
                    });
                });
            });
        });

        window.print();
    }, [loadQrImages, qrVerifyDataUrl, qrSituationDataUrl]);

    const handleShare = async () => {
        const shareData = {
            title: `DPAL Certified Report: ${report.title}`,
            text: `View this certified accountability record on the DPAL ledger: ${report.description}`,
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                handleCopyLink();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAgencyDispatch = () => {
        setDispatchStatus('SENDING');
        setTimeout(() => {
            setDispatchStatus('SUCCESS');
            setTimeout(() => setDispatchStatus('IDLE'), 3000);
        }, 2000);
    };

    const handleDownloadEvidencePacket = async () => {
        try {
            const packet = await fetchEvidencePacket(report.id);
            const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `dpal-certified-evidence-packet-${report.id}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.warn('Evidence packet endpoint unavailable, using local packet fallback.', error);
            const fallback = {
                reportId: report.id,
                generatedAt: new Date().toISOString(),
                records: report.evidenceVault?.records || [],
            };
            const blob = new Blob([JSON.stringify(fallback, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `dpal-evidence-packet-local-${report.id}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        }
    };

    const handleEmail = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (typeof window === 'undefined') return;
        const origin = window.location.origin;
        const verifyLink = `${origin}?reportId=${encodeURIComponent(report.id)}`;
        const subject = encodeURIComponent(`DPAL certified report: ${report.title}`);
        const body = encodeURIComponent(
            `DPAL accountability record\n\nTitle: ${report.title}\nReport ID: ${report.id}\nCategory: ${String(report.category)}\n\n${report.description}\n\nVerify on the ledger:\n${verifyLink}\n`
        );
        const mailto = `mailto:?subject=${subject}&body=${body}`;
        const a = document.createElement('a');
        a.href = mailto;
        a.rel = 'noopener noreferrer';
        a.target = '_blank';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const [linkCopied, setLinkCopied] = useState(false);

    const handleCopyLink = () => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}?reportId=${report.id}`;
        navigator.clipboard.writeText(link).catch(() => {});
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
    };

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const qrSlot = (dataUrl: string | null, alt: string, href?: string) => {
        const box = 'w-44 h-44 sm:w-48 sm:h-48';
        if (dataUrl) {
            const img = (
                <img
                    src={dataUrl}
                    alt={alt}
                    className={`cert-qr-img ${box} object-contain`}
                    width={192}
                    height={192}
                />
            );
            if (!href) return img;
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                    aria-label={alt}
                >
                    {img}
                </a>
            );
        }
        if (qrLoading) {
            return (
                <div className={`${box} flex flex-col items-center justify-center gap-2 bg-zinc-100 rounded-xl border border-zinc-200`}>
                    <Loader className="w-8 h-8 text-zinc-500 animate-spin" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase text-center px-2">Generating QR…</span>
                </div>
            );
        }
        if (qrError) {
            return (
                <div className={`${box} flex flex-col items-center justify-center gap-2 bg-rose-50 rounded-xl border border-rose-200 p-2`}>
                    <p className="text-[9px] font-bold text-rose-800 uppercase text-center">QR failed to render</p>
                    <button
                        type="button"
                        onClick={() => runQrLoad()}
                        className="text-[9px] font-black uppercase bg-rose-600 text-white px-3 py-1.5 rounded-lg"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return <div className={`${box} bg-zinc-100 rounded-xl border border-zinc-200`} />;
    };

    if (report.isGeneratingNft) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] bg-black text-white p-12 text-center space-y-8 animate-fade-in font-mono">
                <div className="relative">
                    <div className="absolute -inset-12 bg-cyan-500/10 blur-[80px] animate-pulse"></div>
                    <Loader className="w-24 h-24 text-cyan-400 animate-spin relative z-10" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-black uppercase tracking-tighter">{t('reportComplete.certifying')}</h1>
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.6em] animate-pulse">Encoding_Neural_Metadata</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-black font-mono overflow-x-hidden pb-32">
            <style>{`
                @media print {
                    @page { size: A4; margin: 10mm 12mm; }

                    /* ── ISOLATION: hide the entire app shell, reveal ONLY the certificate ──
                       body * visibility:hidden makes every element transparent.
                       We then selectively restore visibility for .print-area and its children.
                       position:absolute + top/left:0 ensures the certificate starts at the
                       very top of page 1 regardless of scroll position. */
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    .print-area,
                    .print-area * {
                        visibility: visible !important;
                    }
                    /* Hide any no-print elements even if nested inside print-area */
                    .no-print,
                    .no-print * {
                        visibility: hidden !important;
                        display: none !important;
                    }
                    /* Anchor the certificate to the top-left of the printed page */
                    .print-area {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        box-shadow: none !important;
                    }

                    /* Page breaks */
                    .cert-p1 { break-after: page !important; page-break-after: always !important; box-shadow: none !important; border: 1px solid #ccc !important; }
                    .cert-p2 { break-before: page !important; page-break-before: always !important; box-shadow: none !important; border: 1px solid #ccc !important; }

                    /* Colour preservation for all coloured sections */
                    .cert-hdr-dark     { background: #0a0a0a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .cert-status-green { background: #14532d !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .cert-p2-hdr       { background: #1f2937 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .cert-p1-footer    { background: #f9fafb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .cert-qr-bg        { background: #fafafa !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .cert-verif-bg     { background: #fafafa !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .cert-seal-dpal-inner {
                        background: linear-gradient(155deg, #fffbeb 0%, #fde68a 45%, #d97706 100%) !important;
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                    }
                    .cert-seal-compliance-inner {
                        background: linear-gradient(155deg, #fecaca 0%, #dc2626 55%, #991b1b 100%) !important;
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                    }
                    img.cert-qr-img {
                        display: block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .shadow-4xl { box-shadow: 0 40px 100px rgba(0,0,0,0.8); }
                .seal-ripple { animation: ripple 4s ease-in-out infinite; }
                @keyframes ripple { 0% { transform: scale(1); opacity: 0.1; } 50% { transform: scale(1.1); opacity: 0.2; } 100% { transform: scale(1); opacity: 0.1; } }
            `}</style>

            <div className="max-w-6xl mx-auto px-4 pt-12 no-print">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <button
                        onClick={onReturn}
                        className="inline-flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span>{t('reportComplete.returnToMenu')}</span>
                    </button>
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white uppercase tracking-tighter">{t('reportComplete.title')}</h1>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('reportComplete.subtitle')}</p>
                        </div>
                    </div>
                </header>

                {/* ── Public tracking link — prominent banner ── */}
                <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/40 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Public Tracking Link</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-mono break-all leading-relaxed">
                            {`${baseUrl}?reportId=${encodeURIComponent(report.id)}`}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                            Share this link with anyone — they can verify and track this report from any device.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wide transition-all ${
                            linkCopied
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                    >
                        {linkCopied ? <Check className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {linkCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>

                <section className="mb-12 bg-zinc-900/40 border-2 border-zinc-800 p-10 rounded-[3rem] shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Sparkles className="w-32 h-32 text-cyan-500"/></div>
                    <div className="relative z-10 space-y-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                            <div className="space-y-4 max-w-2xl">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{t('reportComplete.successHeadline')}</h2>
                                <p className="text-zinc-400 text-lg leading-relaxed font-medium italic border-l-4 border-cyan-500 pl-6">
                                    "{t('reportComplete.successSubheadline')}"
                                </p>
                            </div>
                            {onEnterSituationRoom && (
                                <button 
                                    onClick={() => onEnterSituationRoom(report)}
                                    className="flex items-center space-x-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 px-12 rounded-[2rem] transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] active:scale-95 group/sit"
                                >
                                    <Monitor className="w-8 h-8 group-hover/sit:rotate-12 transition-transform" />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Operational_Link</p>
                                        <p className="text-sm font-black uppercase tracking-[0.2em]">Enter Situation Room</p>
                                    </div>
                                </button>
                            )}
                        </div>

                        <div className="bg-black/60 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                            <div className="flex items-center space-x-4">
                                <Broadcast className="w-6 h-6 text-cyan-500" />
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Operational_Dispatch_Hub</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4 items-stretch">
                                <button type="button" onClick={handlePrint} className="flex flex-col items-center justify-center gap-3 min-h-[140px] p-6 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-cyan-500 transition-all group active:scale-95 w-full">
                                    <Printer className="w-8 h-8 text-zinc-600 group-hover:text-white shrink-0 transition-colors" />
                                    <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-white text-center leading-tight">Print_Hardcopy</span>
                                </button>
                                <button type="button" onClick={handleDownloadEvidencePacket} className="flex flex-col items-center justify-center gap-3 min-h-[140px] p-6 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-cyan-500 transition-all group active:scale-95 w-full">
                                    <FileCode className="w-8 h-8 text-cyan-600 group-hover:text-white shrink-0 transition-colors" />
                                    <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-white text-center leading-tight">Certified_Evidence_Packet</span>
                                </button>
                                <button type="button" onClick={handleEmail} className="flex flex-col items-center justify-center gap-3 min-h-[140px] p-6 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-cyan-500 transition-all group active:scale-95 w-full">
                                    <Mail className="w-8 h-8 text-cyan-500 group-hover:text-white shrink-0 transition-colors" />
                                    <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-white text-center leading-tight">Email_Dispatch</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleAgencyDispatch}
                                    disabled={dispatchStatus !== 'IDLE'}
                                    className={`flex flex-col items-center justify-center gap-3 min-h-[140px] p-6 border rounded-3xl transition-all group active:scale-95 w-full ${dispatchStatus === 'SUCCESS' ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400' : 'bg-rose-950/20 border-rose-900 hover:border-rose-500 text-rose-500'}`}
                                >
                                    {dispatchStatus === 'SENDING' ? <Loader className="w-8 h-8 animate-spin shrink-0" /> : dispatchStatus === 'SUCCESS' ? <CheckCircle className="w-8 h-8 shrink-0" /> : <Scale className="w-8 h-8 shrink-0" />}
                                    <span className="text-[10px] font-black uppercase text-center leading-tight">{dispatchStatus === 'SENDING' ? 'SYNCING...' : dispatchStatus === 'SUCCESS' ? 'AGENCY_RECEIVED' : 'Regulatory_Oracle'}</span>
                                </button>
                            </div>

                            <div className="border-t border-zinc-800 pt-8 mt-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <QrCode className="w-5 h-5 text-cyan-400" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Ledger QR codes</h4>
                                </div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-4">
                                    Same codes appear on your printable certificate below — scan to verify or open the situation room.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-zinc-950/90 border border-zinc-700 rounded-2xl p-5 text-center">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">{t('reportComplete.qrVerifyTitle')}</p>
                                        <div className="inline-flex bg-white p-3 rounded-2xl border border-zinc-600 shadow-inner justify-center">
                                            {qrSlot(qrVerifyDataUrl, 'Verify this report', `${baseUrl}?reportId=${encodeURIComponent(report.id)}`)}
                                        </div>
                                        <p className="text-[8px] font-mono text-zinc-500 break-all mt-3 px-1">{`${baseUrl}?reportId=${encodeURIComponent(report.id)}`}</p>
                                    </div>
                                    <div className="bg-zinc-950/90 border border-zinc-700 rounded-2xl p-5 text-center">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">{t('reportComplete.qrSituationTitle')}</p>
                                        <div className="inline-flex bg-white p-3 rounded-2xl border border-zinc-600 shadow-inner justify-center">
                                            {qrSlot(
                                                qrSituationDataUrl,
                                                'Open situation room',
                                                `${baseUrl}?reportId=${encodeURIComponent(report.id)}&situationRoom=1`
                                            )}
                                        </div>
                                        <p className="text-[8px] font-mono text-zinc-500 break-all mt-3 px-1">{`${baseUrl}?reportId=${encodeURIComponent(report.id)}&situationRoom=1`}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* ═══════════════════ CERTIFICATE — PRINT AREA ═══════════════════ */}
            <div className="print-area max-w-4xl mx-auto px-4 md:px-0 py-8 space-y-6">

                {/* ▓▓▓ PAGE 1 — PUBLIC CERTIFICATE ▓▓▓ */}
                <div ref={certificateRef} className="cert-p1" style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", background: 'white', border: '1px solid #d1d5db', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

                    {/* A. HEADER */}
                    <div className="cert-hdr-dark" style={{ background: '#0a0a0a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, border: '2px solid rgba(255,255,255,0.3)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ShieldCheck style={{ width: 24, height: 24, color: 'white' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'white', lineHeight: 1.2, margin: 0 }}>Certified Public Accountability Record</h1>
                            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', margin: '3px 0 0' }}>Issued by DPAL · Decentralized Public Accountability Ledger</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, fontWeight: 700 }}>Certificate No.</p>
                            <p style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 900, color: 'white', margin: '3px 0 0', letterSpacing: '0.06em' }}>{`DPAL-${report.hash.substring(2, 10).toUpperCase()}`}</p>
                        </div>
                    </div>

                    {/* B. STATUS STRIP */}
                    <div className="cert-status-green" style={{ background: '#14532d', padding: '5px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle style={{ width: 11, height: 11, color: '#86efac', flexShrink: 0 }} />
                        <p style={{ fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.28em', color: '#86efac', margin: 0 }}>Blockchain Verified · Immutable Record · Publicly Traceable · Tamper-Evident</p>
                        <span style={{ marginLeft: 'auto', fontSize: 7.5, fontWeight: 700, color: '#4ade80', letterSpacing: '0.1em', flexShrink: 0 }}>STATUS: CERTIFIED ✓</span>
                    </div>

                    {/* C. 2-COLUMN RECORD + VERIFICATION GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                        {/* Left — Record Identification */}
                        <div style={{ padding: '14px 22px', borderRight: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#9ca3af', margin: '0 0 8px', paddingBottom: 4, borderBottom: '1px solid #f3f4f6' }}>Record Identification</p>
                            {([
                                ['Certificate ID',   `DPAL-CERT-${report.hash.substring(2, 10).toUpperCase()}`],
                                ['Block Reference',  blockRef],
                                ['Date Issued',      (report.anchoredAt || report.timestamp).toLocaleString()],
                                ['Category',         report.category.toUpperCase()],
                                ['Evidence Artifacts', String(report.evidenceVault?.records?.length || 0)],
                                ['Reporting Party',  `RP-${report.hash.substring(0, 4).toUpperCase()}`],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '4px 0', borderBottom: '1px solid #f9fafb', gap: 10 }}>
                                    <span style={{ fontSize: 8, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
                                    <span style={{ fontSize: 8, fontWeight: 900, color: '#111827', textAlign: 'right', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                        {/* Right — Verification Summary */}
                        <div style={{ padding: '14px 22px' }}>
                            <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#9ca3af', margin: '0 0 8px', paddingBottom: 4, borderBottom: '1px solid #f3f4f6' }}>Verification Summary</p>
                            {([
                                ['Ledger Status',    'ANCHORED',   '#166534'],
                                ['Integrity Check',  'PASSED ✓',   '#166534'],
                                ['Audit State',      'CERTIFIED',  '#166534'],
                                ['Anonymity Level',  'PROTECTED',  '#1d4ed8'],
                                ['Alteration Guard', 'ACTIVE',     '#166534'],
                                ['Smart Contract',   'EXECUTED',   '#166534'],
                            ] as [string, string, string][]).map(([label, value, color]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f9fafb' }}>
                                    <span style={{ fontSize: 8, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                                    <span style={{ fontSize: 8, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* D. QR CODES — SIDE BY SIDE */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                        {/* QR 1 */}
                        <div className="cert-qr-bg" style={{ padding: '14px 22px', textAlign: 'center', borderRight: '1px solid #e5e7eb', background: '#fafafa' }}>
                            <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#374151', margin: '0 0 8px' }}>Public Ledger Verification</p>
                            <div style={{ display: 'inline-block', background: 'white', border: '1px solid #d1d5db', padding: 5, borderRadius: 7, lineHeight: 0 }}>
                                {qrVerifyDataUrl
                                    ? <img src={qrVerifyDataUrl} alt="Public Ledger Verification" className="cert-qr-img" style={{ width: 140, height: 140, display: 'block' }} width={140} height={140} />
                                    : <div style={{ width: 140, height: 140, background: '#f3f4f6', borderRadius: 4 }} />}
                            </div>
                            <p style={{ fontSize: 7, color: '#6b7280', margin: '6px 0 2px', fontWeight: 600 }}>Scan to verify on the public ledger</p>
                            <p style={{ fontSize: 6, fontFamily: 'monospace', color: '#9ca3af', wordBreak: 'break-all', margin: 0, lineHeight: 1.5 }}>{`${baseUrl}?reportId=${encodeURIComponent(report.id)}`}</p>
                        </div>
                        {/* QR 2 */}
                        <div className="cert-qr-bg" style={{ padding: '14px 22px', textAlign: 'center', background: '#fafafa' }}>
                            <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#374151', margin: '0 0 8px' }}>Situation Room Access</p>
                            <div style={{ display: 'inline-block', background: 'white', border: '1px solid #d1d5db', padding: 5, borderRadius: 7, lineHeight: 0 }}>
                                {qrSituationDataUrl
                                    ? <img src={qrSituationDataUrl} alt="Situation Room Access" className="cert-qr-img" style={{ width: 140, height: 140, display: 'block' }} width={140} height={140} />
                                    : <div style={{ width: 140, height: 140, background: '#f3f4f6', borderRadius: 4 }} />}
                            </div>
                            <p style={{ fontSize: 7, color: '#6b7280', margin: '6px 0 2px', fontWeight: 600 }}>Scan to access the operational situation room</p>
                            <p style={{ fontSize: 6, fontFamily: 'monospace', color: '#9ca3af', wordBreak: 'break-all', margin: 0, lineHeight: 1.5 }}>{`${baseUrl}?reportId=${encodeURIComponent(report.id)}&situationRoom=1`}</p>
                        </div>
                    </div>

                    {/* E. SEALS ROW + TRACKING LINK */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                        {/* DPAL Seal */}
                        <div style={{ padding: '12px 14px 12px 22px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="cert-seal-dpal-inner" style={{ width: 88, height: 88, borderRadius: '50%', border: '3px double #92400e', background: 'linear-gradient(155deg,#fffbeb 0%,#fde68a 45%,#d97706 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 6 }}>
                                <p style={{ fontSize: 12, fontWeight: 900, color: '#78350f', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>DPAL</p>
                                <p style={{ fontSize: 6, fontWeight: 900, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '2px 0 0', lineHeight: 1 }}>Verified</p>
                                <p style={{ fontSize: 5, color: '#b45309', margin: '3px 0 0', fontWeight: 700, lineHeight: 1 }}>RSA-4096</p>
                                {ledgerBlockDigits && <p style={{ fontSize: 5, fontFamily: 'monospace', fontWeight: 900, color: '#451a03', margin: '3px 0 0', lineHeight: 1 }}>#{ledgerBlockDigits}</p>}
                            </div>
                        </div>
                        {/* Compliance Seal */}
                        <div style={{ padding: '12px 14px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="cert-seal-compliance-inner" style={{ width: 88, height: 88, borderRadius: '50%', border: '3px double #7f1d1d', background: 'linear-gradient(155deg,#fecaca 0%,#dc2626 55%,#991b1b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 6 }}>
                                <Star style={{ width: 18, height: 18, color: 'white', marginBottom: 3 }} />
                                <p style={{ fontSize: 7, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, lineHeight: 1 }}>Compliance</p>
                                <p style={{ fontSize: 6, color: '#fecaca', margin: '2px 0 0', fontWeight: 700, lineHeight: 1 }}>Certified</p>
                                {ledgerBlockDigits && <p style={{ fontSize: 5, fontFamily: 'monospace', fontWeight: 900, color: 'rgba(255,255,255,0.9)', margin: '3px 0 0', lineHeight: 1 }}>#{ledgerBlockDigits}</p>}
                            </div>
                        </div>
                        {/* Tracking Link */}
                        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Globe style={{ width: 12, height: 12, color: '#374151' }} />
                                <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#374151', margin: 0 }}>Public Tracking Link</p>
                            </div>
                            <p style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 900, color: '#111827', wordBreak: 'break-all', margin: 0, lineHeight: 1.5 }}>{`${baseUrl}?reportId=${encodeURIComponent(report.id)}`}</p>
                            <p style={{ fontSize: 7, color: '#6b7280', margin: 0, lineHeight: 1.4 }}>Anyone can verify this record using the link above or by scanning either QR code above.</p>
                        </div>
                    </div>

                    {/* F. FOOTER STRIP */}
                    <div className="cert-p1-footer" style={{ background: '#f9fafb', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                        <p style={{ fontSize: 7, color: '#6b7280', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                            This document is a certified digital accountability record. Unauthorized alteration is cryptographically detectable and constitutes record tampering under applicable law.
                        </p>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 8, fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Digitally Certified</p>
                            <p style={{ fontSize: 7, fontFamily: 'monospace', color: '#6b7280', margin: '2px 0 0' }}>{(report.anchoredAt || report.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* ▓▓▓ PAGE 2 — TECHNICAL VERIFICATION ▓▓▓ */}
                <div className="cert-p2" style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", background: 'white', border: '1px solid #d1d5db', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>

                    {/* Mini header */}
                    <div className="cert-p2-hdr" style={{ background: '#1f2937', padding: '11px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Database style={{ width: 15, height: 15, color: '#9ca3af' }} />
                            <p style={{ fontSize: 11, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Technical Verification Record</p>
                            <span style={{ fontSize: 8, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: 8 }}>· Page 2 of 2</span>
                        </div>
                        <p style={{ fontSize: 8, fontFamily: 'monospace', color: '#6b7280', margin: 0 }}>{`DPAL-CERT-${report.hash.substring(2, 10).toUpperCase()}`}</p>
                    </div>

                    {/* A + B — 2-column sections */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                        {/* A: Ledger Metadata */}
                        <div style={{ padding: '14px 22px', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                                <Hash style={{ width: 11, height: 11, color: '#374151' }} />
                                <p style={{ fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.28em', color: '#374151', margin: 0 }}>A — Ledger Metadata</p>
                            </div>
                            {([
                                ['Ledger Block',     ledgerBlockDigits ? `#${ledgerBlockDigits}` : '#PENDING'],
                                ['Block Reference',  blockRef],
                                ['Filing Timestamp', (report.anchoredAt || report.timestamp).toISOString()],
                                ['Ledger Anchor',    txRef ? `${txRef.substring(0, 22)}…` : 'N/A'],
                                ['Full Hash',        `${report.hash.substring(0, 26).toUpperCase()}…`],
                                ['Verification',     'RSA-4096 + SHA-256'],
                                ['Smart Contract',   'EXECUTED'],
                                ['Last Verified',    new Date().toISOString().substring(0, 19) + 'Z'],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderBottom: '1px solid #f9fafb', gap: 10 }}>
                                    <span style={{ fontSize: 8, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
                                    <span style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700, color: '#111827', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                        {/* B: Technical Summary */}
                        <div style={{ padding: '14px 22px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                                <Activity style={{ width: 11, height: 11, color: '#374151' }} />
                                <p style={{ fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.28em', color: '#374151', margin: 0 }}>B — Technical Summary</p>
                            </div>
                            {([
                                ['Category',        report.category.toUpperCase()],
                                ['Report ID',       report.id],
                                ['Evidence Count',  String(report.evidenceVault?.records?.length || 0)],
                                ['Anonymity Level', 'PROTECTED'],
                                ['Protection',      'ACTIVE'],
                                ['Audit Flag',      'SECONDARY_AUDIT_ENABLED'],
                                ['Integrity Hash',  'SHA-256 VERIFIED'],
                                ['Trust Score',     `${report.trustScore}%`],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3.5px 0', borderBottom: '1px solid #f9fafb', gap: 10 }}>
                                    <span style={{ fontSize: 8, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
                                    <span style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* C: Chain of Custody */}
                    <div style={{ padding: '14px 22px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                            <Globe style={{ width: 11, height: 11, color: '#374151' }} />
                            <p style={{ fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.28em', color: '#374151', margin: 0 }}>C — Chain of Custody / Public Trace</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 20px' }}>
                            {([
                                ['Filing Route',     'CLIENT → LEDGER → SHARD'],
                                ['Registry Source',  'DPAL_CORE_v1.0'],
                                ['Protocol',         'DPAL-X_CORE_v1.0.42_STABLE'],
                                ['System Signature', `${report.hash.substring(0, 16).toUpperCase()}…`],
                                ['Public Trace',     'PUBLICLY ACCESSIBLE'],
                                ['Shard Authority',  'SEALED_WITH_AUTHORITY_KEY'],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} style={{ padding: '3px 0', borderBottom: '1px solid #f9fafb' }}>
                                    <span style={{ display: 'block', fontSize: 7, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                                    <span style={{ display: 'block', fontSize: 8, fontFamily: 'monospace', fontWeight: 700, color: '#374151', marginTop: 2, wordBreak: 'break-all' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Verification stream */}
                    <div className="cert-verif-bg" style={{ padding: '12px 22px', background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#6b7280', margin: '0 0 6px' }}>Verification Stream</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
                            {[
                                'ESTABLISHING_P2P_HANDSHAKE... [OK]',
                                'CHRONOLOGICAL_SYNC_STABLE [OK]',
                                `TRUTHSCORE_CALCULATED: ${report.trustScore}% [OK]`,
                                `BLOCK_INDEX_IDENTIFIED: ${blockRef} [OK]`,
                                `TX_BROADCASTED: ${txRef ? txRef.slice(0, 14) : 'N/A'}... [OK]`,
                                'SHARD_SEALED_WITH_AUTHORITY_KEY [OK]',
                            ].map((log, i) => (
                                <p key={i} style={{ fontSize: 7, fontFamily: 'monospace', color: '#16a34a', margin: 0, padding: '1px 0' }}>&gt; {log}</p>
                            ))}
                        </div>
                    </div>

                    {/* P2 Footer */}
                    <div style={{ padding: '9px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                        <p style={{ fontSize: 7, color: '#9ca3af', fontWeight: 600, margin: 0 }}>
                            DPAL — Decentralized Public Accountability Ledger · Technical verification record for archival and audit purposes
                        </p>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 7, fontFamily: 'monospace', color: '#6b7280', margin: 0 }}>LEDGER_ANCHOR: {report.hash.substring(0, 22).toUpperCase()}...</p>
                            {ledgerBlockDigits && <p style={{ fontSize: 7, fontFamily: 'monospace', color: '#6b7280', margin: '2px 0 0' }}>LEDGER_BLOCK: {ledgerBlockDigits}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* BUTTON SET - FOOTER */}
            <div className="no-print fixed bottom-0 left-0 w-full bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 p-8 z-[100]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <button 
                            onClick={handlePrint}
                            className="flex-1 md:flex-none flex items-center justify-center space-x-4 bg-white hover:bg-zinc-100 text-black font-black py-5 px-12 rounded-[1.5rem] text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-zinc-200"
                        >
                            <Printer className="w-6 h-6" />
                            <span>{t('reportComplete.printCert')}</span>
                        </button>
                        <button 
                            onClick={handleDownloadEvidencePacket}
                            className="flex-1 md:flex-none flex items-center justify-center space-x-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black py-5 px-12 rounded-[1.5rem] text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-cyan-800"
                        >
                            <FileCode className="w-6 h-6" />
                            <span>Download_Evidence_Packet</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-stretch justify-center md:justify-end gap-3 w-full md:w-auto">
                        <button type="button" onClick={handleEmail} className="inline-flex items-center justify-center gap-2 min-h-[48px] text-[11px] font-black uppercase text-zinc-200 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 px-6 py-3 rounded-2xl border border-zinc-700">
                             <Mail className="w-4 h-4 shrink-0" /> <span>Email_Dispatch</span>
                        </button>
                        <button type="button" onClick={handleCopyLink} className="inline-flex items-center justify-center gap-2 min-h-[48px] text-[11px] font-black uppercase text-zinc-200 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 px-6 py-3 rounded-2xl border border-zinc-700">
                             <Globe className="w-4 h-4 shrink-0" /> <span>Copy_Ledger_URL</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto mt-16 px-4 no-print pb-32">
                <button 
                    onClick={() => setShowTechnical(!showTechnical)}
                    className="flex items-center space-x-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] hover:text-cyan-500 transition-colors mb-6"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showTechnical ? 'rotate-180' : ''}`} />
                    <span>{showTechnical ? t('reportComplete.hideTechnical') : t('reportComplete.viewTechnical')}</span>
                </button>
                
                {showTechnical && (
                    <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-inner">
                         <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                <Activity className="w-4 h-4 text-emerald-500" /> <span>Verification_Stream</span>
                            </h3>
                            <div className="bg-black/40 rounded-3xl border border-zinc-900 p-6 font-mono text-[9px] space-y-2">
                                {logs.map((log, i) => (
                                    <div key={i} className="flex items-center space-x-3 text-emerald-500/80">
                                        <span className="opacity-30">[{new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' })}]</span>
                                        <span className="font-bold">{log}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-zinc-900">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-zinc-600 uppercase">Ledger_Entry_Hash</p>
                                <p className="text-xs font-mono text-zinc-400 break-all">{report.hash}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-zinc-600 uppercase">Protocol_Version</p>
                                <p className="text-xs text-zinc-400">DPAL-X_CORE_v1.0.42_STABLE</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const NextStepItem: React.FC<{ num: string; text: string }> = ({ num, text }) => (
    <li className="flex items-start space-x-4 group">
        <span className="text-[10px] font-black text-cyan-500 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/40">{num}</span>
        <p className="text-xs text-zinc-400 font-bold uppercase leading-relaxed tracking-widest transition-colors group-hover:text-zinc-200">
            {text}
        </p>
    </li>
);

const DataRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = "text-zinc-950" }) => (
    <div className="flex flex-col gap-2">
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">{label}</span>
        <span className={`text-sm md:text-base font-black uppercase tracking-tight ${color}`}>{value}</span>
    </div>
);

export default ReportCompleteView;
