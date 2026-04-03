import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';

export const SelectTool = {
  onMouseDown: (
    e: { detail: number; shiftKey: boolean },
    _pos: Vec2,
    closestAtom: number | null,
    closestBond: number | null,
    startRubberband: () => void
  ) => {
    const store = useCanvasStore.getState();
    console.log('[SelectTool] onMouseDown triggered. shiftKey:', e.shiftKey, 'closestAtom:', closestAtom, 'closestBond:', closestBond);

    if (e.detail === 2) {
      console.log('[SelectTool] double click detected.');
      // Double-click → select entire connected component
      if (closestAtom !== null) {
        store.selectConnectedComponent(closestAtom);
      } else if (closestBond !== null) {
        const bond = store.molecule.bonds.get(closestBond);
        if (bond) store.selectConnectedComponent(bond.begin);
      }
      return;
    }

    if (closestAtom !== null) {
      console.log('[SelectTool] clicked on atom', closestAtom);
      if (e.shiftKey) store.toggleAtomSelection(closestAtom);
      else store.selectAtom(closestAtom, false);
    } else if (closestBond !== null) {
      console.log('[SelectTool] clicked on bond', closestBond);
      if (e.shiftKey) store.toggleBondSelection(closestBond);
      else store.selectBond(closestBond, false);
    } else {
      // Start rubber-band selection
      console.log('[SelectTool] starting rubberband selection.');
      if (!e.shiftKey) store.clearSelection();
      startRubberband();
    }
  },

  onMouseMove: (closestAtom: number | null, closestBond: number | null) => {
    const store = useCanvasStore.getState();
    store.setHoveredAtom(closestAtom);
    store.setHoveredBond(closestBond);
  },

  onMouseUp: (
    isRubberbanding: boolean,
    startPos: Vec2 | null,
    currentPos: Vec2 | null,
    endRubberband: () => void
  ) => {
    if (isRubberbanding && startPos && currentPos) {
      const x1 = Math.min(startPos.x, currentPos.x);
      const y1 = Math.min(startPos.y, currentPos.y);
      const x2 = Math.max(startPos.x, currentPos.x);
      const y2 = Math.max(startPos.y, currentPos.y);
      
      const store = useCanvasStore.getState();
      store.selectAtomsInRect(x1, y1, x2, y2);
      
      endRubberband();
    }
  }
};
