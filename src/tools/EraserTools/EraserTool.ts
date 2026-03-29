import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';

export const EraserTool = {
  onMouseDown: (
    pos: Vec2,
    closestAtom: number | null,
    closestBond: number | null
  ) => {
    const store = useCanvasStore.getState();
    const mol = store.molecule.clone();
    
    // Nothing to erase
    if (closestAtom === null && closestBond === null) return;

    store.saveToHistory();
    if (closestAtom !== null) mol.removeAtom(closestAtom);
    else if (closestBond !== null) mol.removeBond(closestBond);
    
    store.updateMolecule(mol);
  },

  onMouseMove: (closestAtom: number | null, closestBond: number | null) => {
    const store = useCanvasStore.getState();
    store.setHoveredAtom(closestAtom);
    store.setHoveredBond(closestBond);
  }
};
