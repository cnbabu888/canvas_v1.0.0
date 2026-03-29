// @ts-nocheck
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Map as MapIcon, X } from 'lucide-react';

interface MinimapProps {
    engineRef: React.MutableRefObject<any>;
}

const MINIMAP_W = 200;
const MINIMAP_H = 140;
const PADDING = 20;

export const Minimap: React.FC<MinimapProps> = ({ engineRef }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const molecule = useCanvasStore((state) => state.molecule);
    const version = useCanvasStore((state) => state.version);
    const zoom = useCanvasStore((state) => state.zoom);
    const [visible, setVisible] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    // Calculate bounding box & transform for minimap
    const getMoleculeTransform = useCallback(() => {
        if (!molecule || molecule.atoms.size === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const atom of molecule.atoms.values()) {
            if (atom.pos.x < minX) minX = atom.pos.x;
            if (atom.pos.y < minY) minY = atom.pos.y;
            if (atom.pos.x > maxX) maxX = atom.pos.x;
            if (atom.pos.y > maxY) maxY = atom.pos.y;
        }

        const molW = maxX - minX || 1;
        const molH = maxY - minY || 1;
        const scaleX = (MINIMAP_W - PADDING * 2) / molW;
        const scaleY = (MINIMAP_H - PADDING * 2) / molH;
        const scale = Math.min(scaleX, scaleY, 2); // Cap scale for small molecules

        const offsetX = (MINIMAP_W - molW * scale) / 2 - minX * scale;
        const offsetY = (MINIMAP_H - molH * scale) / 2 - minY * scale;

        return { scale, offsetX, offsetY, minX, minY, maxX, maxY };
    }, [molecule, version]);

    // Render minimap
    useEffect(() => {
        if (!visible) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = MINIMAP_W * 2; // HiDPI
        canvas.height = MINIMAP_H * 2;
        ctx.scale(2, 2);

        // Background
        ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

        if (!molecule || molecule.atoms.size === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No structure', MINIMAP_W / 2, MINIMAP_H / 2);
            return;
        }

        const tf = getMoleculeTransform();
        if (!tf) return;

        const toMini = (x: number, y: number) => ({
            x: x * tf.scale + tf.offsetX,
            y: y * tf.scale + tf.offsetY,
        });

        // Draw bonds
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        if (molecule.bonds) {
            molecule.bonds.forEach((bond: any) => {
                const a = molecule.atoms.get(bond.atomA);
                const b = molecule.atoms.get(bond.atomB);
                if (a && b) {
                    const p1 = toMini(a.pos.x, a.pos.y);
                    const p2 = toMini(b.pos.x, b.pos.y);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);

                    if (bond.order === 2) {
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = '#94a3b8';
                    } else if (bond.order === 3) {
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = '#64748b';
                    } else {
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = '#cbd5e1';
                    }
                    ctx.stroke();
                }
            });
        }

        // Draw atoms as colored dots
        molecule.atoms.forEach((atom: any) => {
            const p = toMini(atom.pos.x, atom.pos.y);
            const radius = atom.element === 'C' ? 1.5 : 2.5;

            let color = '#475569'; // Default slate
            if (atom.element === 'N') color = '#3b82f6';
            else if (atom.element === 'O') color = '#ef4444';
            else if (atom.element === 'S') color = '#eab308';
            else if (atom.element === 'F' || atom.element === 'Cl' || atom.element === 'Br' || atom.element === 'I') color = '#22c55e';
            else if (atom.element === 'P') color = '#f97316';

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw viewport rectangle
        if (engineRef.current) {
            const engine = engineRef.current;
            const viewTransform = engine.getTransform();
            const w = engine.width || 800;
            const h = engine.height || 600;

            // Screen corners → world coords
            const tl = engine.screenToWorld({ x: 0, y: 0 });
            const br = engine.screenToWorld({ x: w, y: h });

            const vpTL = toMini(tl.x, tl.y);
            const vpBR = toMini(br.x, br.y);

            const vpW = vpBR.x - vpTL.x;
            const vpH = vpBR.y - vpTL.y;

            ctx.strokeStyle = '#4f46e5';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 2]);
            ctx.strokeRect(vpTL.x, vpTL.y, vpW, vpH);
            ctx.setLineDash([]);

            // Semi-transparent fill
            ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
            ctx.fillRect(vpTL.x, vpTL.y, vpW, vpH);
        }
    }, [molecule, version, zoom, visible, getMoleculeTransform]);

    // Click/drag on minimap to navigate
    const handleMinimapInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (!engineRef.current || !molecule || molecule.atoms.size === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (MINIMAP_W / rect.width);
        const my = (e.clientY - rect.top) * (MINIMAP_H / rect.height);

        const tf = getMoleculeTransform();
        if (!tf) return;

        // Convert minimap coords to world coords
        const worldX = (mx - tf.offsetX) / tf.scale;
        const worldY = (my - tf.offsetY) / tf.scale;

        // Pan the engine so this world point is at center of screen
        const engine = engineRef.current;
        const w = engine.width || 800;
        const h = engine.height || 600;
        const currentScale = engine.getTransform().a;

        engine.getTransform().e = w / 2 - worldX * currentScale;
        engine.getTransform().f = h / 2 - worldY * currentScale;
        engine.invalidate();
    }, [molecule, version, getMoleculeTransform]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        handleMinimapInteraction(e);

        const onMouseMove = (ev: MouseEvent) => handleMinimapInteraction(ev);
        const onMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Don't show if molecule is very small
    if (!molecule || molecule.atoms.size < 2) return null;

    if (!visible) {
        return (
            <button
                onClick={() => setVisible(true)}
                style={{
                    position: 'fixed',
                    bottom: '96px',
                    right: '24px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                }}
                title="Show Minimap"
            >
                <MapIcon size={16} style={{ color: '#4f46e5' }} />
            </button>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '96px',
                right: '24px',
                width: `${MINIMAP_W}px`,
                height: `${MINIMAP_H}px`,
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                zIndex: 50,
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div style={{
                position: 'absolute',
                top: '4px',
                left: '8px',
                right: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 2,
            }}>
                <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Minimap
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); setVisible(false); }}
                    style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                    }}
                    title="Hide Minimap"
                >
                    <X size={12} />
                </button>
            </div>

            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: isDragging ? 'grabbing' : 'crosshair',
                }}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
};
