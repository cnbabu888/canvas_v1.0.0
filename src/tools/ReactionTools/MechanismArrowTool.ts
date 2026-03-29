import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';

export const MechanismArrowTool = {
  onMouseDown: (
    pos: Vec2,
    closestAtom: number | null,
    closestBond: number | null,
    startMechanismArrow: (
      startPos: Vec2,
      currentPos: Vec2,
      sourceAtomId: number | null,
      sourceBondId: number | null
    ) => void
  ) => {
    const store = useCanvasStore.getState();
    const startPos = closestAtom !== null
      ? store.molecule.atoms.get(closestAtom)?.position ?? pos
      : pos;

    startMechanismArrow(startPos, pos, closestAtom, closestBond);
  },

  onMouseMove: () => {
    // Mechanism tool doesn't highlight atoms during move right now.
  },

  onMouseUp: (
    isMechanismArrowing: boolean,
    sourceAtomId: number | null,
    targetAtomId: number | null,
    startPos: Vec2 | null,
    currentPos: Vec2 | null,
    endMechanismArrow: () => void
  ) => {
    if (isMechanismArrowing && startPos && currentPos) {
      // Commit mechanism arrow if target is an atom
      if (sourceAtomId !== null && targetAtomId !== null && targetAtomId !== sourceAtomId) {
        const store = useCanvasStore.getState();
        const mol = store.molecule.clone();
        
        store.saveToHistory();
        mol.annotations.push({
          type: 'mechanism-arrow',
          sourceAtomId,
          targetAtomId,
          start: { x: startPos.x, y: startPos.y },
          end: { x: currentPos.x, y: currentPos.y }
        });
        store.updateMolecule(mol);
      }
      endMechanismArrow();
    }
  }
};
