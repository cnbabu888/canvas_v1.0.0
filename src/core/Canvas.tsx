/**
 * Canvas v3 — Full ChemDraw-Compatible Drawing Canvas
 *
 * Wired Tools:
 * ─ select     Box selection (rubber-band), shift+click multi-select, double-click connected
 * ─ lasso      Freehand polygon selection
 * ─ bond       Single/Double/Triple/Wedge/Hash/Wavy/Dative/Aromatic — ACS 30° snapping
 * ─ ring       Cyclopropane–Cyclooctane, Benzene, Naphthalene, Anthracene — ACS geometry
 * ─ atom       Click atom to change element / click empty to place
 * ─ groups     Me, Et, iPr, tBu, Ph, Bn functional groups
 * ─ erase      Click atom or bond to erase
 * ─ scissor    Click bond to cut (homolytic/heterolytic per store.scissorMode)
 * ─ attributes Click atom to modify charge/radical (+1, -1, radical)
 * ─ pan        Drag to pan canvas viewport
 * ─ text       Click to place text label (basic)
 * ─ reaction   Click to place reaction / equilibrium / retro arrow
 * ─ mechanism  Click atom/bond → drag to atom/bond to draw electron-push arrow
 *
 * ACS Rules Enforced:
 * ─ Bond angles snap to 30° grid
 * ─ Standard bond length 40px
 * ─ Ring geometry: R = L / (2·sin(π/n))
 * ─ Zigzag chain convention
 * ─ Ring fusion by angular gap analysis
 *
 * ChemDraw Hotkeys:
 *   S / ESC  → Select tool        B → Bond tool
 *   L / F    → Lasso tool         R → Ring tool
 *   A        → Atom tool          E / Q → Erase tool
 *   Ctrl+Z   → Undo               Ctrl+Y / Ctrl+Shift+Z → Redo
 *   Ctrl+A   → Select All         Delete / Bksp → Delete selected
 *   Ctrl+C   → Copy               Ctrl+X → Cut       Ctrl+V → Paste
 *   Ctrl+0   → Fit view           +/- → Zoom
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from './StateManager';
import { CanvasRenderer } from '../renderers/CanvasRenderer';
import { Vec2 } from '../entities/Vec2';
import { CANVAS_CONSTANTS } from '../engines/ChemistryConstants';

import { BondTool }            from '../plugins/drawing/BondTool';
import { RingTool }             from '../plugins/drawing/RingTool';
import { AtomTool }             from '../plugins/drawing/AtomTool';

import { SelectTool }           from '../tools/SelectionTools/SelectTool';
import { LassoTool }            from '../tools/SelectionTools/LassoTool';
import { EraserTool }           from '../tools/EraserTools/EraserTool';
import { ScissorTool }          from '../tools/EraserTools/ScissorTool';
import { FunctionalGroupTool }  from '../plugins/drawing/FunctionalGroupTool';
import { TextTool }             from '../tools/AnnotationTools/TextTool';
import { ChargeTool }           from '../tools/AtomTools/ChargeTool';
import { ReactionArrowTool }    from '../tools/ReactionTools/ReactionArrowTool';
import { MechanismArrowTool }   from '../tools/ReactionTools/MechanismArrowTool';
import { PanTool }              from '../tools/NavigationTools/PanTool';

interface CanvasProps {
  width?: number;
  height?: number;
}

// ── Overlay state (ref — no React re-renders needed) ──────────────────────────
interface OverlayState {
  mode: 'rubberband' | 'lasso' | 'pan' | 'mechanism' | 'reaction' | null;
  startPos: Vec2 | null;
  currentPos: Vec2 | null;
  lassoPoints: Vec2[];
  // For pan: store the initial screen position and pan so we can compute delta
  panStartScreen: { x: number; y: number } | null;
  panStartValue: { x: number; y: number } | null;
  // For mechanism arrows: source atom/bond
  mechSourceAtomId: number | null;
  mechSourceBondId: number | null;
}

// ── Bond proximity helpers ────────────────────────────────────────────────────

function distPointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = b.sub(a);
  const ap = p.sub(a);
  const t = Math.max(0, Math.min(1, ap.dot(ab) / (ab.dot(ab) || 1)));
  const closest = a.add(ab.scaled(t));
  return Vec2.dist(p, closest);
}

export const Canvas: React.FC<CanvasProps> = ({
  width  = 800,
  height = 600,
}) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rendererRef  = useRef<CanvasRenderer | null>(null);
  const overlayRef   = useRef<OverlayState>({
    mode: null, startPos: null, currentPos: null, lassoPoints: [],
    panStartScreen: null, panStartValue: null,
    mechSourceAtomId: null, mechSourceBondId: null,
  });

  const molecule      = useCanvasStore((s) => s.molecule);
  const selectedAtoms = useCanvasStore((s) => s.selectedAtoms);
  const selectedBonds = useCanvasStore((s) => s.selectedBonds);
  const hoveredAtom   = useCanvasStore((s) => s.hoveredAtom);
  const zoom          = useCanvasStore((s) => s.zoom);
  const pan           = useCanvasStore((s) => s.pan);

  // ── Renderer init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
  }, []);

  // ── Core draw function (molecule + overlay) ────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const store = useCanvasStore.getState();

    // Sync hover onto atom objects
    for (const atom of store.molecule.atoms.values()) {
      atom.isHovered = atom.id === store.hoveredAtom;
    }

    ctx.save();
    ctx.translate(store.pan.x, store.pan.y);
    ctx.scale(store.zoom, store.zoom);

    const validationErrorSet = new Set(store.validationErrors.map(e => e.atomId));
    renderer.render(store.molecule, store.selectedAtoms, store.selectedBonds, validationErrorSet);

    // ── Overlay ──
    const ov = overlayRef.current;

    if (ov.mode === 'rubberband' && ov.startPos && ov.currentPos) {
      const x = Math.min(ov.startPos.x, ov.currentPos.x);
      const y = Math.min(ov.startPos.y, ov.currentPos.y);
      const w = Math.abs(ov.currentPos.x - ov.startPos.x);
      const h = Math.abs(ov.currentPos.y - ov.startPos.y);

      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth   = 1 / store.zoom;
      ctx.setLineDash([4 / store.zoom, 3 / store.zoom]);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(37,99,235,0.06)';
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    if (ov.mode === 'lasso' && ov.lassoPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(ov.lassoPoints[0].x, ov.lassoPoints[0].y);
      for (let i = 1; i < ov.lassoPoints.length; i++) {
        ctx.lineTo(ov.lassoPoints[i].x, ov.lassoPoints[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth   = 1.5 / store.zoom;
      ctx.setLineDash([4 / store.zoom, 3 / store.zoom]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(245,158,11,0.07)';
      ctx.fill();
      ctx.setLineDash([]);
    }

    if ((ov.mode === 'mechanism' || ov.mode === 'reaction') && ov.startPos && ov.currentPos) {
      const dx = ov.currentPos.x - ov.startPos.x;
      const dy = ov.currentPos.y - ov.startPos.y;
      const midX = (ov.startPos.x + ov.currentPos.x) / 2;
      const midY = (ov.startPos.y + ov.currentPos.y) / 2;
      
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.5 / store.zoom;
      
      if (ov.mode === 'mechanism') {
        // Curve preview
        ctx.beginPath();
        ctx.moveTo(ov.startPos.x, ov.startPos.y);
        ctx.quadraticCurveTo(midX - dy*0.3, midY + dx*0.3, ov.currentPos.x, ov.currentPos.y);
        ctx.stroke();
      } else {
        // Straight line preview
        ctx.beginPath();
        ctx.moveTo(ov.startPos.x, ov.startPos.y);
        ctx.lineTo(ov.currentPos.x, ov.currentPos.y);
        ctx.stroke();
      }
    }

    // Mechanism arrow preview
    if (ov.mode === 'mechanism' && ov.startPos && ov.currentPos) {
      ctx.beginPath();
      ctx.moveTo(ov.startPos.x, ov.startPos.y);
      ctx.quadraticCurveTo(
        (ov.startPos.x + ov.currentPos.x) / 2,
        ov.startPos.y - 20 / store.zoom,
        ov.currentPos.x,
        ov.currentPos.y,
      );
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5 / store.zoom;
      ctx.setLineDash([3 / store.zoom, 2 / store.zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, []);

  // ── Re-draw on molecule/selection/hover changes ────────────────────────────
  useEffect(() => {
    redraw();
  }, [molecule, selectedAtoms, selectedBonds, hoveredAtom, zoom, pan, redraw]);

  // ── Get canvas-space coords from mouse event ───────────────────────────────
  const toCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return new Vec2(0, 0);
    
    const rect = canvas.getBoundingClientRect();
    const store = useCanvasStore.getState();
    
    // Scale client CSS pixels to internal canvas logical pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const logicalX = (e.clientX - rect.left) * scaleX;
    const logicalY = (e.clientY - rect.top) * scaleY;

    return new Vec2(
      (logicalX - store.pan.x) / store.zoom,
      (logicalY - store.pan.y) / store.zoom
    );
  }, []);

  // ── Find closest atom / bond to pos ───────────────────────────────────────
  const findClosestAtom = useCallback((pos: Vec2): number | null => {
    const mol = useCanvasStore.getState().molecule;
    let closest: number | null = null;
    let minDist = CANVAS_CONSTANTS.SELECTION_RADIUS as number;

    for (const atom of mol.atoms.values()) {
      const d = Vec2.dist(pos, atom.position);
      if (d < minDist) { minDist = d; closest = atom.id; }
    }
    return closest;
  }, []);

  const findClosestBond = useCallback((pos: Vec2): number | null => {
    const mol = useCanvasStore.getState().molecule;
    let closest: number | null = null;
    let minDist = 6;

    for (const bond of mol.bonds.values()) {
      const a = mol.getAtom(bond.begin);
      const b = mol.getAtom(bond.end);
      if (!a || !b) continue;
      const d = distPointToSegment(pos, a.position, b.position);
      if (d < minDist) { minDist = d; closest = bond.id; }
    }
    return closest;
  }, []);

  // ── Mouse Down ────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Force focus release from search bars or other inputs when clicking the canvas
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const pos = toCanvasPos(e);
    const store = useCanvasStore.getState();
    const closestAtom = findClosestAtom(pos);
    const closestBond = findClosestBond(pos);
    const activeTool  = store.activeTool;

    if (activeTool === 'select') {
      console.log('[Canvas] passing to SelectTool.onMouseDown');
      SelectTool.onMouseDown(
        e,
        pos,
        closestAtom,
        closestBond,
        () => {
          console.log('[Canvas] SelectTool callback startRubberband at', pos);
          overlayRef.current = {
            ...overlayRef.current,
            mode: 'rubberband', startPos: pos, currentPos: pos, lassoPoints: [],
          };
          // Try forcibly redrawing when starting to make sure box can appear
          redraw();
        }
      );

    } else if (activeTool === 'lasso') {
      LassoTool.onMouseDown(
        e,
        pos,
        closestAtom,
        closestBond,
        (startPos) => {
          overlayRef.current = {
            ...overlayRef.current,
            mode: 'lasso', startPos: startPos, currentPos: startPos, lassoPoints: [startPos],
          };
        }
      );

    } else if (activeTool === 'bond') {
      BondTool.onMouseDown(pos, closestAtom, closestBond);

    } else if (activeTool === 'ring') {
      RingTool.onMouseDown(pos, closestAtom, closestBond);

    } else if (activeTool === 'atom') {
      if (closestAtom !== null) AtomTool.handleAtomClick(closestAtom);
      else AtomTool.handleEmptyClick(pos);

    } else if (activeTool === 'groups') {
      FunctionalGroupTool.onMouseDown(pos, closestAtom);

    } else if (activeTool === 'erase') {
      EraserTool.onMouseDown(pos, closestAtom, closestBond);

    } else if (activeTool === 'scissor') {
      ScissorTool.onMouseDown(pos, closestAtom, closestBond);

    } else if (activeTool === 'attributes') {
      ChargeTool.handleAtomClick(closestAtom);

    } else if (activeTool === 'pan') {
      PanTool.onMouseDown(
        e,
        (clientX, clientY, panX, panY) => {
          overlayRef.current = {
            ...overlayRef.current,
            mode: 'pan',
            panStartScreen: { x: clientX, y: clientY },
            panStartValue: { x: panX, y: panY },
          };
        }
      );

    } else if (activeTool === 'text') {
      TextTool.onMouseDown(pos, closestAtom);

    } else if (activeTool === 'reaction') {
      ReactionArrowTool.onMouseDown(
        pos,
        (startPos) => {
          overlayRef.current = {
            ...overlayRef.current,
            mode: 'reaction',
            startPos: startPos,
            currentPos: startPos,
          };
        }
      );

    } else if (activeTool === 'mechanism') {
      MechanismArrowTool.onMouseDown(
        pos,
        closestAtom,
        closestBond,
        (startPos, currentPos, sourceAtomId, sourceBondId) => {
          overlayRef.current = {
            ...overlayRef.current,
            mode: 'mechanism',
            startPos: startPos,
            currentPos: currentPos,
            mechSourceAtomId: sourceAtomId,
            mechSourceBondId: sourceBondId,
          };
        }
      );
    }
  };

  // ── Mouse Move ────────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos   = toCanvasPos(e);
    const store = useCanvasStore.getState();
    const ov    = overlayRef.current;

    if (ov.mode === 'rubberband' && ov.startPos) {
      overlayRef.current.currentPos = pos;
      redraw();
      return;
    }

    if (ov.mode === 'lasso') {
      overlayRef.current.lassoPoints.push(pos);
      overlayRef.current.currentPos = pos;
      redraw();
      return;
    }

    const closestAtom = findClosestAtom(pos);
    const closestBond = findClosestBond(pos);

    if (ov.mode === 'pan') {
      PanTool.onMouseMove(e, true, ov.panStartScreen, ov.panStartValue);
      return;
    }

    if (ov.mode === 'mechanism' || ov.mode === 'reaction') {
      overlayRef.current.currentPos = pos;
      if (ov.mode === 'mechanism') {
        MechanismArrowTool.onMouseMove();
      }
      redraw();
      return;
    }

    switch (store.activeTool) {
      case 'select':
        SelectTool.onMouseMove(closestAtom, closestBond);
        break;
      case 'lasso':
        LassoTool.onMouseMove(closestAtom, closestBond);
        break;
      case 'erase':
        EraserTool.onMouseMove(closestAtom, closestBond);
        break;
      case 'scissor':
        ScissorTool.onMouseMove(closestAtom, closestBond);
        break;
      case 'atom':
      case 'attributes':
      case 'text':
      case 'groups':
        store.setHoveredAtom(closestAtom);
        store.setHoveredBond(closestBond);
        break;
      case 'bond':
        BondTool.onMouseMove(pos, closestAtom);
        break;
      case 'ring':
        RingTool.onMouseMove(pos, closestAtom);
        break;
      case 'erase':
        store.setHoveredAtom(closestAtom);
        store.setHoveredBond(closestBond);
        break;
      case 'groups':
        store.setHoveredAtom(closestAtom);
        break;
    }
  };

  // ── Mouse Up ──────────────────────────────────────────────────────────────
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos   = toCanvasPos(e);
    const store = useCanvasStore.getState();
    const ov    = overlayRef.current;

    if (ov.mode === 'rubberband') {
      console.log('[Canvas] handleMouseUp for rubberband, calling SelectTool.onMouseUp');
      SelectTool.onMouseUp(
        true,
        ov.startPos,
        ov.currentPos,
        () => {
          console.log('[Canvas] endRubberband callback');
          overlayRef.current = { ...overlayRef.current, mode: null, startPos: null, currentPos: null, lassoPoints: [] };
          redraw();
        }
      );
      return;
    }

    if (ov.mode === 'lasso') {
      LassoTool.onMouseUp(
        true,
        ov.lassoPoints,
        () => {
          overlayRef.current = { ...overlayRef.current, mode: null, startPos: null, currentPos: null, lassoPoints: [] };
          redraw();
        }
      );
      return;
    }

    if (ov.mode === 'pan') {
      PanTool.onMouseUp(() => {
        overlayRef.current = { ...overlayRef.current, mode: null, panStartScreen: null, panStartValue: null };
      });
      return;
    }

    if (ov.mode === 'mechanism') {
      const targetAtom = findClosestAtom(pos);
      MechanismArrowTool.onMouseUp(
        true,
        ov.mechSourceAtomId,
        targetAtom,
        ov.startPos,
        ov.currentPos,
        () => {
          overlayRef.current = { ...overlayRef.current, mode: null, startPos: null, currentPos: null, mechSourceAtomId: null, mechSourceBondId: null };
          redraw();
        }
      );
      return;
    }

    if (ov.mode === 'reaction') {
      ReactionArrowTool.onMouseUp(
        true,
        ov.startPos,
        ov.currentPos,
        () => {
          overlayRef.current = { ...overlayRef.current, mode: null, startPos: null, currentPos: null };
          redraw();
        }
      );
      return;
    }

    overlayRef.current = { ...overlayRef.current, mode: null, startPos: null, currentPos: null, lassoPoints: [] };

    switch (store.activeTool) {
      case 'bond': BondTool.onMouseUp(pos, findClosestAtom(pos)); break;
      case 'ring': RingTool.onMouseUp(pos, findClosestAtom(pos)); break;
    }
  };

  // ── Mouse Leave ───────────────────────────────────────────────────────────
  const handleMouseLeave = () => {
    const store = useCanvasStore.getState();
    store.setHoveredAtom(null);
    store.setHoveredBond(null);
    BondTool.onMouseLeave(new Vec2(0, 0));
    RingTool.onMouseLeave(new Vec2(0, 0));

    // Commit any in-progress rubber band / lasso on leave
    const ov = overlayRef.current;
    if (ov.mode === 'rubberband') {
      SelectTool.onMouseUp(true, ov.startPos, ov.currentPos, () => {});
    } else if (ov.mode === 'lasso') {
      LassoTool.onMouseUp(true, ov.lassoPoints, () => {});
    }
    overlayRef.current = {
      mode: null, startPos: null, currentPos: null, lassoPoints: [],
      panStartScreen: null, panStartValue: null,
      mechSourceAtomId: null, mechSourceBondId: null,
    };
    redraw();
  };

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const store = useCanvasStore.getState();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    store.setZoom(store.zoom * factor);
  };

  // ── Cursor based on active tool ───────────────────────────────────────────
  const cursorMap: Record<string, string> = {
    select:     'default',
    lasso:      'crosshair',
    bond:       'crosshair',
    ring:       'crosshair',
    atom:       'cell',
    groups:     'copy',
    erase:      'not-allowed',
    scissor:    'cell',
    attributes: 'cell',
    pan:        'grab',
    text:       'text',
    reaction:   'crosshair',
    mechanism:  'crosshair',
    chain:      'crosshair',
  };
  const activeTool = useCanvasStore((s) => s.activeTool);
  const cursor = cursorMap[activeTool] ?? 'crosshair';

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      style={{
        cursor,
        backgroundColor: '#fff',
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  );
};
