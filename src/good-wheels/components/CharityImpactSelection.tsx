import React from 'react';
import type { CharityImpactCategory } from '../data/charityImpactCategories';

export type CharityImpactSelectionProps = {
  categories: CharityImpactCategory[];
  selectedId: string | null;
  onSelect: (category: CharityImpactCategory) => void;
};

const CharityImpactSelection: React.FC<CharityImpactSelectionProps> = ({ categories, selectedId, onSelect }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {categories.map((cat) => {
        const selected = selectedId === cat.id;
        return (
          <div
            key={cat.id}
            style={{
              borderRadius: 16,
              border: selected ? '2px solid #0077C8' : '1px solid rgba(15,23,42,0.10)',
              background: selected ? 'rgba(0, 119, 200, 0.06)' : '#ffffff',
              boxShadow: selected ? '0 0 0 3px rgba(0, 119, 200, 0.18)' : '0 4px 14px rgba(15,23,42,0.05)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'box-shadow 120ms ease, background 120ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                aria-hidden
                style={{
                  flex: '0 0 auto',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: selected ? 'rgba(0, 119, 200, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                {cat.icon ?? '💛'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{cat.title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#57534e', marginTop: 4, lineHeight: 1.4 }}>
                  {cat.subtitle}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 6, lineHeight: 1.45 }}>
                  {cat.description}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(cat)}
              className={selected ? 'gw-button gw-button-primary' : 'gw-button'}
              style={{
                alignSelf: 'stretch',
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 800,
                borderRadius: 12,
                cursor: 'pointer',
                border: selected ? 'none' : '1px solid rgba(15,23,42,0.12)',
                background: selected ? undefined : '#ffffff',
                color: selected ? undefined : '#0f172a',
              }}
            >
              {selected ? 'Selected' : 'Select'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CharityImpactSelection;
