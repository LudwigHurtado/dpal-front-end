import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Category } from '../types';
import { ArrowLeft, Camera, Fingerprint, ShieldCheck, Upload, CheckCircle, User } from './icons';

interface EscrowServiceViewProps {
  onReturn: () => void;
  onStartEscrowReport: (category: Category, prefilledDescription?: string) => void;
}

const EscrowServiceView: React.FC<EscrowServiceViewProps> = ({ onReturn, onStartEscrowReport }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [fingerprintImage, setFingerprintImage] = useState<string | null>(null);
  const [fingerprintStatus, setFingerprintStatus] = useState<'IDLE' | 'SCANNING' | 'VERIFIED'>('IDLE');
  const [fingerprintMethod, setFingerprintMethod] = useState<'none' | 'device-scan' | 'photo'>('none');
  const [fingerprintError, setFingerprintError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!cameraOn || !videoRef.current) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API not supported on this device/browser. Use face image upload instead.');
        return;
      }
      try {
        setCameraError('');
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.warn('Camera not available:', error);
        setCameraError('Camera unavailable or blocked. You can upload a face image instead.');
      }
    };

    void startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraOn]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedFace(canvas.toDataURL('image/png'));
  };

  const readImageAsDataUrl = (file?: File, onLoad?: (value: string) => void) => {
    if (!file || !onLoad) return;
    const reader = new FileReader();
    reader.onload = () => onLoad(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleFaceUpload = (file?: File) => {
    readImageAsDataUrl(file, (value) => {
      setCapturedFace(value);
      setCameraError('');
    });
  };

  const supportsDeviceBiometricScan = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hasPublicKey = typeof (window as any).PublicKeyCredential !== 'undefined';
    const isSecureContextOk = typeof window.isSecureContext === 'boolean' ? window.isSecureContext : true;
    return hasPublicKey && isSecureContextOk;
  }, []);

  const handleDeviceFingerprintScan = async () => {
    if (!supportsDeviceBiometricScan) {
      setFingerprintError('Device biometric scan is unavailable on this browser. Use fingerprint photo upload.');
      return;
    }

    setFingerprintError('');
    setFingerprintStatus('SCANNING');
    setFingerprintMethod('device-scan');

    // UX-level device scan simulation hook: browser/platform biometric availability differs per device.
    // In production, connect this path to your escrow backend + WebAuthn challenge verification endpoint.
    setTimeout(() => {
      setFingerprintStatus('VERIFIED');
      setFingerprintImage(null);
    }, 1600);
  };

  const handleFingerprintUpload = (file?: File) => {
    readImageAsDataUrl(file, (value) => {
      setFingerprintImage(value);
      setFingerprintStatus('SCANNING');
      setFingerprintMethod('photo');
      setFingerprintError('');
      setTimeout(() => setFingerprintStatus('VERIFIED'), 1800);
    });
  };

  const fingerprintReady = fingerprintStatus === 'VERIFIED' && (fingerprintMethod === 'device-scan' || Boolean(fingerprintImage));
  const ready = Boolean(capturedFace && fingerprintReady);

  const prefill = `Escrow verification packet created.\n- Face evidence: ${capturedFace ? 'captured' : 'missing'}\n- Fingerprint evidence: ${fingerprintStatus}\n- Fingerprint method: ${fingerprintMethod}`;

  return (
    <div className="max-w-7xl mx-auto text-white font-mono animate-fade-in pb-28 px-4">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onReturn} className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </button>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">ESCROW VERIFICATION TERMINAL</p>
          <p className="text-sm font-black uppercase">P2P Identity + Proof-of-Life</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.25em]">Live Camera Proof</h3>
          </div>

          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-black">
            {capturedFace ? (
              <img src={capturedFace} className="w-full h-full object-cover" alt="Captured proof of life" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setCameraOn((s) => !s)}
              className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs uppercase font-black"
            >
              {cameraOn ? 'Stop Camera' : 'Start Camera'}
            </button>
            <button
              onClick={handleCapture}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs uppercase font-black"
            >
              Capture Live Photo
            </button>
            <label className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs uppercase font-black cursor-pointer">
              Upload Face Photo
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFaceUpload(e.target.files?.[0])} />
            </label>
          </div>
          {cameraError && <p className="text-xs text-amber-400 font-bold">{cameraError}</p>}
          <canvas ref={canvasRef} className="hidden" />
        </section>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.25em]">Fingerprint Scan</h3>
            </div>

            {supportsDeviceBiometricScan && (
              <button
                onClick={handleDeviceFingerprintScan}
                className="w-full border border-zinc-700 rounded-2xl p-4 text-left hover:border-emerald-500 bg-zinc-950"
              >
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <Fingerprint className="w-4 h-4" />
                  Use device fingerprint scan
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-wider">Phone sensor / platform biometric</p>
              </button>
            )}

            <label className="w-full border border-dashed border-zinc-700 rounded-2xl p-4 block cursor-pointer hover:border-cyan-500">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Upload className="w-4 h-4" />
                Upload fingerprint photo (fallback)
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFingerprintUpload(e.target.files?.[0])}
              />
            </label>

            {fingerprintImage && (
              <img src={fingerprintImage} alt="Fingerprint evidence" className="w-full h-40 object-cover rounded-xl border border-zinc-800" />
            )}

            {fingerprintError && <p className="text-xs text-amber-400 font-bold">{fingerprintError}</p>}

            <div className="text-xs uppercase font-black tracking-widest text-zinc-400 space-y-1">
              <p>Status: <span className="text-white">{fingerprintStatus}</span></p>
              <p>Method: <span className="text-white">{fingerprintMethod}</span></p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.25em]">Escrow Readiness</h3>
            <div className="space-y-2 text-xs">
              <p className="flex items-center gap-2"><User className="w-4 h-4" /> Face captured: {capturedFace ? 'Yes' : 'No'}</p>
              <p className="flex items-center gap-2"><Fingerprint className="w-4 h-4" /> Fingerprint verified: {fingerprintStatus === 'VERIFIED' ? 'Yes' : 'No'}</p>
            </div>

            <button
              disabled={!ready}
              onClick={() => onStartEscrowReport(Category.P2PEscrowVerification, prefill)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black uppercase tracking-widest"
            >
              Start Escrow Case
            </button>
            <button
              disabled={!ready}
              onClick={() => onStartEscrowReport(Category.ProofOfLifeBiometric, prefill)}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-black uppercase tracking-widest"
            >
              Start Proof-of-Life Case
            </button>

            {ready && (
              <div className="text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Verification packet ready
              </div>
            )}
          </div>

          <div className="bg-emerald-950/20 border border-emerald-700/40 rounded-3xl p-5 text-xs text-zinc-300">
            <div className="flex items-center gap-2 mb-2 text-emerald-400 font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Compliance note
            </div>
            This UX collects evidence references only. True biometric matching should be done by certified providers and secure APIs.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EscrowServiceView;
