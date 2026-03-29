/**
 * BondTool v2 — ACS-compliant bond drawing
 *
 * ACS Rules Implemented:
 * - 30° angle snapping grid on all new bonds (ChemDraw standard)
 * - Zigzag chain convention (alternates ±30° from horizontal)
 * - Bond length locked to ACS standard (40px)
 * - Click existing bond → upgrades type (single → double → triple → single)
 * - Click existing atom → starts bond from that atom
 * - Drag from atom → snaps endpoint to 30° grid at ACS bond length
 *
 * Bond Subtypes Supported:
 * - BOND_SINGLE: single bond (type 1, stereo NONE)
 * - BOND_DOUBLE: double bond (type 2)
 * - BOND_TRIPLE: triple bond (type 3)
 * - BOND_WEDGE_SOLID: solid wedge (stereo UP) for stereochemistry
 * - BOND_WEDGE_HASH: hashed wedge (stereo DOWN) for stereochemistry
 * - BOND_WAVY: wavy bond (stereo EITHER, unknown stereo)
 * - BOND_DATIVE: dative/coordinate bond (rendered like single with arrow)
 * - BOND_AROMATIC: aromatic bond (type 4)
 * - BOND_HOLLOW_WEDGE: hollow wedge (stereo UP, type SINGLE)
 * - BOND_HYDROGEN: hydrogen bond (type SINGLE, special render)
 * - BOND_IONIC: ionic bond (type SINGLE, special render)
 * - BOND_QUADRUPLE: quadruple bond (type 4 treated as aromatic in engine)
 */

import { Vec2 } from '../../entities/Vec2';
import { Bond } from '../../entities/Bond';
import { useCanvasStore } from '../../core/StateManager';
import { GeometryEngine, ACS } from '../../engines/GeometryEngine';
import { BOND_STEREO } from '../../engines/ChemistryConstants';

/** Map LeftToolbar subTool ID → {type, stereo} for bond rendering */
function getActiveBondSpec(store: ReturnType<typeof useCanvasStore.getState>): { type: number; stereo: number } {
  const subTool = store.activeSubTool ?? 'BOND_SINGLE';

  switch (subTool) {
    case 'BOND_SINGLE':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.NONE };
    case 'BOND_DOUBLE':
      return { type: Bond.TYPE.DOUBLE, stereo: BOND_STEREO.NONE };
    case 'BOND_TRIPLE':
      return { type: Bond.TYPE.TRIPLE, stereo: BOND_STEREO.NONE };
    case 'BOND_WEDGE_SOLID':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.UP };
    case 'BOND_WEDGE_HASH':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.DOWN };
    case 'BOND_HOLLOW_WEDGE':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.UP };  // similar to wedge, renderer differentiates
    case 'BOND_WAVY':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.EITHER };
    case 'BOND_DATIVE':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.NONE };  // Arrow rendered by renderer
    case 'BOND_AROMATIC':
      return { type: Bond.TYPE.AROMATIC, stereo: BOND_STEREO.NONE };
    case 'BOND_QUADRUPLE':
      return { type: Bond.TYPE.AROMATIC, stereo: BOND_STEREO.NONE }; // Closest in engine to quadruple
    case 'BOND_HYDROGEN':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.NONE };   // Dotted line - renderer handles
    case 'BOND_IONIC':
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.NONE };   // Dashed line - renderer handles
    default:
      // Legacy format: "SINGLE_NONE", "DOUBLE_NONE" etc. (backward compatibility)
      if (subTool.includes('_')) {
        const [typeName, stereoName] = subTool.split('_');
        const typeMap: Record<string, number> = {
          SINGLE: Bond.TYPE.SINGLE,
          DOUBLE: Bond.TYPE.DOUBLE,
          TRIPLE: Bond.TYPE.TRIPLE,
          AROMATIC: Bond.TYPE.AROMATIC,
        };
        const stereoMap: Record<string, number> = {
          NONE: BOND_STEREO.NONE,
          UP: BOND_STEREO.UP,
          DOWN: BOND_STEREO.DOWN,
          EITHER: BOND_STEREO.EITHER,
        };
        return {
          type: typeMap[typeName] ?? Bond.TYPE.SINGLE,
          stereo: stereoMap[stereoName] ?? BOND_STEREO.NONE,
        };
      }
      return { type: Bond.TYPE.SINGLE, stereo: BOND_STEREO.NONE };
  }
}

