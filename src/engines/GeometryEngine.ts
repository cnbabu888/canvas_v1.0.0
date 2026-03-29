/**
 * GeometryEngine - ACS 1996 / IUPAC Drawing Standard Rules
 *
 * Implements:
 * - ACS standard bond length (40px = 1.54Å at standard scale)
 * - Bond angle rules for sp, sp2, sp3 hybridizations
 * - 30°-grid angle snapping (ChemDraw standard)
 * - Ring geometry: radius = L / (2·sin(π/n))
 * - Ring fusion: compute outward direction from existing bonds
 * - Optimal next-bond direction for chain drawing
 * - H placement direction auto-detection
 */

import { Vec2 } from '../entities/Vec2';
import { Atom } from '../entities/Atom';
import { Molecule } from '../entities/Molecule';

// ─── ACS 1996 Standard Constants ─────────────────────────────────────────────

export const ACS = {
  /** Standard bond length in pixels (≈ 1.54 Å at 25.9 px/Å) */
  BOND_LENGTH: 40,

  /** Angle snap grid (ChemDraw uses 15°, we use 30° as default) */
  ANGLE_SNAP_DEG: 30,
  ANGLE_SNAP_RAD: Math.PI / 6,

  /** Minimum bond length before snap (pixels) */
  MIN_DRAG: 6,

  /** Default chain drawing angles  (zigzag at 30°/−30° from horizontal) */
  CHAIN_ANGLE_UP:   -Math.PI / 6,   //  −30° (up-right)
  CHAIN_ANGLE_DOWN:  Math.PI / 6,   //  +30° (down-right)

  /** Hybridization bond angles (degrees) */
  ANGLE_SP:   180,
  ANGLE_SP2:  120,
  ANGLE_SP3:  109.47,

  /** Ring interior angles by size (sum of interior angles / n) */
  RING_INTERIOR: {
    3: 60,
    4: 90,
    5: 108,
    6: 120,
    7: 128.57,
    8: 135,
  } as Record<number, number>,
} as const;

// ─── Core Geometry Functions ──────────────────────────────────────────────────

