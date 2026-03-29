import { Vec2 } from '../../entities/Vec2';
import { Bond } from '../../entities/Bond';
import { useCanvasStore } from '../../core/StateManager';
import { GeometryEngine, ACS } from '../../engines/GeometryEngine';

/**
 * Place a regular ring (Benzene, Cyclohexane, etc.) at the cursor.
 */
export function placeRing(center: Vec2, size: number, aromatic: boolean): void {
  const state = useCanvasStore.getState();
  const molecule = state.molecule.clone();
  
  // Refined position calculation
  const positions = GeometryEngine.getRingAtomPositions(center.x, center.y, size);
  const ids: number[] = [];

  for (const pos of positions) {
    ids.push(molecule.addAtom({ label: 'C', position: pos }).id);
  }

  for (let i = 0; i < size; i++) {
    const a1 = ids[i];
    const a2 = ids[(i + 1) % size];
    const b = molecule.addBond({
      begin: a1,
      end: a2,
      type: (aromatic && i % 2 === 0) ? Bond.TYPE.DOUBLE : Bond.TYPE.SINGLE
    });
    
    if (aromatic) {
      b.type = Bond.TYPE.AROMATIC;
    }
  }

  state.saveToHistory();
  state.updateMolecule(molecule);
}

/**
 * Fuse a ring along an existing bond using: newCenter = 2M - existingCenter
 */
export function fuseRingToBond(bondId: number, size: number, aromatic: boolean): void {
  const state = useCanvasStore.getState();
  const molecule = state.molecule.clone();
  
  const bond = molecule.bonds.get(bondId);
  if (!bond) return;
  
  const atomA = molecule.atoms.get(bond.begin);
  const atomB = molecule.atoms.get(bond.end);
  if (!atomA || !atomB) return;

  const mPos = atomA.position.add(atomB.position).scaled(0.5);
  const L = ACS.BOND_LENGTH;
  const h = (L / 2) / Math.tan(Math.PI / size);

  // Normal calculation for a new fusion
  const vec = atomB.position.sub(atomA.position).normalized();
  const perp = new Vec2(vec.y, -vec.x);
  
  const center = mPos.add(perp.scaled(h));
  const positions = GeometryEngine.getRingAtomPositions(center.x, center.y, size);

  // (Simulated fusion - in a full implementation we'd snap to atomA and atomB)
  placeRing(center, size, aromatic);
}

export const RingTool = {
  onMouseDown: (pos: Vec2, closestAtom: number | null, closestBond: number | null) => {
     const store = useCanvasStore.getState();
     const subTool = store.activeSubTool;
     
     // 6-ring default
     let size = 6;
     let aromatic = true;

     if (subTool?.includes('RING_')) {
        size = parseInt(subTool.replace('RING_', '')) || 6;
        aromatic = false;
     } else if (subTool === 'BENZENE') {
        size = 6;
        aromatic = true;
     }

     if (closestBond !== null) {
        fuseRingToBond(closestBond, size, aromatic);
     } else {
        placeRing(pos, size, aromatic);
     }
  },
  onMouseMove: (_pos: Vec2, _closestAtom: number | null) => {},
  onMouseUp: (_pos: Vec2, _closestAtom: number | null) => {},
  onMouseLeave: (_pos: Vec2) => {},
  
  placeRing,
  placeNaphthalene: (center: Vec2) => placeRing(center, 6, true), // Placeholder
  placeAnthracene: (center: Vec2) => placeRing(center, 6, true),  // Placeholder
  fuseRingToBond
};
