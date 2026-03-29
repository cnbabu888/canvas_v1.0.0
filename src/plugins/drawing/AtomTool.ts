/**
 * AtomTool
 * Handles clicking atoms to change their element label,
 * or clicking empty space to place a new atom.
 */

import { Vec2 } from '../../entities/Vec2';
import { useCanvasStore } from '../../core/StateManager';

export const AtomTool = {
  /**
   * Called when the user clicks an existing atom with the Atom tool active.
   * Changes the atom's element label and recalculates implicit hydrogens.
   */
  handleAtomClick: (atomId: number) => {
    const state = useCanvasStore.getState();
    const molecule = state.molecule;
    const activeElement = state.activeElement || 'C';

    // Find the atom
    const atom = molecule.getAtom(atomId);
    if (!atom) return;

    // Save to history before making changes
    state.saveToHistory();

    // Clone molecule for immutable update
    const newMolecule = molecule.clone();
    const newAtom = newMolecule.getAtom(atomId);

    if (newAtom) {
      // Simply change the label - don't create a new atom
      newAtom.label = activeElement;

      // Recalculate implicit hydrogens for the new element
      const bonds = newMolecule.getAtomBonds(atomId);
      const bondOrders = bonds.map(b => b.getBondOrder());
      newAtom.implicitH = newAtom.calculateImplicitH(bondOrders);
    }

    // Update molecule in store
    state.updateMolecule(newMolecule);
  },

  /**
   * Called when the user clicks empty canvas space with the Atom tool active.
   * Creates a new atom with the currently selected element at that position.
   */
  handleEmptyClick: (pos: Vec2) => {
    const store = useCanvasStore.getState();
    const element = store.activeElement;
    const molecule = store.molecule.clone();

    molecule.addAtom({
      label: element,
      position: pos,
    });

    store.saveToHistory();
    store.updateMolecule(molecule);
  },
};