// Module-level drag state (doesn't need React renders)
let dragStartAtomId: number | null = null;
let currentHoverAtom: number | null = null;

export const BondTool = {
  onMouseDown: (pos: Vec2, closestAtom: number | null, closestBond: number | null) => {
    const store = useCanvasStore.getState();
    const molecule = store.molecule.clone();
    const element = store.activeElement || 'C';

    if (closestBond !== null) {
      // Upgrade existing bond order
      const bond = molecule.bonds.get(closestBond);
      if (bond) {
        store.saveToHistory();
        bond.type = bond.type === Bond.TYPE.SINGLE ? Bond.TYPE.DOUBLE 
                  : bond.type === Bond.TYPE.DOUBLE ? Bond.TYPE.TRIPLE 
                  : Bond.TYPE.SINGLE;
        store.updateMolecule(molecule);
      }
      return;
    }

    if (closestAtom !== null) {
      // Start drag from existing atom
      dragStartAtomId = closestAtom;
    } else {
      // Create new atom at click point, start drag from it
      store.saveToHistory();
      const newAtom = molecule.addAtom({ label: element, position: pos });
      dragStartAtomId = newAtom.id;
      store.updateMolecule(molecule);
    }
  },

  onMouseMove: (_pos: Vec2, closestAtom: number | null) => {
    const store = useCanvasStore.getState();
    if (closestAtom !== currentHoverAtom) {
      currentHoverAtom = closestAtom;
      store.setHoveredAtom(closestAtom);
    }
  },

  onMouseUp: (pos: Vec2, closestAtom: number | null) => {
    if (dragStartAtomId === null) return;

    const store = useCanvasStore.getState();
    const molecule = store.molecule.clone();
    const element = store.activeElement || 'C';
    const startAtom = molecule.atoms.get(dragStartAtomId);

    if (!startAtom) {
      dragStartAtomId = null;
      return;
    }

    let endAtomId: number | null = closestAtom;

    if (endAtomId === null) {
      // Snap end position to ACS 30° grid + standard bond length
      const snappedPos = GeometryEngine.snapBondEnd(
        startAtom.position,
        pos,
        GeometryEngine.getNextChainAngle(startAtom, molecule)
      );

      // Check nothing is already there
      const tooClose = Array.from(molecule.atoms.values()).some(
        a => a.id !== dragStartAtomId && Vec2.dist(a.position, snappedPos) < 8
      );

      if (!tooClose) {
        const atom = molecule.addAtom({ label: element, position: snappedPos });
        endAtomId = atom.id;
      }
    }

    if (endAtomId !== null && endAtomId !== dragStartAtomId) {
      const existing = molecule.findBond(dragStartAtomId, endAtomId);
      const { type: newType, stereo: newStereo } = getActiveBondSpec(store);

      if (existing) {
        // Cycle bond order when clicking existing bond with same type, else replace
        if (existing.type === newType && newStereo === BOND_STEREO.NONE) {
          existing.type = (existing.type % Bond.TYPE.TRIPLE) + 1; // cycle 1→2→3→1
        } else {
          existing.type = newType;
          existing.stereo = newStereo;
        }
      } else {
        molecule.addBond({
          begin: dragStartAtomId,
          end: endAtomId,
          type: newType,
          stereo: newStereo,
        });
      }

      store.saveToHistory();
      store.updateMolecule(molecule);

    } else if (endAtomId === dragStartAtomId) {
      // Click without drag on existing atom — extend chain in best direction
      const bestAngle = GeometryEngine.getNextChainAngle(startAtom, molecule);
      const newPos = new Vec2(
        startAtom.position.x + Math.cos(bestAngle) * ACS.BOND_LENGTH,
        startAtom.position.y + Math.sin(bestAngle) * ACS.BOND_LENGTH
      );
      const { type: bType, stereo: bStereo } = getActiveBondSpec(store);
      const newAtom = molecule.addAtom({ label: element, position: newPos });
      molecule.addBond({
        begin: dragStartAtomId,
        end: newAtom.id,
        type: bType,
        stereo: bStereo,
      });
      store.saveToHistory();
      store.updateMolecule(molecule);
    }

    dragStartAtomId = null;
  },

  onMouseLeave: (_pos?: Vec2) => {
    dragStartAtomId = null;
    useCanvasStore.getState().setHoveredAtom(null);
  },
};
