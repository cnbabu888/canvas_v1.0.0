/**
 * FunctionalGroupTool — Places common functional groups onto the canvas.
 *
 * Each group is defined as a set of atoms and bonds relative to an attachment point.
 * When dropped on empty space: places the group freely.
 * When clicked near an existing atom: the group's attachment carbon fuses with that atom.
 *
 * ACS Rules:
 * - Bond length: 40px (ACS standard)
 * - Bond angles follow 30° grid where possible
 * - Groups extend in the direction of GeometryEngine.getNextChainAngle()
 *
 * Supported groups:
 * - Me (methyl):   -CH3 — single carbon
 * - Et (ethyl):    -CH2-CH3
 * - iPr (isopropyl): -CH(CH3)2
 * - tBu (t-butyl): -C(CH3)3
 * - Ph (phenyl):   -C6H5 (benzene fused at ringAtom[0])
 * - Bn (benzyl):   -CH2-C6H5
 */

import { Vec2 } from '../../entities/Vec2';
import { Bond } from '../../entities/Bond';
import { useCanvasStore } from '../../core/StateManager';
import { GeometryEngine, ACS } from '../../engines/GeometryEngine';

const L = ACS.BOND_LENGTH;


/**
 * Place a benzene ring with one aromatic vertex specified as `attachPos`,
 * growing in `direction` angle.
 */
function placeBenzeneRing(
  molecule: ReturnType<typeof useCanvasStore.getState>['molecule'],
  attachPos: Vec2,
  direction: number,
  reuseAtomId?: number
): number[] {
  const r = GeometryEngine.ringRadius(6, L);
  const ringCenter = new Vec2(
    attachPos.x + Math.cos(direction) * r,
    attachPos.y + Math.sin(direction) * r
  );
  const anchorAngleFromCenter = direction + Math.PI;
  const angleStep = (2 * Math.PI) / 6;
  const ids: number[] = [];

  for (let i = 0; i < 6; i++) {
    if (i === 0 && reuseAtomId !== undefined) {
      ids.push(reuseAtomId);
      continue;
    }
    const angle = anchorAngleFromCenter + i * angleStep;
    const pos = new Vec2(
      ringCenter.x + Math.cos(angle) * r,
      ringCenter.y + Math.sin(angle) * r
    );
    ids.push(molecule.addAtom({ label: 'C', position: pos }).id);
  }

  for (let i = 0; i < 6; i++) {
    if (!molecule.findBond(ids[i], ids[(i + 1) % 6])) {
      molecule.addBond({
        begin: ids[i], end: ids[(i + 1) % 6],
        type: i % 2 === 0 ? Bond.TYPE.DOUBLE : Bond.TYPE.SINGLE,
      });
    }
  }

  return ids;
}

/**
 * Place a functional group.
 * @param groupId - LeftToolbar subTool ID (e.g. 'group-ph')
 * @param anchorAtomId - ID of existing atom to attach to (or null for free placement)
 * @param clickPos - Position of click on canvas
 */
