import React, { useState, useEffect } from 'react';
import { useTranslations } from '../i18n';
import { Cube, Search, Loader } from './icons';

type BlockLookupResult = { ok: true } | { ok: false; reason: 'invalid' | 'not_found' };

interface BlockchainStatusPanelProps {
  totalReports: number;
  latestHash?: string;
  latestBlockNumber?: number;
  onOpenReportByBlock?: (raw: string) => Promise<BlockLookupResult>;
}

const BlockchainStatusPanel: React.FC<BlockchainStatusPanelProps> = ({
  totalReports,
  latestHash,
  latestBlockNumber,
  onOpenReportByBlock,
}) => {
  const { t } = useTranslations();
  const [currentBlock, setCurrentBlock] = useState(latestBlockNumber || 6843021);
  const [blockInput, setBlockInput] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupHint, setLookupHint] = useState<string | null>(null);

  useEffect(() => {
    if (latestBlockNumber && latestBlockNumber > 0) {
      setCurrentBlock(latestBlockNumber);
    }
  }, [latestBlockNumber]);

  const runBlockLookup = async () => {
    if (!onOpenReportByBlock || !blockInput.trim() || lookupBusy) return;
    setLookupBusy(true);
    setLookupHint(null);
    try {
      const result = await onOpenReportByBlock(blockInput);
      if (result.ok) {
        setBlockInput('');
        setLookupHint(null);
      } else if (result.reason === 'invalid') {
        setLookupHint(t('blockchainLookup.invalidBlock'));
      } else {
        setLookupHint(t('blockchainLookup.notFound'));
      }
    } finally {
      setLookupBusy(false);
    }
  };

  return (
    <div className="my-8 bg-white text-gray-700 rounded-lg p-4 shadow-md border border-gray-200">
      <h3 className="text-center font-semibold text-gray-500 mb-3 text-sm tracking-wider uppercase">{t('blockchainStatus.title')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-100">
          <p className="text-xs text-gray-500">{t('blockchainStatus.nextBlock')}</p>
          <div className="flex items-center space-x-2">
            <Cube className="w-4 h-4 text-blue-500" />
            <p className="text-lg font-bold text-blue-600 animate-pulse">{currentBlock + 1}</p>
          </div>
        </div>
        <div className="p-2">
          <p className="text-xs text-gray-500">{t('blockchainStatus.totalTransactions')}</p>
          <p className="text-lg font-mono font-bold text-gray-800">{totalReports.toLocaleString()}</p>
        </div>
        <div className="p-2">
          <p className="text-xs text-gray-500">{t('blockchainStatus.status')}</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
            <p className="text-lg font-bold text-green-600">{t('blockchainStatus.statusOperational')}</p>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 p-2 overflow-hidden">
          <p className="text-xs text-gray-500">{t('blockchainStatus.latestHash')}</p>
          <p className="text-sm font-mono truncate text-gray-500" title={latestHash || 'PENDING_FIRST_ANCHOR'}>{latestHash || 'PENDING_FIRST_ANCHOR'}</p>
        </div>
      </div>

      {onOpenReportByBlock && (
        <div className="mt-5 pt-4 border-t border-gray-200">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">{t('blockchainLookup.title')}</p>
          <p className="text-xs text-gray-500 text-center mb-3">{t('blockchainLookup.description')}</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200">
              <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('blockchainLookup.placeholder')}
                value={blockInput}
                onChange={(e) => {
                  setBlockInput(e.target.value);
                  setLookupHint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runBlockLookup();
                }}
                className="w-full min-w-0 bg-transparent text-sm font-mono text-gray-800 outline-none placeholder:text-gray-400"
                aria-label={t('blockchainLookup.title')}
              />
            </div>
            <button
              type="button"
              disabled={lookupBusy || !blockInput.trim()}
              onClick={() => void runBlockLookup()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lookupBusy ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('blockchainLookup.openFiling')}
            </button>
          </div>
          {lookupHint && <p className="mt-2 text-center text-xs text-rose-600">{lookupHint}</p>}
        </div>
      )}
    </div>
  );
};

export default BlockchainStatusPanel;
