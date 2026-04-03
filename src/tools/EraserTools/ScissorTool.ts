import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';
import { CutBondsCommand } from '../../commands/CutBondsCommand';

export const ScissorTool = {
  onMouseDown: (
    _pos: Vec2,
    _closestAtom: number | null,
    closestBond: number | null
  ) => {
    const store = useCanvasStore.getState();

    // Cut bond using the scissor mode (homolytic or heterolytic)
    if (closestBond !== null) {
      const cmd = new CutBondsCommand(
        store.molecule,
        [closestBond],
        store.scissorMode,
        store.retrosynthesisMode
      );
      store.executeCommand(cmd);
    }
  },

  onMouseMove: (closestAtom: number | null, closestBond: number | null) => {
    const store = useCanvasStore.getState();
    store.setHoveredAtom(closestAtom);
    store.setHoveredBond(closestBond);
  }
};
