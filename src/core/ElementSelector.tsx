/**
 * Element Selector - Right sidebar for changing elements
 */

import React from 'react';
import { useCanvasStore } from './StateManager';

const elements = [
  { symbol: 'H', color: '#000' },
  { symbol: 'C', color: '#000' },
  { symbol: 'N', color: '#0000FF' },
  { symbol: 'O', color: '#FF0000' },
  { symbol: 'S', color: '#FFFF00' },
  { symbol: 'P', color: '#FFA500' },
  { symbol: 'F', color: '#00FF00' },
  { symbol: 'Cl', color: '#00FF00' },
  { symbol: 'Br', color: '#8B0000' },
  { symbol: 'I', color: '#8B008B' },
];

export const ElementSelector: React.FC = () => {
  // Use global store so BondTool, RingTool, and AtomTool can read the active element
  const selectedElement = useCanvasStore((state) => state.activeElement);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setActiveSubTool = useCanvasStore((state) => state.setActiveSubTool);
  const setSelectedElement = useCanvasStore((state) => state.setActiveElement);

  const handleElementClick = (symbol: string) => {
    setSelectedElement(symbol);
    setActiveSubTool(symbol);   // store element in activeSubTool for Canvas to read
    setActiveTool('atom');       // switch to atom tool automatically
  };

  return (
    <div
      style={{
        width: '60px',
        backgroundColor: '#f5f5f5',
        borderLeft: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 4px',
        gap: '4px',
        overflowY: 'auto',
      }}
    >
      <div style={{ 
        fontSize: '11px', 
        fontWeight: 'bold', 
        textAlign: 'center',
        marginBottom: '4px',
        color: '#666',
      }}>
        Elements
      </div>
      
      {elements.map((elem) => (
        <button
          key={elem.symbol}
          onClick={() => handleElementClick(elem.symbol)}
          title={elem.symbol}
          style={{
            width: '48px',
            height: '40px',
            border: selectedElement === elem.symbol ? '2px solid #007bff' : '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#fff',
            color: elem.color,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e9ecef';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
          }}
        >
          {elem.symbol}
        </button>
      ))}
    </div>
  );
};

