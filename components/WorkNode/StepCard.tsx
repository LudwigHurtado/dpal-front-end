import React, { useRef, useState } from 'react';
import { type WorkStep } from '../../types';
import { CheckCircle, Camera, Video, FileText, MapPin, Upload, X } from '../icons';

interface StepCardProps {
  step: WorkStep;
  isActive: boolean;
  canComplete: boolean;
  onToggleComplete: (stepId: string) => void;
  onProofUpload?: (stepId: string, proofUrl: string, proofType: string) => void;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  isActive,
  canComplete,
  onToggleComplete,
  onProofUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(step.proofUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const getProofIcon = () => {
    switch (step.proofType) {
      case 'photo':
        return <Camera className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'location':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Upload className="w-5 h-5" />;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (step.proofType === 'photo' || step.proofType === 'video') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProofPreview(result);
        onProofUpload?.(step.id, result, step.proofType || 'photo');
      };
      reader.readAsDataURL(file);
    } else if (step.proofType === 'text') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProofPreview(result);
        onProofUpload?.(step.id, result, 'text');
      };
      reader.readAsText(file);
    }
  };

  const handleLocationCapture = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = `${position.coords.latitude},${position.coords.longitude}`;
          setProofPreview(location);
          onProofUpload?.(step.id, location, 'location');
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Failed to capture location. Please try again.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleProofClick = () => {
    if (step.proofType === 'location') {
      handleLocationCapture();
    } else {
      fileInputRef.current?.click();
    }
  };

  const clearProof = () => {
    setProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`p-6 rounded-2xl border-2 transition-all ${
        step.isComplete
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : isActive
          ? 'bg-cyan-500/10 border-cyan-500/50'
          : 'bg-zinc-950 border-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-4 flex-grow">
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center font-black text-xs ${
                step.isComplete
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : isActive
                  ? 'bg-cyan-500 border-cyan-400 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600'
              }`}
            >
              {step.order}
            </div>
          </div>
          <div className="flex-grow min-w-0">
            <h4 className="text-sm font-black uppercase tracking-tighter text-white mb-2">
              {step.name}
            </h4>
            <p className="text-xs text-zinc-400 font-bold leading-relaxed mb-2">
              {step.task}
            </p>
            <p className="text-[10px] text-zinc-600 font-bold italic border-l-2 border-zinc-800 pl-3">
              {step.instruction}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggleComplete(step.id)}
          disabled={!canComplete || !step.isComplete}
          className={`flex-shrink-0 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
            step.isComplete
              ? 'bg-emerald-500 border-emerald-400 text-white'
              : canComplete
              ? 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-cyan-500 hover:text-cyan-400'
              : 'bg-zinc-950 border-zinc-800 text-zinc-700 cursor-not-allowed'
          }`}
        >
          {step.isComplete && <CheckCircle className="w-5 h-5" />}
        </button>
      </div>

      {step.requiresProof && (
        <div className="mt-4 space-y-3">
          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            {getProofIcon()}
            <span>Proof Required: {step.proofType?.toUpperCase() || 'EVIDENCE'}</span>
          </label>
          
          {step.proofType === 'location' ? (
            <button
              onClick={handleProofClick}
              disabled={step.isComplete}
              className="w-full p-4 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl hover:border-cyan-500/50 transition-all disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3 text-zinc-500">
                <MapPin className="w-5 h-5" />
                <span className="text-xs font-black uppercase">
                  {proofPreview ? 'Location Captured' : 'Capture Location'}
                </span>
              </div>
              {proofPreview && (
                <p className="text-[9px] text-cyan-400 mt-2 font-mono">{proofPreview}</p>
              )}
            </button>
          ) : step.proofType === 'text' ? (
            <div className="space-y-2">
              <textarea
                value={proofPreview || ''}
                onChange={(e) => {
                  setProofPreview(e.target.value);
                  onProofUpload?.(step.id, e.target.value, 'text');
                }}
                disabled={step.isComplete}
                placeholder="Enter proof text here..."
                className="w-full p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl text-xs text-white font-mono resize-none focus:border-cyan-500 outline-none disabled:opacity-50"
                rows={4}
              />
            </div>
          ) : (
            <div
              onClick={handleProofClick}
              className={`relative w-full aspect-video rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-all ${
                proofPreview
                  ? 'border-cyan-500/50'
                  : 'border-zinc-800 hover:border-cyan-500/50'
              } ${step.isComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {proofPreview ? (
                <>
                  <img
                    src={proofPreview}
                    alt="Proof"
                    className="w-full h-full object-cover"
                  />
                  {!step.isComplete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearProof();
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/60 rounded-lg hover:bg-black/80 transition-all"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-600">
                  {getProofIcon()}
                  <span className="text-[9px] font-black uppercase mt-2">
                    Upload {step.proofType || 'Proof'}
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  step.proofType === 'photo'
                    ? 'image/*'
                    : step.proofType === 'video'
                    ? 'video/*'
                    : '*/*'
                }
                onChange={handleFileSelect}
                className="hidden"
                disabled={step.isComplete}
              />
            </div>
          )}
          
          {proofPreview && !step.isComplete && (
            <button
              onClick={() => onToggleComplete(step.id)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              Mark Step Complete
            </button>
          )}
        </div>
      )}

      {!step.requiresProof && !step.isComplete && canComplete && (
        <button
          onClick={() => onToggleComplete(step.id)}
          className="w-full mt-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95"
        >
          Complete Step
        </button>
      )}
    </div>
  );
};

export default StepCard;