export function placeFunctionalGroup(
  groupId: string,
  anchorAtomId: number | null,
  clickPos: Vec2
): void {
  const state = useCanvasStore.getState();
  const molecule = state.molecule.clone();

  let attachPos: Vec2;
  let reuseAtomId: number | undefined;
  let growDirection: number;

  // Coordinate safety: prevent NaN placement
  if (!clickPos || !clickPos.isValid()) return;

  if (anchorAtomId !== null) {
    const anchor = molecule.atoms.get(anchorAtomId);
    if (!anchor) return;
    attachPos = anchor.position;
    reuseAtomId = anchorAtomId;
    growDirection = GeometryEngine.getNextChainAngle(anchor, molecule);
  } else {
    attachPos = clickPos;
    growDirection = 0; // default: grow right
  }

  // ── Handle each group type ─────────────────────────────────────────────────

  if (groupId === 'group-me') {
    // -CH3: single carbon in the best chain direction
    if (reuseAtomId !== undefined) {
      const newPos = new Vec2(
        attachPos.x + Math.cos(growDirection) * L,
        attachPos.y + Math.sin(growDirection) * L
      );
      const newAtom = molecule.addAtom({ label: 'C', position: newPos });
      molecule.addBond({ begin: reuseAtomId, end: newAtom.id, type: Bond.TYPE.SINGLE });
    } else {
      molecule.addAtom({ label: 'C', position: attachPos });
    }

  } else if (groupId === 'group-et') {
    // -CH2-CH3
    let p1 = attachPos;
    if (reuseAtomId !== undefined) {
      p1 = new Vec2(
        attachPos.x + Math.cos(growDirection) * L,
        attachPos.y + Math.sin(growDirection) * L
      );
    }
    const atom1 = molecule.addAtom({ label: 'C', position: p1 });
    if (reuseAtomId !== undefined) {
      molecule.addBond({ begin: reuseAtomId, end: atom1.id, type: Bond.TYPE.SINGLE });
    }

    // Zigzag second carbon
    const zigAngle = growDirection + Math.PI / 6 * (Math.sin(growDirection) > 0 ? -1 : 1);
    const p2 = new Vec2(p1.x + Math.cos(zigAngle) * L, p1.y + Math.sin(zigAngle) * L);
    const atom2 = molecule.addAtom({ label: 'C', position: p2 });
    molecule.addBond({ begin: atom1.id, end: atom2.id, type: Bond.TYPE.SINGLE });

  } else if (groupId === 'group-ipr') {
    // -CH(CH3)2: branch point with two methyls
    let p1 = attachPos;
    if (reuseAtomId !== undefined) {
      p1 = new Vec2(
        attachPos.x + Math.cos(growDirection) * L,
        attachPos.y + Math.sin(growDirection) * L
      );
    }
    const atom1 = molecule.addAtom({ label: 'C', position: p1 });
    if (reuseAtomId !== undefined) {
      molecule.addBond({ begin: reuseAtomId, end: atom1.id, type: Bond.TYPE.SINGLE });
    }

    // Two methyls at ±60° from growth direction
    const a1 = growDirection + Math.PI / 3;
    const a2 = growDirection - Math.PI / 3;
    const m1 = molecule.addAtom({ label: 'C', position: new Vec2(p1.x + Math.cos(a1)*L, p1.y + Math.sin(a1)*L) });
    const m2 = molecule.addAtom({ label: 'C', position: new Vec2(p1.x + Math.cos(a2)*L, p1.y + Math.sin(a2)*L) });
    molecule.addBond({ begin: atom1.id, end: m1.id, type: Bond.TYPE.SINGLE });
    molecule.addBond({ begin: atom1.id, end: m2.id, type: Bond.TYPE.SINGLE });

  } else if (groupId === 'group-tbu') {
    // -C(CH3)3: quaternary carbon with three methyls
    let p1 = attachPos;
    if (reuseAtomId !== undefined) {
        p1 = new Vec2(
        attachPos.x + Math.cos(growDirection) * L,
        attachPos.y + Math.sin(growDirection) * L
      );
    }
    const atom1 = molecule.addAtom({ label: 'C', position: p1 });
    if (reuseAtomId !== undefined) {
      molecule.addBond({ begin: reuseAtomId, end: atom1.id, type: Bond.TYPE.SINGLE });
    }

    // Three methyls at 0°, 120°, 240° relative to growth direction (tetrahedral)
    for (let i = 0; i < 3; i++) {
      const a = growDirection + (i * 2 * Math.PI / 3) + Math.PI / 6;
      const m = molecule.addAtom({ label: 'C', position: new Vec2(p1.x + Math.cos(a)*L, p1.y + Math.sin(a)*L) });
      molecule.addBond({ begin: atom1.id, end: m.id, type: Bond.TYPE.SINGLE });
    }

  } else if (groupId === 'group-ph') {
    // -Ph: benzene ring attached at one vertex
    if (reuseAtomId !== undefined) {
      placeBenzeneRing(molecule, attachPos, growDirection, reuseAtomId);
    } else {
      const attachAtom = molecule.addAtom({ label: 'C', position: attachPos });
      placeBenzeneRing(molecule, attachPos, growDirection, attachAtom.id);
    }

  } else if (groupId === 'group-bn') {
    // -Bn: -CH2-Ph (methylene + phenyl)
    let p1 = attachPos;
    if (reuseAtomId !== undefined) {
      p1 = new Vec2(
        attachPos.x + Math.cos(growDirection) * L,
        attachPos.y + Math.sin(growDirection) * L
      );
    }
    const ch2 = molecule.addAtom({ label: 'C', position: p1 });
    if (reuseAtomId !== undefined) {
      molecule.addBond({ begin: reuseAtomId, end: ch2.id, type: Bond.TYPE.SINGLE });
    }
    placeBenzeneRing(molecule, p1, growDirection, ch2.id);
  }

  state.saveToHistory();
  state.updateMolecule(molecule);
}

export const FunctionalGroupTool = {
  onMouseDown: (pos: Vec2, closestAtom: number | null) => {
    const store = useCanvasStore.getState();
    const groupId = store.activeSubTool ?? 'group-me';
    placeFunctionalGroup(groupId, closestAtom, pos);
  },
};
