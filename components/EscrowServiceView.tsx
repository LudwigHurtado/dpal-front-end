import React, { useEffect, useRef, useState } from 'react';
import { Category } from '../types';
import { ArrowLeft, Camera, Upload, CheckCircle, User, FileText, ShieldCheck, Loader, X } from './icons';
import { createEscrow, listEscrows, type EscrowCreatePayload, type EscrowRecord } from '../services/operationsService';

interface EscrowServiceViewProps {
  onReturn: () => void;
  onStartEscrowReport?: (category: Category, prefilledDescription?: string) => void;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'BOL', 'Other'];

const EscrowServiceView: React.FC<EscrowServiceViewProps> = ({ onReturn, onStartEscrowReport }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [step, setStep] = useState<'details' | 'receipts' | 'face' | 'done'>('details');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payeeEmail, setPayeeEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');

  const [receiptFiles, setReceiptFiles] = useState<string[]>([]);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [liveRecording, setLiveRecording] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!cameraOn || !videoRef.current || step !== 'face') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not supported. Use a device with a camera.');
      return;
    }
    setCameraError('');
    setLiveRecording(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e) => {
        setCameraError('Camera unavailable or blocked.');
        setLiveRecording(false);
      });
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setLiveRecording(false);
    };
  }, [cameraOn, step]);

  const loadEscrows = async () => {
    setLoadingList(true);
    try {
      const list = await listEscrows();
      setEscrows(list);
    } catch {
      setEscrows([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { loadEscrows(); }, [createdId]);

  const handleCaptureFace = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFaceImage(canvas.toDataURL('image/jpeg', 0.9));
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFaceImage(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setReceiptFiles((prev) => [...prev, String(reader.result)].slice(-10));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeReceipt = (index: number) => setReceiptFiles((prev) => prev.filter((_, i) => i !== index));

  const canNextFromDetails = payerName.trim() && payeeName.trim() && amount.trim() && Number(amount) > 0 && description.trim();
  const canNextFromReceipts = true;
  const canNextFromFace = Boolean(faceImage);

  const handleCreateEscrow = async () => {
    if (!faceImage || !canNextFromDetails) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload: EscrowCreatePayload = {
        payerName: payerName.trim(),
        payerEmail: payerEmail.trim() || undefined,
        payeeName: payeeName.trim(),
        payeeEmail: payeeEmail.trim() || undefined,
        amount: Number(amount),
        currency,
        description: description.trim(),
        receiptImages: receiptFiles,
        faceImage,
      };
      const record = await createEscrow(payload);
      setCreatedId(record.id);
      setStep('done');
      loadEscrows();
    } catch (err: any) {
      setSubmitError(err?.message || 'Could not create escrow. Backend may be unavailable.');
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setStep('details');
    setFaceImage(null);
    setReceiptFiles([]);
    setCreatedId(null);
    setSubmitError('');
  };

  return (
    <div className="max-w-3xl mx-auto text-white font-mono animate-fade-in pb-28 px-4">
      <header className="flex items-center justify-between mb-6">
        <button onClick={onReturn} className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </button>
        <h1 className="text-sm font-black uppercase tracking-tight">Quick Escrow</h1>
      </header>

      {/* Step progress */}
      <div className="flex gap-2 mb-8">
        {(['details', 'receipts', 'face'] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${step === s ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}
          >
            {i + 1}. {s === 'details' ? 'Details' : s === 'receipts' ? 'Receipts' : 'Face'}
          </button>
        ))}
      </div>

      {step === 'details' && (
        <section className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Escrow terms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Party A (Payer)</label>
              <input
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm"
              />
              <input
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full mt-2 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Party B (Payee)</label>
              <input
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm"
              />
              <input
                value={payeeEmail}
                onChange={(e) => setPayeeEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full mt-2 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm"
              />
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Description (what is held in escrow)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Payment for services; release when work is delivered"
              rows={3}
              className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm resize-none"
            />
          </div>
          <button
            onClick={() => setStep('receipts')}
            disabled={!canNextFromDetails}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-black uppercase"
          >
            Next: Add receipts
          </button>
        </section>
      )}

      {step === 'receipts' && (
        <section className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Payment receipts
          </h2>
          <p className="text-[10px] text-zinc-500">Upload images of payment proof (optional but recommended for records).</p>
          <label className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-cyan-500">
            <Upload className="w-5 h-5 text-zinc-500" />
            <span className="text-xs font-black uppercase">Add receipt (image)</span>
            <input type="file" accept="image/*" className="hidden" onChange={addReceipt} />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {receiptFiles.map((dataUrl, i) => (
              <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700">
                <img src={dataUrl} alt={`Receipt ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeReceipt(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('details')} className="py-2 px-4 rounded-xl bg-zinc-800 text-xs font-black uppercase">
              Back
            </button>
            <button
              onClick={() => setStep('face')}
              className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-black uppercase"
            >
              Next: Live face verification
            </button>
          </div>
        </section>
      )}

      {step === 'face' && (
        <section className="space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Live face scan
          </h2>
          <p className="text-[10px] text-zinc-500">Use your phone camera for real-time verification. Start camera then capture.</p>

          <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-zinc-700 bg-black">
            {faceImage ? (
              <img src={faceImage} alt="Face verification" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            {liveRecording && !faceImage && (
              <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-lg bg-red-600/90 text-white text-[10px] font-black uppercase">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
              </div>
            )}
          </div>
          {cameraError && <p className="text-amber-400 text-xs font-bold">{cameraError}</p>}

          <div className="flex flex-wrap gap-3">
            {!faceImage ? (
              <>
                <button
                  onClick={() => setCameraOn((o) => !o)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-black uppercase"
                >
                  {cameraOn ? 'Stop camera' : 'Start camera'}
                </button>
                <button
                  onClick={handleCaptureFace}
                  disabled={!cameraOn}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-black uppercase"
                >
                  Capture now
                </button>
                <label className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-black uppercase cursor-pointer">
                  Upload photo instead
                  <input type="file" accept="image/*" className="hidden" onChange={handleFaceUpload} />
                </label>
              </>
            ) : (
              <button
                onClick={() => setFaceImage(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-black uppercase"
              >
                Retake
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('receipts')} className="py-2 px-4 rounded-xl bg-zinc-800 text-xs font-black uppercase">
              Back
            </button>
            <button
              onClick={handleCreateEscrow}
              disabled={!canNextFromFace || submitting}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black uppercase flex items-center justify-center gap-2"
            >
              {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {submitting ? 'Creating…' : 'Create escrow & save'}
            </button>
          </div>
          {submitError && <p className="text-amber-400 text-xs font-bold">{submitError}</p>}
        </section>
      )}

      {step === 'done' && (
        <section className="space-y-4 bg-emerald-950/30 border border-emerald-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-emerald-400 font-black uppercase">
            <CheckCircle className="w-5 h-5" /> Escrow recorded
          </div>
          <p className="text-sm text-zinc-300">
            {createdId ? `ID: ${createdId}. Transaction saved for future use and blockchain.` : 'Saved.'}
          </p>
          <div className="flex gap-3">
            <button onClick={startOver} className="py-2 px-4 rounded-xl bg-zinc-800 text-xs font-black uppercase">
              New escrow
            </button>
            {onStartEscrowReport && (
              <button
                onClick={() => onStartEscrowReport(Category.Other, `Escrow dispute reference: ${createdId || ''}`)}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-black uppercase"
              >
                Open dispute report
              </button>
            )}
          </div>
        </section>
      )}

      {/* Your escrows list */}
      <div className="mt-10">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Your escrows</h2>
        {loadingList ? (
          <div className="flex items-center justify-center py-8"><Loader className="w-6 h-6 animate-spin text-cyan-500" /></div>
        ) : escrows.length === 0 ? (
          <p className="text-zinc-500 text-xs py-4">No escrows yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {escrows.map((e) => (
              <li
                key={e.id}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="text-[10px] font-black text-cyan-400">{e.id}</span>
                  <p className="text-sm font-bold">{e.payerName} → {e.payeeName}</p>
                  <p className="text-xs text-zinc-500">{e.amount} {e.currency} · {e.status}</p>
                </div>
                {onStartEscrowReport && (
                  <button
                    onClick={() => onStartEscrowReport(Category.Other, `Dispute for escrow ${e.id}`)}
                    className="py-1.5 px-3 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-[10px] font-black uppercase"
                  >
                    Dispute
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[10px] text-zinc-500 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Escrow records are stored for future use and can be linked to blockchain. Face and receipts are kept with the transaction.</span>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default EscrowServiceView;
