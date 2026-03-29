/**
 * CommandDock — Bottom-center floating AI / Strategy / Safety panel.
 *
 * Wired to Canvas v1.0.0 (core/StateManager):
 *  - Strategy button: summarises atom/bond count from live molecule state
 *  - Safety button: checks for dangerous element patterns (inline, no external libs)
 *  - AI chat input: prepares context for future AI service call
 *
 * Layout: Pure inline CSS — zero Tailwind class dependencies.
 * Position: absolute, bottom of canvas, horizontally centred.
 */

import React, { useState } from 'react';
import { useCanvasStore } from '../../core/StateManager';

// ─── SVG Icons (self-contained) ──────────────────────────────────────────────

const StrategyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SafetyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Small Info Popup ─────────────────────────────────────────────────────────

interface InfoPopupProps {
  title: string;
  accentColor: string;
  lines: string[];
  onClose: () => void;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ title, accentColor, lines, onClose }) => (
  <div style={{
    position: 'absolute',
    bottom: 'calc(100% + 10px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff',
    border: `1.5px solid ${accentColor}`,
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
    padding: '14px 18px',
    minWidth: '270px',
    maxWidth: '380px',
    fontFamily: "'Inter', system-ui, sans-serif",
    zIndex: 300,
    whiteSpace: 'normal' as const,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: accentColor }}>{title}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', lineHeight: 1, padding: '0 2px' }}
      >×</button>
    </div>
    {lines.length === 0
      ? <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Draw a molecule on the canvas first.</p>
      : lines.map((l, i) => (
          <p key={i} style={{ fontSize: '12px', color: '#374151', margin: '5px 0', lineHeight: 1.55 }}>{l}</p>
        ))
    }
  </div>
);

// ─── Inline Safety Check (no external lib) ───────────────────────────────────
// Checks atom element list against known hazardous/reactive categories.

const HAZARDOUS_ELEMENTS: Record<string, string> = {
  F:  '🔥 Fluorine — highly reactive, corrosive gas',
  Cl: '☠️ Chlorine — toxic gas; many organochlorines are regulated',
  Br: '⚠️ Bromine — corrosive, volatile liquid',
  I:  '⚠️ Iodine — irritant; organoiodides can be reactive',
  P:  '💥 Phosphorus — many P-compounds are acutely toxic',
  S:  '🌡️ Sulfur — some thiol/sulfide structures are malodorous/toxic',
  N:  '⚠️ Nitrogen — many N-heterocycles / nitro-groups have significant bioactivity',
  As: '☠️ Arsenic — highly toxic heavy metalloid',
  Hg: '☠️ Mercury — neurotoxic heavy metal',
  Pb: '☠️ Lead — neurotoxic heavy metal',
  Cd: '☠️ Cadmium — carcinogenic heavy metal',
};

function runSafetyCheck(
  atoms: Map<number, { label: string; charge?: number }>
): string[] {
  if (atoms.size === 0) return [];
  const results: string[] = [];
  const seen = new Set<string>();

  for (const atom of atoms.values()) {
    const el = atom.label;
    if (!seen.has(el) && HAZARDOUS_ELEMENTS[el]) {
      results.push(HAZARDOUS_ELEMENTS[el]);
      seen.add(el);
    }
  }

  if (results.length === 0) {
    results.push('✅ No known hazardous elements detected.');
    results.push('🟢 Structure appears to use standard, safe elements (C, H, O, N, …)');
  } else {
    results.unshift(`Found ${results.length} potential hazard flag${results.length > 1 ? 's' : ''}:`);
  }
  return results;
}

// ─── Inline Strategy Summary (no external lib) ───────────────────────────────

function runStrategySummary(
  atoms: Map<number, { label: string }>,
  bonds: Map<number, { type?: string; order?: number }>
): string[] {
  if (atoms.size === 0) return [];

  const elementCounts: Record<string, number> = {};
  for (const a of atoms.values()) {
    elementCounts[a.label] = (elementCounts[a.label] || 0) + 1;
  }

  const formula = Object.entries(elementCounts)
    .sort(([a], [b]) => (a === 'C' ? -1 : b === 'C' ? 1 : a.localeCompare(b)))
    .map(([el, n]) => `${el}${n > 1 ? n : ''}`)
    .join('');

  const doubleBonds = Array.from(bonds.values()).filter(b => b.order === 2 || b.type === 'DOUBLE').length;
  const tripleBonds = Array.from(bonds.values()).filter(b => b.order === 3 || b.type === 'TRIPLE').length;
  const totalBonds = bonds.size;

  return [
    `📐 Atoms: ${atoms.size}  |  Bonds: ${totalBonds}`,
    `🧪 Formula (approx): ${formula || '—'}`,
    doubleBonds > 0 ? `🔗 Double bonds: ${doubleBonds}` : '',
    tripleBonds > 0 ? `⚡ Triple bonds: ${tripleBonds}` : '',
    `💡 Use Ctrl+C to copy SMILES, then query an AI or database.`,
  ].filter(Boolean);
}

