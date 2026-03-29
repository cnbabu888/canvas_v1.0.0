// Toolbar v2 — Bond button opens BondTypePopup (ChemDraw style)

import React, { useState } from 'react';
import { useCanvasStore, type ToolType } from '../core/StateManager';
import { Vec2 } from '../entities/Vec2';
import { placeRing } from '../plugins/drawing/RingTool';
import { BondTypePopup } from './BondTypePopup';

export const Toolbar: React.FC = () => {
  const activeTool     = useCanvasStore((s) => s.activeTool);
  const setActiveTool  = useCanvasStore((s) => s.setActiveTool);
  const setActiveSubTool = useCanvasStore((s) => s.setActiveSubTool);
  const undo           = useCanvasStore((s) => s.undo);
  const redo           = useCanvasStore((s) => s.redo);

  // Bond popup state
  const [showBondPopup, setShowBondPopup] = useState(false);
  const [popupPos, setPopupPos]           = useState({ x: 0, y: 0 });
  const [activeBondType, setActiveBondType]   = useState<string>('SINGLE');
  const [activeBondStereo, setActiveBondStereo] = useState<string>('NONE');

  // All non-bond tools (rendered generically)
  const tools: { id: ToolType; label: string; icon: string; shortcut: string }[] = [
    { id: 'select', label: 'Select', icon: '↖', shortcut: 'S' },
    { id: 'lasso',  label: 'Lasso',  icon: '⌾', shortcut: 'L' },
    { id: 'ring',   label: 'Ring',   icon: '⬡', shortcut: 'R' },
    { id: 'chain',  label: 'Chain',  icon: '〰',shortcut: 'C' },
    { id: 'atom',   label: 'Atom',   icon: '●', shortcut: 'A' },
    { id: 'erase',  label: 'Erase',  icon: '✕', shortcut: 'E' },
    { id: 'text',   label: 'Text',   icon: 'T',  shortcut: '' },
  ];

  const handleBondButtonMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // don't let this bubble to any backdrop
    const rect = e.currentTarget.getBoundingClientRect();
    if (showBondPopup) {
      setShowBondPopup(false); // toggle off if already open
      return;
    }
    setPopupPos({ x: rect.left, y: rect.bottom + 6 });
    setShowBondPopup(true);
    setActiveTool('bond');
  };

  const handleBondTypeSelect = (type: string, stereo: string) => {
    setActiveBondType(type);
    setActiveBondStereo(stereo);
    setActiveTool('bond');
    setActiveSubTool(`${type}_${stereo}`);
  };

  // Derive a short label for the Bond button showing current type
  const bondSubLabel =
    activeBondType === 'SINGLE' && activeBondStereo === 'NONE' ? 'Single'
    : activeBondType === 'DOUBLE'   ? 'Double'
    : activeBondType === 'TRIPLE'   ? 'Triple'
    : activeBondType === 'AROMATIC' ? 'Arom.'
    : activeBondType === 'DATIVE'   ? 'Dative'
    : activeBondStereo === 'UP'     ? 'Wedge ↑'
    : activeBondStereo === 'DOWN'   ? 'Hash ↓'
    : activeBondStereo === 'EITHER' ? 'Wavy ~'
    : 'Bond';

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'Arial, sans-serif',
    whiteSpace: 'nowrap',
    transition: 'background 0.12s, color 0.12s',
  };

  const btnInactive: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#ffffff',
    color: '#111827',
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#2563EB',
    color: '#ffffff',
    border: '1px solid #1d4ed8',
    fontWeight: 600,
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          flexWrap: 'wrap',
        }}
      >
        {/* Generic tool buttons */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            style={activeTool === tool.id ? btnActive : btnInactive}
            title={tool.shortcut ? `${tool.label} [${tool.shortcut}]` : tool.label}
          >
            <span style={{ fontSize: '16px' }}>{tool.icon}</span>
            {tool.label}
          </button>
        ))}

        {/* Bond button — special: opens popup */}
        <button
          onMouseDown={handleBondButtonMouseDown}
          style={{
            ...(activeTool === 'bond' ? btnActive : btnInactive),
            paddingRight: '10px',
          }}
          title="Bond [B] — click to choose bond type"
        >
          {/* Bond icon — mini preview of selected bond type */}
          <svg width="20" height="12" viewBox="0 0 20 12" style={{ flexShrink: 0 }}>
            {activeBondStereo === 'UP' ? (
              <polygon points="1,6 19,2 19,10" fill={activeTool === 'bond' ? '#fff' : '#222'} />
            ) : activeBondStereo === 'DOWN' ? (
              <>
                {[0,1,2,3,4].map((i) => {
                  const x = 1 + i * 4.5;
                  const h = i * 2.5;
                  return (
                    <line key={i} x1={x} y1={6 - h} x2={x} y2={6 + h}
                      stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.4" />
                  );
                })}
              </>
            ) : activeBondType === 'DOUBLE' ? (
              <>
                <line x1="1" y1="4" x2="19" y2="4" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.4"/>
                <line x1="1" y1="8" x2="19" y2="8" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.4"/>
              </>
            ) : activeBondType === 'TRIPLE' ? (
              <>
                <line x1="1" y1="3" x2="19" y2="3" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.2"/>
                <line x1="1" y1="6" x2="19" y2="6" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.2"/>
                <line x1="1" y1="9" x2="19" y2="9" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.2"/>
              </>
            ) : activeBondType === 'AROMATIC' ? (
              <>
                <line x1="1" y1="4" x2="19" y2="4" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.4"/>
                <line x1="1" y1="8" x2="19" y2="8" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.4" strokeDasharray="3 2"/>
              </>
            ) : activeBondStereo === 'EITHER' ? (
              <path d="M1,6 Q4,2 7,6 Q10,10 13,6 Q16,2 19,6"
                fill="none" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.5"/>
            ) : (
              // Single (default)
              <line x1="1" y1="6" x2="19" y2="6" stroke={activeTool === 'bond' ? '#fff' : '#222'} strokeWidth="1.8" strokeLinecap="round"/>
            )}
          </svg>

          {bondSubLabel}

          {/* Dropdown caret */}
          <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '2px' }}>▾</span>
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Undo / Redo */}
        <button onClick={undo} style={btnInactive} title="Undo [Ctrl+Z]">↶ Undo</button>
        <button onClick={redo} style={btnInactive} title="Redo [Ctrl+Y]">↷ Redo</button>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Quick actions */}
        <button
          onClick={() => placeRing(new Vec2(500, 300), 6)}
          style={{ ...btnInactive, backgroundColor: '#16a34a', color: '#fff', border: '1px solid #15803d' }}
          title="Add benzene ring"
        >
          ⬡ Add Benzene
        </button>
        <button
          onClick={() => useCanvasStore.getState().reset()}
          style={{ ...btnInactive, backgroundColor: '#dc2626', color: '#fff', border: '1px solid #b91c1c' }}
          title="Clear canvas"
        >
          ✕ Clear
        </button>
      </div>

      {/* Bond Type Popup */}
      {showBondPopup && (
        <BondTypePopup
          onSelect={handleBondTypeSelect}
          onClose={() => setShowBondPopup(false)}
          position={popupPos}
          currentType={activeBondType}
          currentStereo={activeBondStereo}
        />
      )}
    </>
  );
};
