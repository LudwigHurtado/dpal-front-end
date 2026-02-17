import React, { useRef, useState } from 'react';
import { Category, Report, SeverityLevel } from '../../types';
import { CATEGORIES_WITH_ICONS } from '../../constants';
import { MapPin, Camera, Mic, ShieldCheck, User, ChevronDown } from '../icons';

const TOUCH_MIN = 44;
const HEADER_BLUE = '#2563eb';

interface MobileSubmissionViewProps {
  onReturn?: () => void;
  addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>) => void;
  onSuccess?: () => void;
}

const SEVERITY_OPTIONS: SeverityLevel[] = ['Informational', 'Standard', 'Critical', 'Catastrophic'];
const SUB_CATEGORIES: Record<string, string[]> = {
  [Category.AccidentsRoadHazards]: ['Damaged Sign', 'Pothole', 'Flooding', 'Other'],
  [Category.Environment]: ['Illegal Dumping', 'Pollution', 'Other'],
  [Category.PublicSafetyAlerts]: ['Safety Issue', 'Hazard', 'Other'],
};
const DEFAULT_SUBS: string[] = ['Damaged Sign', 'Pothole', 'Other'];

const MobileSubmissionView: React.FC<MobileSubmissionViewProps> = ({
  addReport,
  onSuccess,
}) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('Standard');
  const [repeatIssue, setRepeatIssue] = useState(false);
  const [markSensitive, setMarkSensitive] = useState(false);
  const [submitPublic, setSubmitPublic] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const subOptions = category ? (SUB_CATEGORIES[category] || DEFAULT_SUBS) : [];

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
        () => setLocation('Location unavailable'),
      );
    } else setLocation('Location unavailable');
  };

  const quickPinFlow = () => {
    if (location) return;
    handleUseMyLocation();
  };

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }

    const r = new SpeechRecognition();
    r.lang = 'en-US';
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (ev: any) => {
      let transcript = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) transcript += ev.results[i][0].transcript;
      setWhatHappened(transcript.trim());
    };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  const handleSubmit = () => {
    if (!category || !whatHappened.trim()) return;
    const reportPayload: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'> = {
      title: whatHappened.slice(0, 80) || 'Report',
      description: whatHappened,
      category,
      location: location || address || 'Not specified',
      trustScore: 50,
      severity,
      isActionable: true,
    };
    addReport(reportPayload);
    onSuccess?.();
  };

  const canSubmit = category && whatHappened.trim().length > 0;
  const now = new Date();
  const timeStr = `${now.toLocaleDateString(undefined, { month: 'short' })} ${now.getDate()} ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

  return (
    <div className="min-h-full bg-zinc-950 pb-8">
      {/* Header: User | DPAL logo */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-800" style={{ backgroundColor: HEADER_BLUE }}>
        <button type="button" className="p-2 rounded-full bg-white/20 text-white touch-manipulation" aria-label="Profile">
          <User className="w-6 h-6" />
        </button>
        <span className="text-lg font-bold text-white tracking-tight">DPAL</span>
        <div className="w-10" />
      </header>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        <h1 className="text-lg font-bold text-white">Create Report</h1>

        {/* Category dropdown */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Category</label>
          <button
            type="button"
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-left"
          >
            <span>{category ? CATEGORIES_WITH_ICONS.find(c => c.value === category)?.value ?? category : 'Select category'}</span>
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          </button>
          {categoryOpen && (
            <div className="mt-1 rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
              {CATEGORIES_WITH_ICONS.slice(0, 14).map((c) => (
                <button key={c.value} type="button" onClick={() => { setCategory(c.value); setCategoryOpen(false); }} className="w-full px-4 py-2 text-left text-white text-sm hover:bg-zinc-800">
                  {c.icon} {c.value}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subcategory dropdown */}
        {category && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Subcategory</label>
            <button
              type="button"
              onClick={() => setSubcategoryOpen(!subcategoryOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-left"
            >
              <span>{subcategory || 'Select subcategory'}</span>
              <ChevronDown className="w-5 h-5 text-zinc-500" />
            </button>
            {subcategoryOpen && (
              <div className="mt-1 rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
                {subOptions.map((s) => (
                  <button key={s} type="button" onClick={() => { setSubcategory(s); setSubcategoryOpen(false); }} className="w-full px-4 py-2 text-left text-white text-sm hover:bg-zinc-800">{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Location - blue button */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Location</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold touch-manipulation"
              style={{ backgroundColor: HEADER_BLUE }}
            >
              <MapPin className="w-5 h-5" />
              Use My Current Location
            </button>
            <button
              type="button"
              onClick={quickPinFlow}
              className="px-3 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 text-xs font-semibold"
            >
              Quick Pin
            </button>
          </div>
          <input
            type="text"
            placeholder="Enter Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
          />
        </div>

        {/* What happened? */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-zinc-400">What happened?</label>
            <button type="button" onClick={toggleVoice} className={`text-xs px-2 py-1 rounded-md ${isListening ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
              {isListening ? 'Stop Voice' : 'Voice'}
            </button>
          </div>
          <textarea
            placeholder="Describe the issue..."
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 resize-none"
          />
        </div>

        {/* Add Evidence */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Add Evidence</label>
          <div className="flex gap-3">
            <button type="button" className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 touch-manipulation" style={{ minHeight: 72 }}>
              <Camera className="w-7 h-7" style={{ color: HEADER_BLUE }} />
              <span className="text-xs">Photo</span>
            </button>
            <button type="button" className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 touch-manipulation" style={{ minHeight: 72 }}>
              <span className="text-2xl">🎥</span>
              <span className="text-xs">Video</span>
            </button>
            <button type="button" className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 touch-manipulation" style={{ minHeight: 72 }}>
              <Mic className="w-7 h-7" style={{ color: HEADER_BLUE }} />
              <span className="text-xs">Audio</span>
            </button>
          </div>
        </div>

        {/* Severity + Date/Time row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {SEVERITY_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium touch-manipulation ${
                  severity === s ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {s === 'Informational' ? 'Low' : s === 'Standard' ? 'Medium' : s === 'Critical' ? 'High' : 'Critical+'}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            {timeStr}
            <ChevronDown className="w-4 h-4" />
          </span>
        </div>

        {/* Repeat Issue toggle */}
        <label className="flex items-center justify-between py-2 touch-manipulation cursor-pointer">
          <span className="text-sm text-zinc-300">Repeat Issue?</span>
          <input type="checkbox" checked={repeatIssue} onChange={(e) => setRepeatIssue(e.target.checked)} className="w-5 h-5 rounded border-zinc-600 text-blue-500 bg-zinc-800" />
        </label>

        {/* Sensitive checkbox */}
        <label className="flex items-start gap-3 py-2 touch-manipulation cursor-pointer">
          <input type="checkbox" checked={markSensitive} onChange={(e) => setMarkSensitive(e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-zinc-600 text-blue-500 bg-zinc-800" />
          <span className="text-sm text-zinc-400">Mark as Sensitive (Visible to Trusted & Verified Users Only)</span>
        </label>

        {/* Submit buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setSubmitPublic(true)}
            className={`flex-1 py-3 rounded-xl font-semibold touch-manipulation ${submitPublic ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
            style={{ minHeight: TOUCH_MIN }}
          >
            Submit Public
          </button>
          <button
            type="button"
            onClick={() => setSubmitPublic(false)}
            className={`flex-1 py-3 rounded-xl font-semibold touch-manipulation ${!submitPublic ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
            style={{ minHeight: TOUCH_MIN }}
          >
            Submit Private
          </button>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl font-semibold touch-manipulation bg-blue-600 text-white disabled:opacity-50"
          style={{ minHeight: 52 }}
        >
          Submit Report
        </button>
        <p className="text-center text-xs text-zinc-500">Your personal info is kept private.</p>
      </div>
    </div>
  );
};

export default MobileSubmissionView;
