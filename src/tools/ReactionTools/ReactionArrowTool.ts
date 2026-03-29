import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';

export const ReactionArrowTool = {
  onMouseDown: (
    pos: Vec2,
    startReactionArrow: (pos: Vec2) => void
  ) => {
    // Place reaction/equilibrium/retro arrow as a line segment from this click
    // Second click will set endpoint — track start with overlay
    startReactionArrow(pos);
  },

  onMouseUp: (
    isReactionArrowing: boolean,
    startPos: Vec2 | null,
    currentPos: Vec2 | null,
    endReactionArrow: () => void
  ) => {
    if (isReactionArrowing && startPos && currentPos) {
      const store = useCanvasStore.getState();
      const mol = store.molecule.clone();
      const activeSubTool = store.activeSubTool ?? 'arrow-synthesis';
      
      store.saveToHistory();
      mol.annotations.push({
        type: 'reaction-arrow',
        subtype: activeSubTool,
        start: { x: startPos.x, y: startPos.y },
        end: { x: currentPos.x, y: currentPos.y }
      });
      store.updateMolecule(mol);

      endReactionArrow();
    }
  }
};
