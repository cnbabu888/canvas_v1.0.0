import { ACS } from '../../engines/GeometryEngine';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Vec2 } from '../../entities/Vec2';
import { Bond } from '../../entities/Bond';
import { Molecule } from '../../entities/Molecule';

export function placeRing(center: Vec2, size: number, aromatic: boolean): void {
  const state = useCanvasStore.getState();
  const molecule = Molecule.fromJSON(state.molecule.toJSON());

  const L = ACS.BOND_LENGTH;
  const radius = L / (2 * Math.sin(Math.PI / size));
  const ids: number[] = [];

  for (let i = 0; i < size; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / size;
    const pos = new Vec2(
      center.x + radius * Math.cos(angle),
      center.y + radius * Math.sin(angle)
    );
    ids.push(molecule.addAtom({ label: 'C', position: pos }).id);
  }

  for (let i = 0; i < size; i++) {
    const a1 = ids[i];
    const a2 = ids[(i + 1) % size];
    const b = molecule.addBond({ begin: a1, end: a2, type: Bond.TYPE.SINGLE });
    if (aromatic && i % 2 === 0) b.type = Bond.TYPE.DOUBLE;
  }

  state.setMolecule(molecule);
}

export function fuseRingToBond(bondId: number, size: number, aromatic: boolean): void {
  const state = useCanvasStore.getState();
  const molecule = Molecule.fromJSON(state.molecule.toJSON());

  const bond = molecule.bonds.get(bondId);
  if (!bond) return;

  const atomA = molecule.atoms.get(bond.begin);
  const atomB = molecule.atoms.get(bond.end);
  if (!atomA || !atomB) return;

  const mPos = atomA.position.add(atomB.position).scaled(0.5);
  const L = ACS.BOND_LENGTH;
  const h = (L / 2) / Math.tan(Math.PI / size);
  const vec = atomB.position.sub(atomA.position).normalized();
  const perp = new Vec2(vec.y, -vec.x);
  const center = mPos.add(perp.scaled(h));

  placeRing(center, size, aromatic);
}

export const RingTool = {
  onMouseDown: (pos: Vec2, _closestAtom: number | null, closestBond: number | null) => {
    const store = useCanvasStore.getState();
    const subTool = store.activeSubTool;
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
  fuseRingToBond
};
