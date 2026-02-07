import React, { useState } from 'react';
import { Category, Report, SeverityLevel } from '../../types';
import { CATEGORIES_WITH_ICONS } from '../../constants';
import { MapPin, Camera, Mic, ShieldCheck } from '../icons';

const DPAL_PRIMARY = '#1e5f9e';
const DPAL_SECONDARY = '#0d7d4a';
const DPAL_WARNING = '#b45309';
const TOUCH_MIN = 44;

interface MobileSubmissionViewProps {
  onReturn?: () => void;
  addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>) => void;
  onSuccess?: () => void;
}

const VERIFICATION_LEVELS = ['Draft', 'Community', 'Verified'] as const;

const MobileSubmissionView: React.FC<MobileSubmissionViewProps> = ({
  addReport,
  onSuccess,
}) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState('');
  const [location, setLocation] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [address, setAddress] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [verificationLevel, setVerificationLevel] = useState<(typeof VERIFICATION_LEVELS)[number]>('Community');
  const [markSensitive, setMarkSensitive] = useState(false);
  const [submitPublic, setSubmitPublic] = useState(true);

  const handleUseMyLocation = () => {
    setUseMyLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
        () => setLocation('Location unavailable'),
      );
    } else {
      setLocation('Location unavailable');
    }
  };

  const handleSubmit = () => {
    if (!category || !whatHappened.trim()) return;
    const reportPayload: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'> = {
      title: whatHappened.slice(0, 80) || 'Report',
      description: whatHappened,
      category,
      location: location || address || 'Not specified',
      trustScore: verificationLevel === 'Verified' ? 85 : verificationLevel === 'Community' ? 50 : 20,
      severity: 'Standard' as SeverityLevel,
      isActionable: true,
    };
    addReport(reportPayload);
    onSuccess?.();
  };

  const canSubmit = category && whatHappened.trim().length > 0;

  return (
    <div className="dpal-mobile-ui min-h-full bg-[#f8fafc] pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0] px-4 py-3 safe-top">
        <h1 className="text-xl font-bold text-[#0f172a]">Create Report</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <select
            value={verificationLevel}
            onChange={(e) => setVerificationLevel(e.target.value as (typeof VERIFICATION_LEVELS)[number])}
            className="text-sm font-medium text-[#475569] border border-[#e2e8f0] rounded-lg px-3 py-1.5 bg-white"
          >
            {VERIFICATION_LEVELS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Category & Subcategory */}
        <section>
          <label className="block text-sm font-semibold text-[#0f172a] mb-2">Category & Subcategory</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES_WITH_ICONS.slice(0, 12).map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors touch-manipulation"
                style={{
                  minHeight: `${TOUCH_MIN}px`,
                  borderColor: category === c.value ? DPAL_PRIMARY : '#e2e8f0',
                  backgroundColor: category === c.value ? '#e8f1fa' : '#fff',
                  color: category === c.value ? DPAL_PRIMARY : '#475569',
                }}
              >
                <span>{c.icon}</span>
                <span className="truncate max-w-[120px]">{c.value}</span>
              </button>
            ))}
          </div>
          {category && (
            <input
              type="text"
              placeholder="Subcategory (optional)"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="dpal-input w-full mt-2"
            />
          )}
        </section>

        {/* Location */}
        <section>
          <label className="block text-sm font-semibold text-[#0f172a] mb-2">Location</label>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#cbd5e1] text-[#1e5f9e] font-semibold touch-manipulation"
            style={{ minHeight: `${TOUCH_MIN}px` }}
          >
            <MapPin className="w-5 h-5" />
            Use my location
          </button>
          <input
            type="text"
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="dpal-input w-full mt-2"
          />
          {location && <p className="text-xs text-[#64748b] mt-1">{location}</p>}
        </section>

        {/* What happened? */}
        <section>
          <label className="block text-sm font-semibold text-[#0f172a] mb-2">What happened?</label>
          <textarea
            placeholder="Brief description..."
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={4}
            className="dpal-input w-full resize-none"
          />
        </section>

        {/* Add Evidence */}
        <section>
          <label className="block text-sm font-semibold text-[#0f172a] mb-2">Add Evidence</label>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[#e2e8f0] bg-white text-[#475569] font-medium touch-manipulation"
              style={{ minHeight: 72 }}
            >
              <Camera className="w-7 h-7 text-[#1e5f9e]" />
              <span className="text-xs">Photos</span>
            </button>
            <button
              type="button"
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[#e2e8f0] bg-white text-[#475569] font-medium touch-manipulation"
              style={{ minHeight: 72 }}
            >
              <span className="text-2xl">🎥</span>
              <span className="text-xs">Video</span>
            </button>
            <button
              type="button"
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-[#e2e8f0] bg-white text-[#475569] font-medium touch-manipulation"
              style={{ minHeight: 72 }}
            >
              <Mic className="w-7 h-7 text-[#1e5f9e]" />
              <span className="text-xs">Audio</span>
            </button>
          </div>
        </section>

        {/* Metadata chips by category - example */}
        {category && (
          <section>
            <label className="block text-sm font-semibold text-[#0f172a] mb-2">Details</label>
            <div className="flex flex-wrap gap-2">
              {['Severity', 'Date/Time', 'Repeat issue?'].map((chip) => (
                <span
                  key={chip}
                  className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] text-[#475569] text-sm font-medium"
                >
                  {chip}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Safety & trust */}
        <section className="space-y-3">
          <p className="text-xs text-[#64748b] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0d7d4a]" />
            No personal info — keep descriptions factual and anonymous where possible.
          </p>
          <label className="flex items-center gap-3 touch-manipulation cursor-pointer">
            <input
              type="checkbox"
              checked={markSensitive}
              onChange={(e) => setMarkSensitive(e.target.checked)}
              className="w-5 h-5 rounded border-[#cbd5e1] text-[#1e5f9e]"
            />
            <span className="text-sm font-medium text-[#0f172a]">Mark as sensitive</span>
          </label>
        </section>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => setSubmitPublic(true)}
            className={`flex-1 py-3 rounded-xl font-semibold touch-manipulation ${submitPublic ? 'bg-[#1e5f9e] text-white' : 'bg-[#e2e8f0] text-[#475569]'}`}
            style={{ minHeight: TOUCH_MIN }}
          >
            Submit Public
          </button>
          <button
            type="button"
            onClick={() => setSubmitPublic(false)}
            className={`flex-1 py-3 rounded-xl font-semibold touch-manipulation ${!submitPublic ? 'bg-[#1e5f9e] text-white' : 'bg-[#e2e8f0] text-[#475569]'}`}
            style={{ minHeight: TOUCH_MIN }}
          >
            Trusted only
          </button>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="dpal-btn-primary w-full mt-2"
          style={{ minHeight: 52 }}
        >
          Submit Report
        </button>
      </div>
    </div>
  );
};

export default MobileSubmissionView;
