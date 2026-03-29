import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';

export const LassoTool = {
  onMouseDown: (
    e: { shiftKey: boolean },
    pos: Vec2,
    closestAtom: number | null,
    closestBond: number | null,
    startLasso: (pos: Vec2) => void
  ) => {
    const store = useCanvasStore.getState();

    if (closestAtom !== null) {
      if (e.shiftKey) store.toggleAtomSelection(closestAtom);
      else store.selectAtom(closestAtom, false);
    } else if (closestBond !== null) {
      if (e.shiftKey) store.toggleBondSelection(closestBond);
      else store.selectBond(closestBond, false);
    } else {
      if (!e.shiftKey) store.clearSelection();
      startLasso(pos);
    }
  },

  onMouseMove: (closestAtom: number | null, closestBond: number | null) => {
    const store = useCanvasStore.getState();
    store.setHoveredAtom(closestAtom);
    store.setHoveredBond(closestBond);
  },

  onMouseUp: (
    isLassoing: boolean,
    lassoPoints: Vec2[],
    endLasso: () => void
  ) => {
    if (isLassoing && lassoPoints.length > 2) {
      const store = useCanvasStore.getState();
      store.selectAtomsInPolygon(lassoPoints);
      endLasso();
    }
  }
};
