import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from '../../icons/LucideIcons';
import { useCanvasStore } from '../../core/StateManager';

export const StatusBar: React.FC = () => {
  const store = useCanvasStore();

  return (
    <div
      style={{
        height: '28px',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #d0d0d0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        fontSize: '12px',
        color: '#555',
        fontWeight: 500,
        gap: '6px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <span style={{ color: '#4caf50', fontWeight: 600, marginRight: '8px' }}>● Ready</span>

      {/* Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
        <button
          onClick={() => store.setZoom(store.zoom * 0.9)}
          style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', color: '#555' }}
          onMouseEnter={e => e.currentTarget.style.background = '#ddd'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <span style={{
          minWidth: '48px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 600,
          color: '#333',
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '3px',
          padding: '1px 6px',
        }}>
          {Math.round(store.zoom * 100)}%
        </span>
        <button
          onClick={() => store.setZoom(store.zoom * 1.1)}
          style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', color: '#555' }}
          onMouseEnter={e => e.currentTarget.style.background = '#ddd'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => store.setZoom(1)}
          style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', color: '#555', marginLeft: '2px' }}
          onMouseEnter={e => e.currentTarget.style.background = '#ddd'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Reset to 100%"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: '#ccc' }} />

      {/* Coordinates (Placeholder) */}
      <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
        Canvas v1.0.0 Mode
      </span>
    </div>
  );
};
