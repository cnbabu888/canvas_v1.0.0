/**
 * BondTypePopup v2
 * Uses ReactDOM.createPortal to render directly into document.body,
 * bypassing any z-index stacking context from parent elements.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface BondTypeOption {
  id: string;
  label: string;
  iconSvg: React.ReactNode;
  type: string;
  stereo: string;
  separator?: boolean;
}

const OPTS: BondTypeOption[] = [
  {
    id: 'single', label: 'Single Bond',
    iconSvg: <svg width="32" height="14"><line x1="2" y1="7" x2="30" y2="7" stroke="#222" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    type: 'SINGLE', stereo: 'NONE',
  },
  {
    id: 'double', label: 'Double Bond',
    iconSvg: <svg width="32" height="14"><line x1="2" y1="4" x2="30" y2="4" stroke="#222" strokeWidth="1.5"/><line x1="2" y1="10" x2="30" y2="10" stroke="#222" strokeWidth="1.5"/></svg>,
    type: 'DOUBLE', stereo: 'NONE',
  },
  {
    id: 'triple', label: 'Triple Bond',
    iconSvg: <svg width="32" height="14"><line x1="2" y1="2" x2="30" y2="2" stroke="#222" strokeWidth="1.3"/><line x1="2" y1="7" x2="30" y2="7" stroke="#222" strokeWidth="1.3"/><line x1="2" y1="12" x2="30" y2="12" stroke="#222" strokeWidth="1.3"/></svg>,
    type: 'TRIPLE', stereo: 'NONE',
  },
  {
    id: 'aromatic', label: 'Aromatic Bond',
    iconSvg: <svg width="32" height="14"><line x1="2" y1="4" x2="30" y2="4" stroke="#222" strokeWidth="1.5"/><line x1="2" y1="10" x2="30" y2="10" stroke="#222" strokeWidth="1.5" strokeDasharray="4 3"/></svg>,
    type: 'AROMATIC', stereo: 'NONE',
  },
  { id: 'sep1', label: '', iconSvg: null, type: '', stereo: '', separator: true },
  {
    id: 'wedge-up', label: 'Wedge Bond  (Up)',
    iconSvg: <svg width="32" height="14"><polygon points="2,7 30,2 30,12" fill="#222"/></svg>,
    type: 'SINGLE', stereo: 'UP',
  },
  {
    id: 'wedge-down', label: 'Hash Bond  (Down)',
    iconSvg: (
      <svg width="32" height="14">
        {[0,1,2,3,4,5,6].map((i) => {
          const x = 2 + i * 4;
          const h = 0.5 + i * 0.95;
          return <line key={i} x1={x} y1={7-h} x2={x} y2={7+h} stroke="#222" strokeWidth="1.4"/>;
        })}
      </svg>
    ),
    type: 'SINGLE', stereo: 'DOWN',
  },
  {
    id: 'wavy', label: 'Wavy Bond  (Either)',
    iconSvg: <svg width="32" height="14"><path d="M2,7 Q5,2 9,7 Q13,12 17,7 Q21,2 25,7 Q29,12 31,7" fill="none" stroke="#222" strokeWidth="1.5"/></svg>,
    type: 'SINGLE', stereo: 'EITHER',
  },
  { id: 'sep2', label: '', iconSvg: null, type: '', stereo: '', separator: true },
  {
    id: 'dative', label: 'Dative Bond',
    iconSvg: <svg width="32" height="14"><line x1="2" y1="7" x2="24" y2="7" stroke="#222" strokeWidth="1.5"/><polygon points="22,4 31,7 22,10" fill="#222"/></svg>,
    type: 'DATIVE', stereo: 'NONE',
  },
];

interface Props {
  onSelect: (type: string, stereo: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
  currentType?: string;
  currentStereo?: string;
}

export const BondTypePopup: React.FC<Props> = ({
  onSelect, onClose, position,
  currentType = 'SINGLE',
  currentStereo = 'NONE',
}) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const popup = (
    <>
      {/* Transparent backdrop */}
      <div
        onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'transparent',
        }}
      />

      {/* Popup card — rendered at fixed position in viewport */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: Math.min(position.y, window.innerHeight - 400),
          left: Math.min(position.x, window.innerWidth - 220),
          width: 210,
          backgroundColor: '#fff',
          border: '1px solid #d1d5db',
          borderRadius: 9,
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          zIndex: 9999,
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '8px 12px 6px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#6b7280',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          Bond Type
        </div>

        {/* Options */}
        <div style={{ padding: '4px' }}>
          {OPTS.map((opt) => {
            if (opt.separator) {
              return <div key={opt.id} style={{ height: 1, backgroundColor: '#e5e7eb', margin: '3px 4px' }} />;
            }

            const isActive = opt.type === currentType && opt.stereo === currentStereo;

            return (
              <button
                key={opt.id}
                onClick={() => { onSelect(opt.type, opt.stereo); onClose(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '7px 10px',
                  gap: 10,
                  border: isActive ? '1.5px solid #2563EB' : '1.5px solid transparent',
                  borderRadius: 5,
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#111827',
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? '#EFF6FF' : 'transparent';
                }}
              >
                <span style={{ display: 'flex', width: 32, alignItems: 'center', flexShrink: 0 }}>
                  {opt.iconSvg}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return createPortal(popup, document.body);
};

// Export options so Toolbar can use them for the live preview icon
export { OPTS as BOND_TYPE_OPTIONS };
