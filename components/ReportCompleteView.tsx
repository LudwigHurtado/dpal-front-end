
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

    /** Best-effort refresh when user uses Ctrl+P / browser Print→PDF (not only the Print button). */
    useEffect(() => {
        const onBeforePrint = () => {
            void loadQrImages()
                .then(([v, s]) => {
                    flushSync(() => {
                        setQrVerifyDataUrl(v);
                        setQrSituationDataUrl(s);
                    });
                })
                .catch(() => {});
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeprint', onBeforePrint);
            return () => window.removeEventListener('beforeprint', onBeforePrint);
        }
        return undefined;
    }, [loadQrImages]);

    const handlePrint = useCallback(async () => {
        if (typeof window === 'undefined') return;
        try {
            const [v, s] = await loadQrImages();
            flushSync(() => {
                setQrVerifyDataUrl(v);
                setQrSituationDataUrl(s);
            });
        } catch {
            /* keep existing QR state if generation fails */
        }
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        });
        window.print();
    }, [loadQrImages]);

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

    const handleCopyLink = () => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}?reportId=${report.id}`;
        navigator.clipboard.writeText(link);
        alert("Verification link copied to clipboard.");
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
                    @page { size: A4; margin: 14mm 12mm; }
                    body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
                    .no-print { display: none !important; }
                    .print-area { 
                        display: block !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        background: white !important; 
                        border: none !important; 
                        box-shadow: none !important; 
                    }
                    .cert-print-header {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 14px !important;
                        padding-bottom: 16px !important;
                        margin-bottom: 20px !important;
                    }
                    .cert-print-header-inner {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 12px !important;
                    }
                    .cert-print-validation {
                        width: 100% !important;
                        align-items: flex-start !important;
                        text-align: left !important;
                    }
                    .cert-qr-block {
                        overflow: visible !important;
                    }
                    img.cert-qr-img {
                        display: block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        max-width: 200px !important;
                        height: auto !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Certificate stamps: preserve gold / red on PDF (override blanket grayscale rules below) */
                    .certificate-frame .cert-stamp-dpal {
                        background: linear-gradient(155deg, #fffbeb 0%, #fde68a 45%, #d97706 100%) !important;
                        border: 6px double #92400e !important;
                        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35) !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .certificate-frame .cert-stamp-dpal .cert-stamp-dpal-brand {
                        color: #78350f !important;
                        text-shadow: 0 1px 0 rgba(255,255,255,0.35) !important;
                    }
                    .certificate-frame .cert-stamp-dpal .cert-stamp-dpal-sub,
                    .certificate-frame .cert-stamp-dpal .cert-stamp-dpal-micro {
                        color: #92400e !important;
                    }
                    .certificate-frame .cert-stamp-dpal .cert-stamp-dpal-blocknum {
                        color: #451a03 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .certificate-frame .cert-stamp-compliance {
                        background: linear-gradient(160deg, #fecaca 0%, #dc2626 55%, #991b1b 100%) !important;
                        border: 6px double #7f1d1d !important;
                        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2) !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .certificate-frame .cert-stamp-compliance .cert-stamp-compliance-title,
                    .certificate-frame .cert-stamp-compliance .cert-stamp-compliance-sub {
                        color: #ffffff !important;
                    }
                    .certificate-frame .cert-stamp-compliance .cert-stamp-compliance-micro {
                        color: #fecaca !important;
                    }
                    .certificate-frame .cert-stamp-compliance .cert-stamp-compliance-block {
                        color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .certificate-frame { 
                        border: 3px solid #000 !important; 
                        color: black !important; 
                        margin: 0 !important; 
                        padding: 12mm !important;
                        min-height: auto !important;
                        height: auto !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        page-break-inside: auto !important;
                        overflow: visible !important;
                    }
                    .bg-zinc-950, .bg-zinc-900, .bg-black, .bg-zinc-50 { background: white !important; color: black !important; }
                    .text-white, .text-zinc-400, .text-zinc-500, .text-zinc-900 { color: black !important; }
                    .shadow-2xl, .shadow-3xl, .shadow-4xl, .shadow-xl { box-shadow: none !important; }
                    .border-zinc-800, .border-zinc-900, .border-zinc-100 { border-color: #000 !important; }
                    .bg-emerald-100 { background: #f0fdf4 !important; border: 1px solid #166534 !important; }
                    .text-emerald-800 { color: #166534 !important; }
                    .grayscale, .opacity-40, .opacity-60, .opacity-5, .opacity-80 { filter: none !important; opacity: 1 !important; }
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

            {/* THE FORMAL CERTIFICATE - PRINT AREA */}
            <div className="print-area max-w-5xl mx-auto px-4 md:px-0">
                <div ref={certificateRef} className="certificate-frame bg-white text-zinc-950 border-[20px] border-double border-zinc-900 rounded-none shadow-4xl p-10 md:p-24 flex flex-col min-h-[1050px] relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[length:24px_24px] opacity-10 no-print"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-50 rounded-full -mr-48 -mt-48 opacity-20 no-print"></div>
                    
                    {/* A. Certificate Header — stacked for print so validation badge is never clipped */}
                    <header className="cert-print-header cert-print-header-inner border-b-[6px] border-zinc-900 pb-8 mb-10 md:pb-10 md:mb-12 flex flex-col gap-6 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-6 min-w-0 w-full">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-950 flex items-center justify-center rounded-[2rem] shadow-xl shrink-0">
                                <ShieldCheck className="w-11 h-11 sm:w-14 sm:h-14 text-white" />
                            </div>
                            <div className="text-left space-y-2 min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight">{t('reportComplete.certTitle')}</h1>
                                <p className="text-[10px] sm:text-[11px] font-black text-zinc-500 uppercase tracking-[0.35em] sm:tracking-[0.5em] leading-snug">{t('reportComplete.certSubtext')}</p>
                            </div>
                        </div>
                        <div className="cert-print-validation flex flex-col gap-2 w-full border border-emerald-200 bg-emerald-50/80 rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
                            <div className="text-[9px] font-black text-emerald-800/80 uppercase tracking-widest">{t('reportComplete.statusLabel')}</div>
                            <div className="text-[10px] sm:text-[11px] font-black text-emerald-900 uppercase tracking-wide leading-snug">
                                {t('reportComplete.statusValue')}
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-20 flex-grow relative z-10">
                        <div className="md:col-span-8 space-y-16">
                            {/* B. Record Identification */}
                            <section>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-400 mb-8 flex items-center gap-4">
                                    <Target className="w-5 h-5 text-zinc-950"/> <span>{t('reportComplete.recordId')}</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-x-16 gap-y-8 bg-zinc-50/50 border border-zinc-100 p-10 rounded-[2.5rem]">
                                    <DataRow label={t('reportComplete.certIdLabel')} value={`DPAL-CERT-${report.hash.substring(2, 10).toUpperCase()}`} />
                                    <DataRow label={t('reportComplete.blockRefLabel')} value={blockRef} />
                                    <DataRow label={t('reportComplete.dateIssuedLabel')} value={(report.anchoredAt || report.timestamp).toLocaleString()} />
                                    <DataRow label={t('reportComplete.categoryLabel')} value={report.category.toUpperCase()} />
                                    <DataRow label={'Evidence Artifacts'} value={`${report.evidenceVault?.records?.length || 0}`} />
                                </div>
                            </section>

                            {/* C. Verification & Integrity */}
                            <section>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-400 mb-8 flex items-center gap-4">
                                    <Hash className="w-5 h-5 text-zinc-950"/> <span>{t('reportComplete.integritySection')}</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-x-16 gap-y-8 px-4">
                                    <DataRow label={t('reportComplete.ledgerStatus')} value={t('reportComplete.ledgerStatusValue')} />
                                    <DataRow label={t('reportComplete.integrityCheck')} value={t('reportComplete.integrityCheckValue')} />
                                    <DataRow label={t('reportComplete.protectionLabel')} value={t('reportComplete.protectionValue')} />
                                    <DataRow label={t('reportComplete.anonymityLabel')} value={t('reportComplete.anonymityValue')} />
                                </div>
                            </section>

                            {/* D. Verification Stamps — gold DPAL + red compliance (same URLs as sidebar QRs for all categories) */}
                            <section className="pt-8">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-6">Certification Stamps</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div
                                        className="cert-stamp-dpal rounded-full w-56 h-56 mx-auto flex flex-col items-center justify-center text-center p-4 border-[6px] border-double border-amber-800 bg-gradient-to-br from-amber-50 via-amber-200 to-amber-600 shadow-inner"
                                        aria-label="DPAL verified stamp"
                                    >
                                        <p className="cert-stamp-dpal-brand text-2xl font-black tracking-tighter text-amber-950 leading-none mb-1">DPAL</p>
                                        <p className="cert-stamp-dpal-sub text-[9px] font-black uppercase tracking-[0.35em] text-amber-900">Verified</p>
                                        <ShieldCheck className="w-8 h-8 text-amber-800 mt-1.5 mb-0.5 drop-shadow-sm" />
                                        <p className="cert-stamp-dpal-micro text-[7px] font-black uppercase tracking-widest text-amber-900/90 mt-0.5">RSA-4096</p>
                                        <p className="cert-stamp-dpal-micro text-[7px] font-black uppercase tracking-[0.2em] text-amber-900/80 mt-1">
                                            {t('reportComplete.stampLedgerBlockLine')}
                                        </p>
                                        <p className="cert-stamp-dpal-blocknum font-mono text-sm font-black tabular-nums text-amber-950 leading-tight mt-0.5 px-1">
                                            {ledgerBlockDigits ?? t('reportComplete.stampLedgerPending')}
                                        </p>
                                    </div>
                                    <div
                                        className="cert-stamp-compliance rounded-full w-56 h-56 mx-auto flex flex-col items-center justify-center text-center p-5 border-[6px] border-double border-red-900 bg-gradient-to-br from-red-300 via-red-600 to-red-900 shadow-inner"
                                        aria-label="Compliance certified stamp"
                                    >
                                        <Star className="w-11 h-11 text-white mb-2 drop-shadow-md" />
                                        <p className="cert-stamp-compliance-title text-[9px] font-black uppercase tracking-[0.28em] text-white leading-tight">Compliance</p>
                                        <p className="cert-stamp-compliance-sub text-[9px] font-black uppercase tracking-[0.28em] text-white leading-tight mt-0.5">Certified</p>
                                        <p className="cert-stamp-compliance-micro text-[7px] font-black uppercase tracking-widest text-red-100 mt-1">Auto verification</p>
                                        {ledgerBlockDigits && (
                                            <p className="cert-stamp-compliance-block font-mono text-[8px] font-black tabular-nums text-white/95 mt-1.5 px-1">
                                                #{ledgerBlockDigits}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* E. Sidebar: embedded QR (data URLs print reliably; external QR URLs often fail in PDF) */}
                        <div className="md:col-span-4 flex flex-col items-stretch justify-start gap-8 py-4">
                            <div className="cert-qr-block bg-white border-2 border-zinc-100 p-6 sm:p-8 rounded-[2rem] text-center space-y-4 shadow-xl relative w-full overflow-hidden print:border-black print:shadow-none">
                                <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] bg-[length:12px_12px] opacity-[0.03] no-print" />
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest relative z-10">{t('reportComplete.qrVerifyTitle')}</p>
                                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner border border-zinc-100 mx-auto relative z-10">
                                    {qrSlot(qrVerifyDataUrl, 'Verify this report', `${baseUrl}?reportId=${encodeURIComponent(report.id)}`)}
                                </div>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase leading-relaxed px-2 relative z-10">{t('reportComplete.qrSubtext')}</p>
                                <p className="text-[8px] font-mono text-zinc-500 break-all px-1 relative z-10">{`${baseUrl}?reportId=${encodeURIComponent(report.id)}`}</p>
                            </div>

                            <div className="cert-qr-block bg-zinc-50 border-2 border-zinc-200 p-6 sm:p-8 rounded-[2rem] text-center space-y-4 relative w-full print:border-black">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{t('reportComplete.qrSituationTitle')}</p>
                                <div className="bg-white p-4 rounded-2xl inline-block border border-zinc-200 mx-auto">
                                    {qrSlot(
                                        qrSituationDataUrl,
                                        'Situation room',
                                        `${baseUrl}?reportId=${encodeURIComponent(report.id)}&situationRoom=1`
                                    )}
                                </div>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase leading-relaxed px-2">{t('reportComplete.qrSituationSubtext')}</p>
                                <p className="text-[8px] font-mono text-zinc-500 break-all px-1">{`${baseUrl}?reportId=${encodeURIComponent(report.id)}&situationRoom=1`}</p>
                            </div>

                            {/* OFFICIAL SEAL VISUAL */}
                            <div className="relative mt-4 no-print lg:block hidden">
                                <div className="absolute inset-0 seal-ripple bg-zinc-900/5 rounded-full scale-[2]"></div>
                                <div className="relative w-40 h-40 border-[8px] border-zinc-900 rounded-full flex flex-col items-center justify-center p-4">
                                     <Star className="w-12 h-12 text-zinc-950 mb-1" />
                                     <div className="text-[9px] font-black text-zinc-950 text-center leading-none uppercase">AUTHENTIC<br/>ACCOUNTABILITY<br/>SEAL</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="mt-20 pt-12 border-t-4 border-zinc-900 flex flex-col md:flex-row justify-between items-end gap-10 relative z-10">
                         <p className="text-[10px] text-zinc-500 font-bold uppercase max-w-2xl text-center md:text-left leading-relaxed tracking-wider">
                             {t('reportComplete.footerNote')}
                         </p>
                         <div className="flex flex-col items-center md:items-end space-y-2 text-right max-w-md">
                            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-950 leading-none">{t('reportComplete.digitallyCertified')}</p>
                            {ledgerBlockDigits && (
                                <p className="text-[9px] font-mono text-zinc-700 font-bold">LEDGER_BLOCK: {ledgerBlockDigits}</p>
                            )}
                            <p className="text-[9px] font-mono text-zinc-400">LEDGER_ANCHOR: {report.hash.substring(0, 32).toUpperCase()}...</p>
                            {ledgerBlockDigits && (
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide leading-snug">{t('reportComplete.stampLookupHint')}</p>
                            )}
                         </div>
                    </footer>
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