export const GeometryEngine = {

  /**
   * Snap an angle to the nearest 30° increment.
   * This is the ChemDraw / ACS standard grid.
   */
  snapAngle(angle: number): number {
    return Math.round(angle / ACS.ANGLE_SNAP_RAD) * ACS.ANGLE_SNAP_RAD;
  },

  /**
   * Compute the radius of a regular n-gon ring given the standard bond length.
   * Formula: L = 2·R·sin(π/n)  →  R = L / (2·sin(π/n))
   */
  ringRadius(ringSize: number, bondLength = ACS.BOND_LENGTH): number {
    return bondLength / (2 * Math.sin(Math.PI / ringSize));
  },

  /**
   * Get the "outward" direction angle (in radians) from an atom.
   * This is the direction with the most angular space — where a new ring or bond
   * should grow from. For an isolated atom, returns 0 (right).
   */
  getOutwardAngle(atom: Atom, molecule: Molecule): number {
    if (atom.neighbors.length === 0) return 0;

    // Collect existing bond direction angles (pointing AWAY from atom)
    const angles: number[] = [];
    for (const nid of atom.neighbors) {
      const n = molecule.getAtom(nid);
      if (!n) continue;
      angles.push(Math.atan2(
        n.position.y - atom.position.y,
        n.position.x - atom.position.x
      ));
    }
    angles.sort((a, b) => a - b);

    if (angles.length === 1) {
      // Single bond: grow in the opposite direction, snapped to grid
      return GeometryEngine.snapAngle(angles[0] + Math.PI);
    }

    // Find the largest angular gap between existing bonds
    let maxGap = 0;
    let gapMidAngle = 0;

    for (let i = 0; i < angles.length; i++) {
      const a1 = angles[i];
      const a2 = angles[(i + 1) % angles.length];
      let gap = a2 - a1;
      if (gap <= 0) gap += 2 * Math.PI;

      if (gap > maxGap) {
        maxGap = gap;
        // Midpoint of the angular gap
        gapMidAngle = a1 + gap / 2;
      }
    }

    // Last gap wraps around 2π
    const firstAngle = angles[0] + 2 * Math.PI;
    const lastAngle  = angles[angles.length - 1];
    const wrapGap    = firstAngle - lastAngle;
    if (wrapGap > maxGap) {
      maxGap = wrapGap;
      gapMidAngle = lastAngle + wrapGap / 2;
    }

    return GeometryEngine.snapAngle(gapMidAngle);
  },

  /**
   * Get the best next bond angle from a chain atom.
   * Follows ACS zigzag convention: alternates between +30° and −30° from horizontal.
   * If there's already one bond, continues the zigzag.
   */
  getNextChainAngle(atom: Atom, molecule: Molecule): number {
    if (atom.neighbors.length === 0) return ACS.CHAIN_ANGLE_DOWN;

    if (atom.neighbors.length === 1) {
      const n = molecule.getAtom(atom.neighbors[0]);
      if (!n) return 0;
      const incomingAngle = Math.atan2(
        atom.position.y - n.position.y,
        atom.position.x - n.position.x
      );
      // Continue in same horizontal direction, alternate vertical sign
      const goRight = incomingAngle > -Math.PI / 2 && incomingAngle < Math.PI / 2;
      const incomingVertical = Math.sin(incomingAngle) > 0; // was going down
      const nextAngleBase = goRight ? 0 : Math.PI;
      const nextSign = incomingVertical ? -1 : 1;
      return nextAngleBase + nextSign * (Math.PI / 6);
    }

    return GeometryEngine.getOutwardAngle(atom, molecule);
  },

  /**
   * Compute the ring center position given:
   * - anchorPos: position of the atom the ring is being attached to
   * - outwardAngle: direction FROM the anchor atom TOWARD the new ring center
   * - ringSize: number of ring atoms
   */
  computeRingCenter(
    anchorPos: Vec2,
    outwardAngle: number,
    ringSize: number
  ): Vec2 {
    const radius = GeometryEngine.ringRadius(ringSize);
    return new Vec2(
      anchorPos.x + Math.cos(outwardAngle) * radius,
      anchorPos.y + Math.sin(outwardAngle) * radius
    );
  },

  /**
   * Refined ring atom position calculation (ACS standard)
   * Formula: radius = L / (2 * sin(π/n))
   * Default startAngleDeg = -90 (points zenith atom upward)
   */
  getRingAtomPositions(cx: number, cy: number, atomCount: number, startAngleDeg = -90): Vec2[] {
    const startAngle = (startAngleDeg * Math.PI) / 180;
    const radius = ACS.BOND_LENGTH / (2 * Math.sin(Math.PI / atomCount));
    
    return Array.from({ length: atomCount }, (_, i) => {
      const angle = startAngle + (i * 2 * Math.PI) / atomCount;
      return new Vec2(
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle)
      );
    });
  },

  /**
   * Generate ring atom positions around a center.
   * anchorAngle is the angle FROM the center TO the anchor atom.
   * Atoms go clockwise from that angle.
   */
  generateRingPositions(
    center: Vec2,
    ringSize: number,
    startAngle: number  // angle of the FIRST atom from center
  ): Vec2[] {
    const radius = GeometryEngine.ringRadius(ringSize);
    const angleStep = (2 * Math.PI) / ringSize;
    const positions: Vec2[] = [];

    for (let i = 0; i < ringSize; i++) {
      const angle = startAngle + i * angleStep;
      positions.push(new Vec2(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius
      ));
    }
    return positions;
  },

  /**
   * Snap a raw drag position to the nearest 30° angle from startPos,
   * clamping to ACS bond length. If drag is too short, extend along
   * the last used direction or horizontal.
   */
  snapBondEnd(
    startPos: Vec2,
    rawEndPos: Vec2,
    fallbackAngle?: number
  ): Vec2 {
    const delta = rawEndPos.sub(startPos);
    const dist = delta.length();

    if (dist < ACS.MIN_DRAG) {
      // Too short to determine direction — use fallback or horizontal
      const angle = fallbackAngle ?? 0;
      return new Vec2(
        startPos.x + Math.cos(angle) * ACS.BOND_LENGTH,
        startPos.y + Math.sin(angle) * ACS.BOND_LENGTH
      );
    }

    const rawAngle = Math.atan2(delta.y, delta.x);
    const snapped  = GeometryEngine.snapAngle(rawAngle);

    return new Vec2(
      startPos.x + Math.cos(snapped) * ACS.BOND_LENGTH,
      startPos.y + Math.sin(snapped) * ACS.BOND_LENGTH
    );
  },

  /**
   * Determine which side (left / right) to render implicit H for an atom.
   * H goes to the RIGHT if all neighbors are to the right (or atom has none),
   * otherwise LEFT.
   */
  implicitHDirection(atom: Atom, molecule: Molecule): 'left' | 'right' {
    if (atom.neighbors.length === 0) return 'right';

    let avgDx = 0;
    for (const nid of atom.neighbors) {
      const n = molecule.getAtom(nid);
      if (n) avgDx += n.position.x - atom.position.x;
    }
    return avgDx > 0 ? 'left' : 'right';
  },

  /**
   * Compute optimal ring size from number of atoms
   * (validates that ring size is between 3 and 8)
   */
  validateRingSize(n: number): number {
    return Math.max(3, Math.min(8, n));
  },
};