// ─── CommandDock Component ────────────────────────────────────────────────────

export const CommandDock: React.FC = () => {
  const [input, setInput] = useState('');
  const [hoveredStrategy, setHoveredStrategy] = useState(false);
  const [hoveredSafety, setHoveredSafety] = useState(false);
  const [hoveredSend, setHoveredSend] = useState(false);
  const [panel, setPanel] = useState<'strategy' | 'safety' | null>(null);
  const [panelLines, setPanelLines] = useState<string[]>([]);

  // Pull live molecule data from the correct store
  const molecule = useCanvasStore((s) => s.molecule);

  // ── Strategy handler ──────────────────────────────────────────────────────
  const handleStrategy = () => {
    if (panel === 'strategy') { setPanel(null); return; }
    setPanelLines(runStrategySummary(molecule.atoms as any, molecule.bonds as any));
    setPanel('strategy');
  };

  // ── Safety handler ────────────────────────────────────────────────────────
  const handleSafety = () => {
    if (panel === 'safety') { setPanel(null); return; }
    setPanelLines(runSafetyCheck(molecule.atoms as any));
    setPanel('safety');
  };

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const atomCount = molecule.atoms.size;
    console.log('[Chemora AI] Query:', text, '| Atoms:', atomCount);
    // TODO: POST to AI backend with molecule context
    alert(`🤖 Query sent to Chemora AI:\n"${text}"\n\n(${atomCount} atoms on canvas)`);
    setInput('');
  };

  // ── Button style helper ───────────────────────────────────────────────────
  const btnStyle = (hovered: boolean, activeColor: string, isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    background: isActive ? `${activeColor}18` : hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '12px',
    fontWeight: 500,
    color: isActive ? activeColor : hovered ? activeColor : '#374151',
    transition: 'all 150ms',
    whiteSpace: 'nowrap',
  });

  return (
    <>
      <style>{`
        @keyframes cmdSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(14px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        animation: 'cmdSlideUp 0.25s ease-out both',
        pointerEvents: 'auto',
      }}>
        {/* Info panel (pops up above the dock) */}
        {panel && (
          <InfoPopup
            title={panel === 'strategy' ? '🔬 Strategy Advisor' : '🛡️ Safety Check'}
            accentColor={panel === 'strategy' ? '#4f46e5' : '#e11d48'}
            lines={panelLines}
            onClose={() => setPanel(null)}
          />
        )}

        {/* Dock bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.93)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '14px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.07)',
          padding: '6px 10px',
        }}>
          {/* Strategy */}
          <button
            style={btnStyle(hoveredStrategy, '#4f46e5', panel === 'strategy')}
            onMouseEnter={() => setHoveredStrategy(true)}
            onMouseLeave={() => setHoveredStrategy(false)}
            onClick={handleStrategy}
            title="Strategy Advisor"
          >
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: panel === 'strategy' ? '#4f46e5' : hoveredStrategy ? '#4f46e5' : '#6366f1' }}>
                <StrategyIcon />
              </span>
              {/* Online indicator dot */}
              <span style={{
                position: 'absolute', top: -2, right: -3,
                width: 6, height: 6,
                background: '#22c55e', borderRadius: '50%',
                border: '1.5px solid white',
              }} />
            </span>
            Strategy
          </button>

          {/* Safety */}
          <button
            style={btnStyle(hoveredSafety, '#e11d48', panel === 'safety')}
            onMouseEnter={() => setHoveredSafety(true)}
            onMouseLeave={() => setHoveredSafety(false)}
            onClick={handleSafety}
            title="Safety Check"
          >
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: panel === 'safety' ? '#e11d48' : hoveredSafety ? '#e11d48' : '#f43f5e' }}>
                <SafetyIcon />
              </span>
              <span style={{
                position: 'absolute', top: -2, right: -3,
                width: 6, height: 6,
                background: '#22c55e', borderRadius: '50%',
                border: '1.5px solid white',
              }} />
            </span>
            Safety
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

          {/* AI input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Chemora AI…"
            style={{
              width: '200px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              fontFamily: "'Inter', system-ui, sans-serif",
              color: '#1a1a2e',
              fontWeight: 450,
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            onMouseEnter={() => setHoveredSend(true)}
            onMouseLeave={() => setHoveredSend(false)}
            title="Send to AI"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              background: hoveredSend ? '#4338ca' : '#4f46e5',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 150ms, transform 100ms',
              transform: hoveredSend ? 'scale(1.08)' : 'scale(1)',
              boxShadow: '0 2px 8px rgba(79,70,229,0.38)',
              flexShrink: 0,
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
};
