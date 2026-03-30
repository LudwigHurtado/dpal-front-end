import React from 'react';
import type { Charity } from '../types';

function CharitySelectorModalImpl({
  open,
  charities,
  selectedCharityId,
  onSelect,
  onClose,
}: {
  open: boolean;
  charities: Charity[];
  selectedCharityId: string | null;
  onSelect: (c: Charity) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Choose charity">
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: 'rgba(2,6,23,0.35)' }}
        onClick={onClose}
        aria-label="Close"
      />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full" style={{ maxWidth: 720 }}>
        <div className="gw-card p-6" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="gw-card-title">Choose a charity</div>
              <div className="gw-muted mt-1">Attach a cause to this ride (optional).</div>
            </div>
            <button type="button" className="gw-button gw-button-secondary" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {charities.map((c) => {
              const active = c.id === selectedCharityId;
              return (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left gw-card p-4"
                  style={{
                    boxShadow: 'none',
                    background: active ? 'rgba(0,119,200,0.08)' : 'rgba(241,245,249,0.65)',
                    borderColor: active ? 'rgba(0,119,200,0.25)' : 'rgba(15,23,42,0.10)',
                  }}
                  onClick={() => onSelect(c)}
                >
                  <div className="text-sm font-extrabold text-slate-900">{c.name}</div>
                  <div className="text-sm text-slate-600">
                    {c.distanceMiles ?? '—'} mi away • {c.category}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharitySelectorModalImpl;

// Named export for compatibility with the snippet style.
export function CharitySelectorModal(props: React.ComponentProps<typeof CharitySelectorModalImpl>) {
  return <CharitySelectorModalImpl {...props} />;
}

