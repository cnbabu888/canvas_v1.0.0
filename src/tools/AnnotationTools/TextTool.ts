import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';

export const TextTool = {
  onMouseDown: (pos: Vec2, closestAtom: number | null) => {
    // Basic text label placement at click position (canvas-space)
    const label = window.prompt('Enter text label:');
    if (label && label.trim()) {
      const store = useCanvasStore.getState();
      const mol = store.molecule.clone();
      store.saveToHistory();
      
      if (closestAtom !== null) {
        // Change existing atom's label
        const atom = mol.atoms.get(closestAtom);
        if (atom) {
          atom.label = label.trim();
        }
      } else {
        mol.addAtom({
          label: label.trim(),
          position: pos,
        });
      }
      
      store.updateMolecule(mol);
    }
  }
};
