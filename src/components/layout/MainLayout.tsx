import React, { useState } from 'react';
import { useCanvasStore } from '../../core/StateManager';
import { CommandDock } from './CommandDock';
import { 
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
    Maximize2, RotateCw 
} from 'lucide-react';

interface MainLayoutProps {
    topHeader?: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    topHeader,
    leftPanel,
    rightPanel,
    children
}) => {
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const zoom = useCanvasStore((state) => state.zoom);
    const setZoom = useCanvasStore((state) => state.setZoom);
    const pageOrientation = useCanvasStore((state) => state.pageOrientation);
    const setPageOrientation = useCanvasStore((state) => state.setPageOrientation);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            background: '#f0f0f0',
            userSelect: 'none',
        }}>
            {/* Top Header */}
            {topHeader && (
                <div style={{ flexShrink: 0, position: 'relative', zIndex: 40 }}>
                    {topHeader}
                </div>
            )}

            {/* Main Content Area — takes all remaining space between header and status bar */}
            {/* Main Content Area */}
            <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                flexDirection: 'row',
                minHeight: 0,
            }}>

                {/* Left Toolbar */}
                <div style={{ flexShrink: 0, position: 'relative', zIndex: 30 }}>
                    {leftPanel}
                </div>

                {/* Canvas Area — overflow: hidden on actual canvas only, not container */}
                <div style={{ flex: 1, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
                    {children}

                    {/* Right panel toggle button */}
                    <button
                        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 40,
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            padding: '4px',
                            borderRadius: '6px 0 0 6px',
                            boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                            color: '#6b7280',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        title={isRightPanelOpen ? 'Hide Properties' : 'Show Properties'}
                    >
                        {isRightPanelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>

                    {/* Command Dock — absolute bottom-center overlay on the canvas */}
                    <CommandDock />
                </div>

                {/* Right Properties Panel — Floating */}
                {isRightPanelOpen && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        zIndex: 50,
                        overflow: 'hidden',
                    }}>
                        {rightPanel}
                    </div>
                )}
            </div>

            {/* Bottom Status Bar — always visible, flex-none */}
            <div
                className="flex-none"
                style={{
                    height: '28px',
                    background: '#f0f0f0',
                    borderTop: '1px solid #d0d0d0',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    fontSize: '12px',
                    color: '#555',
                    fontWeight: 500,
                    zIndex: 30,
                    gap: '6px',
                    fontFamily: "'Inter', system-ui, sans-serif",
                }}
            >
                <span style={{ color: '#4caf50', fontWeight: 600, marginRight: '8px' }}>● Ready</span>

                {/* Zoom Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
                    <button
                        onClick={() => setZoom(zoom * 0.9)}
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
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={() => setZoom(zoom * 1.1)}
                        style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px', color: '#555' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ddd'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Zoom In"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <button
                        onClick={() => setZoom(1)}
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

                {/* Orientation Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        onClick={() => setPageOrientation(pageOrientation === 'portrait' ? 'landscape' : 'portrait')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid #ccc',
                            background: '#fff',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#555',
                            height: '22px',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eee'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        title="Toggle Orientation"
                    >
                        <RotateCw size={12} />
                        {pageOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                    </button>
                    <div style={{
                        width: pageOrientation === 'portrait' ? '12px' : '16px',
                        height: pageOrientation === 'portrait' ? '16px' : '12px',
                        border: '1.5px solid #888',
                        borderRadius: '1px',
                        background: '#fff',
                        transition: 'all 200ms',
                    }} />
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '16px', background: '#ccc' }} />

                {/* Coordinates */}
                <span style={{ fontSize: '11px', color: '#888' }}>x: 0, y: 0</span>
            </div>
        </div>
    );
};
