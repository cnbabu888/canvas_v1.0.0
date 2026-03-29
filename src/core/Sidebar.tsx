/**
 * Sidebar Component - Left tool panel (like Ketcher)
 */

import React from 'react';
import { useCanvasStore, type ToolType } from './StateManager';

export const Sidebar: React.FC = () => {
  const activeTool = useCanvasStore((state) => state.activeTool);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);

  const tools = [
    { id: 'select', icon: '↖', label: 'Select' },
    { id: 'bond', icon: '—', label: 'Bond' },
    { id: 'chain', icon: '〰', label: 'Chain' },
    { id: 'ring', icon: '⬡', label: 'Ring' },
    { id: 'erase', icon: '🗑', label: 'Erase' },
    { id: 'text', icon: 'A', label: 'Text' },
  ];

  return (
    <div
      style={{
        width: '60px',
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 4px',
        gap: '4px',
      }}
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id as ToolType)}
          title={tool.label}
          style={{
            width: '48px',
            height: '48px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: activeTool === tool.id ? '#007bff' : '#fff',
            color: activeTool === tool.id ? '#fff' : '#000',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: activeTool === tool.id ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (activeTool !== tool.id) {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTool !== tool.id) {
              e.currentTarget.style.backgroundColor = '#fff';
            }
          }}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};
