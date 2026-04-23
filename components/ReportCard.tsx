
import React, { useState, useEffect } from 'react';
import type { Report } from '../types';
import { MapPin, Tag, Clock, Hash, Link, Pencil, Camera, Loader, ChevronLeft, ChevronRight, QrCode, ShieldCheck, Zap, Broadcast, Target, Scale, AlertTriangle, FileText, Fingerprint, Activity } from './icons';
import { CATEGORIES_WITH_ICONS } from '../constants';
import { useTranslations } from '../i18n';
import { getReportImage } from '../utils/reportImages';
import QrCodeDisplay from './QrCodeDisplay';

interface ReportCardProps {
  report: Report;
  onAddImage: (imageUrl: string) => void;
  onJoinChat?: (report: Report) => void;
  onEnterMissionV2?: (report: Report) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onAddImage, onJoinChat, onEnterMissionV2 }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrlsToDisplay, setImageUrlsToDisplay] = useState<string[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [showForensics, setShowForensics] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    let objectUrls: string[] = [];

    const rawImageUrls = Array.isArray((report as any).imageUrls) ? (report as any).imageUrls : [];
    const attachments = Array.isArray((report as any).attachments) ? (report as any).attachments : [];

    if (rawImageUrls.length === 0 && attachments.length > 0) {
        const imageFiles = attachments.filter((f: any) => f && typeof f.type === 'string' && f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            objectUrls = imageFiles.map((file: File) => URL.createObjectURL(file));
            setImageUrlsToDisplay(objectUrls);
        } else {
            setImageUrlsToDisplay([]);
        }
    } else {
        const normalizedImageUrls = rawImageUrls.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
        setImageUrlsToDisplay(normalizedImageUrls.length > 0 ? normalizedImageUrls : [getReportImage(report)]);
    }

    return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
  }, [report]);

  const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 3600) return "RECENT_SYNC";
    const intervalDays = Math.floor(seconds / 86400);
    if (intervalDays > 0) return `${intervalDays}D_AGO`;
    return `${Math.floor(seconds / 3600)}H_AGO`;
  };

  const safeTimestamp = report.timestamp instanceof Date ? report.timestamp : new Date((report as any).timestamp);
  const timeLabel = Number.isNaN(safeTimestamp.getTime()) ? '—' : timeAgo(safeTimestamp);

  const safeId = (report.id || `rep-${Date.now()}`).toString();
  const safeSeverity = ((report.severity as any) || 'Standard').toString();
  const safeCategory = ((report.category as any) || 'Other').toString();
  const safeTitle = (report.title || 'Untitled Report').toString();
  const safeLocation = (report.location || 'Unknown').toString();
  const safeDescription = (report.description || '').toString();
  const safeTrustScore = typeof report.trustScore === 'number' ? report.trustScore : 70;

  const categoryInfo = CATEGORIES_WITH_ICONS.find(c => c.value === report.category);

  return (
    <div className={`group bg-[var(--dpal-report-card)] text-[var(--dpal-text-primary)] border-2 rounded-[2.5rem] overflow-hidden transition-all duration-500 shadow-lg relative font-sans flex flex-col ${report.isActionable ? 'border-rose-500/45' : 'border-[var(--dpal-border)] hover:border-cyan-500/35'}`}>
      
      {/* ACTIONABLE BADGE */}
      {report.isActionable && (
          <div className="absolute top-0 right-0 z-40 bg-rose-600 text-white px-8 py-2 rounded-bl-3xl border-b-2 border-l-2 border-rose-400 font-black text-[10px] uppercase tracking-[0.2em] flex items-center space-x-3 shadow-2xl animate-pulse">
              <Scale className="w-4 h-4" />
              <span>Authority_Audit_Requested</span>
          </div>
      )}

      {/* Ledger Fragment Header */}
      <div className="bg-[var(--dpal-surface-alt)] border-b border-[var(--dpal-border)] px-4 py-4 sm:px-8 sm:py-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <div className={`w-2 h-2 rounded-full animate-ping shrink-0 ${safeSeverity === 'Critical' || safeSeverity === 'Catastrophic' ? 'bg-rose-500 shadow-[0_0_10px_rose]' : 'bg-cyan-500'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--dpal-text-secondary)] truncate">Report #{safeId.split('-').pop()}</span>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${safeSeverity === 'Critical' || safeSeverity === 'Catastrophic' ? 'text-rose-300 border-rose-500/40 bg-rose-950/50' : 'text-[var(--dpal-text-muted)] border-[var(--dpal-border)] bg-[var(--dpal-surface)]'}`}>Severity: {safeSeverity.toUpperCase()}</span>
          </div>
          <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-[10px] font-black text-[var(--dpal-text-muted)] uppercase bg-[var(--dpal-surface)] px-3 py-1 rounded-lg border border-[var(--dpal-border)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLabel}</span>
              </div>
          </div>
      </div>

      {/* Mobile: content first, image below (flex-col). Desktop: image first (md:flex-col-reverse with [content, image] in DOM). */}
      <div className="flex flex-col md:flex-col-reverse">
      <div className="p-4 sm:p-8 space-y-6 md:space-y-8">
          <div className="flex flex-col gap-4 md:gap-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
                  <div className="space-y-3 md:space-y-4 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 md:gap-4">
                          <div className="bg-cyan-950/40 text-cyan-400 px-3 sm:px-4 py-1.5 rounded-full border border-cyan-800/50 flex items-center space-x-2">
                              <span className="text-lg">{categoryInfo?.icon}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest">{safeCategory.toUpperCase()}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] font-black text-[var(--dpal-text-muted)] uppercase min-w-0">
                              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                              <span className="truncate max-w-[min(100%,220px)] sm:max-w-[200px]">{safeLocation}</span>
                          </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl md:text-4xl font-black text-white leading-tight tracking-tighter uppercase group-hover:text-cyan-100 transition-colors">
                        {safeTitle}
                      </h3>
                  </div>

                  <div className="hidden md:flex items-center space-x-6 flex-shrink-0 bg-black/40 p-4 rounded-3xl border border-[var(--dpal-border-strong)] shadow-inner self-start">
                      <div className="text-center">
                          <p className="text-[8px] font-black text-[var(--dpal-text-muted)] uppercase tracking-widest mb-1">Trust_Index</p>
                          <p className={`text-xl font-black ${safeTrustScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{safeTrustScore}%</p>
                      </div>
                      <div className="w-px h-10 bg-[var(--dpal-border-strong)]"></div>
                      <ShieldCheck className={`w-8 h-8 ${safeTrustScore > 90 ? 'text-emerald-500' : 'text-[var(--dpal-text-muted)]'}`} />
                  </div>
              </div>

              {/* Narrative before trust on phones; desktop duplicate lives below trust in row */}
              <div className="md:hidden bg-[color-mix(in_srgb,var(--dpal-background)_50%,transparent)] border-l-4 border-[var(--dpal-border-strong)] pl-4 sm:pl-8 py-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Broadcast className="w-20 h-20 text-white"/></div>
                  <p className="text-[var(--dpal-text-secondary)] text-sm leading-relaxed line-clamp-4 sm:line-clamp-3 group-hover:line-clamp-none transition-all duration-300 relative z-10">
                    "{safeDescription}"
                  </p>
              </div>

              <div className="flex md:hidden items-center justify-center space-x-6 flex-shrink-0 bg-black/40 p-4 rounded-2xl border border-[var(--dpal-border-strong)] shadow-inner w-full">
                  <div className="text-center">
                      <p className="text-[8px] font-black text-[var(--dpal-text-muted)] uppercase tracking-widest mb-1">Trust_Index</p>
                      <p className={`text-xl font-black ${safeTrustScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{safeTrustScore}%</p>
                  </div>
                  <div className="w-px h-10 bg-[var(--dpal-border-strong)]"></div>
                  <ShieldCheck className={`w-8 h-8 ${safeTrustScore > 90 ? 'text-emerald-500' : 'text-[var(--dpal-text-muted)]'}`} />
              </div>

              <div className="hidden md:block bg-[color-mix(in_srgb,var(--dpal-background)_50%,transparent)] border-l-4 border-[var(--dpal-border-strong)] pl-8 py-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Broadcast className="w-20 h-20 text-white"/></div>
                  <p className="text-[var(--dpal-text-secondary)] text-sm leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all duration-300 relative z-10">
                    "{safeDescription}"
                  </p>
              </div>
          </div>

          {/* FORENSIC DOSSIER TOGGLE */}
          <div className="space-y-4">
               <button 
                onClick={() => setShowForensics(!showForensics)}
                className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-cyan-500/80 hover:text-cyan-400 transition-colors"
               >
                   <FileText className="w-4 h-4" />
                   <span>{showForensics ? 'Hide_Forensic_Data' : 'View_Forensic_Dossier'}</span>
               </button>
               
               {showForensics && report.structuredData && (
                   <div className="bg-black/60 border-2 border-[var(--dpal-border-strong)] rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in shadow-inner">
                       {Object.entries(report.structuredData).map(([key, val]: [string, any]) => {
                           if (key === 'diagnosticTools' && Array.isArray(val)) return null;
                           return (
                               <div key={key} className="space-y-1">
                                   <p className="text-[8px] font-black text-cyan-600/80 uppercase tracking-[0.2em]">{key.replace(/([A-Z])/g, '_$1').toUpperCase()}</p>
                                   <p className="text-[11px] font-bold text-white uppercase truncate">{Array.isArray(val) ? val.join(', ') : String(val)}</p>
                               </div>
                           );
                       })}
                       
                       {report.structuredData.diagnosticTools && (
                           <div className="col-span-full pt-4 border-t border-[color-mix(in_srgb,var(--dpal-border-strong)_40%,transparent)] mt-2">
                               <p className="text-[8px] font-black text-cyan-500/80 uppercase tracking-[0.2em] mb-2">Applied_Diagnostic_Toolkit</p>
                               <div className="flex flex-wrap gap-2">
                                   {report.structuredData.diagnosticTools.map((tool: string) => (
                                       <span key={tool} className="bg-cyan-950/20 border border-cyan-900/50 text-cyan-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{tool}</span>
                                   ))}
                               </div>
                           </div>
                       )}

                       <div className="col-span-full pt-4 border-t border-[var(--dpal-border-strong)] mt-2 flex items-center justify-between">
                           <p className="text-[8px] font-black text-[var(--dpal-text-muted)] uppercase tracking-widest">Metadata_Validation: STABLE</p>
                           <div className="flex items-center space-x-2 text-emerald-500/50">
                               <ShieldCheck className="w-3 h-3"/>
                               <span className="text-[7px] font-black uppercase tracking-tighter">SECURE_ID_LOCKED</span>
                           </div>
                       </div>
                   </div>
               )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6 pt-6 md:pt-8 border-t border-[color-mix(in_srgb,var(--dpal-border-strong)_50%,transparent)]">
              <div className="flex items-center space-x-8">
                  <button onClick={() => setShowQr(true)} className="flex items-center space-x-3 text-[10px] font-black uppercase text-[var(--dpal-text-muted)] hover:text-cyan-400 transition-colors">
                      <QrCode className="w-5 h-5" />
                      <span>Link_Shard</span>
                  </button>
                  <div className="hidden xl:flex items-center space-x-3 text-[10px] font-mono text-[var(--dpal-text-muted)]">
                      <Hash className="w-4 h-4" />
                      <span className="truncate max-w-[150px]">{report.blockchainRef}</span>
                  </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                   {onEnterMissionV2 && (
                      <button
                        type="button"
                        onClick={() => onEnterMissionV2(report)}
                        className="flex items-center justify-center space-x-3 font-black py-3 px-5 rounded-2xl transition-all border border-cyan-500/60 bg-cyan-900/30 text-cyan-300 hover:bg-cyan-800/40 w-full sm:w-auto"
                      >
                        <Target className="w-5 h-5" />
                        <span className="uppercase text-[10px] tracking-[0.2em]">ENTER_MISSIONS_ROOM</span>
                      </button>
                   )}
                   {onJoinChat && (
                      <button 
                        onClick={() => onJoinChat(report)} 
                        className={`flex items-center justify-center space-x-4 font-black py-4 px-12 rounded-2xl transition-all shadow-3xl active:scale-95 group/join border w-full sm:w-auto ${report.isActionable ? 'bg-rose-600 border-rose-400 text-white hover:bg-rose-500' : 'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500'}`}
                      >
                        <Broadcast className="w-6 h-6" />
                        <span className="uppercase text-xs tracking-[0.2em]">{report.isActionable ? 'ENTER_AUDIT_ROOM' : 'ENTER_OVERSIGHT'}</span>
                      </button>
                   )}
              </div>
          </div>
      </div>

      {/* TOP IMAGE VIEWER — below text on mobile; above on md+ */}
      <div className="relative w-full aspect-[21/10] sm:aspect-[21/8] bg-[var(--dpal-map-panel)] border-t md:border-t-0 md:border-b border-[color:var(--dpal-border)] overflow-hidden">
          {imageUrlsToDisplay.length > 0 ? (
              <img src={imageUrlsToDisplay[currentImageIndex]} alt={safeTitle} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 grayscale group-hover:grayscale-0" />
          ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--dpal-text-muted)] opacity-30">
                  <div className="text-5xl sm:text-6xl mb-4">{categoryInfo?.icon || '📄'}</div>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">Forensic_Telemetry_Missing</p>
              </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(34,211,238,0.1)_1px,transparent_0)] bg-[length:30px_30px] opacity-20"></div>
      </div>
      </div>
      {showQr && <QrCodeDisplay type="report" id={report.id} onClose={() => setShowQr(false)} />}
    </div>
  );
};

export default ReportCard;
