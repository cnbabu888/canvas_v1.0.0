/**
 * Canvas Renderer - Professional ChemDraw/ACS Style
 *
 * Key improvements over v1:
 * - Inline implicit H: "N" → "NH₂", "O" → "OH" (ChemDraw standard)
 * - Subscript numbers rendered at correct size/position  
 * - Bond clearance based on full measured label width (including H)
 * - Kekulé alternating double bonds for aromatic rings
 * - Ring-center detection for correct inner-line placement
 * - Thinner ACS-standard bond lines (1.5px)
 * - White rect eraser sized to full label box
 */

import { Molecule } from '../entities/Molecule';
import { Atom } from '../entities/Atom';
import { Bond } from '../entities/Bond';
import { Vec2 } from '../entities/Vec2';
import {
  CANVAS_CONSTANTS,
  getAtomColor,
  BOND_TYPE,
  BOND_STEREO,
} from '../engines/ChemistryConstants';
import { GeometryEngine } from '../engines/GeometryEngine';

export interface RenderOptions {
  showImplicitH?: boolean;
  showCharges?: boolean;
  showAtomNumbers?: boolean;
  highlightSelection?: boolean;
  backgroundColor?: string;
}

// ChemDraw ACS standard font settings
const FONT_SIZE = 15;          // main atom label size (px)
const SUBSCRIPT_SIZE = 10;     // subscript number size (px)
const BOND_WIDTH = 1.5;        // ACS standard line weight

interface LabelMetrics {
  parts: Array<{ text: string; x: number; y: number; size: number }>;
  totalWidth: number;
  height: number;
  hDirection: 'right' | 'left'; // which side the H is drawn
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<RenderOptions>;

  constructor(canvas: HTMLCanvasElement, options: RenderOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.options = {
      showImplicitH: options.showImplicitH ?? true,
      showCharges: options.showCharges ?? true,
      showAtomNumbers: options.showAtomNumbers ?? false,
      highlightSelection: options.highlightSelection ?? true,
      backgroundColor: options.backgroundColor ?? '#FFFFFF',
    };
  }

  clear(): void {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(
    molecule: Molecule,
    selectedAtoms: Set<number> = new Set(),
    selectedBonds: Set<number> = new Set(),
    validationErrors: Set<number> = new Set()
  ): void {
    this.clear();
    this.ctx.imageSmoothingEnabled = true;

    // 0. Pre-compute Kekulé double-bond assignments for fallback
    const kekuleDoubleSet = this.computeKekuleSet(molecule);

    // 1. Identification of Aromatic Rings for Robinson Circle
    const aromaticRings = this.findAromaticRings(molecule);

    // 2. Bonds first (behind atom labels)
    for (const bond of molecule.bonds.values()) {
      // Check if this bond belongs to an aromatic ring that we'll draw a circle for
      const isPartofAromaticCircle = aromaticRings.some(ring => ring.bondIds.has(bond.id));
      this.renderBond(bond, molecule, selectedBonds.has(bond.id), kekuleDoubleSet, isPartofAromaticCircle);
    }

    // 3. Draw Aromatic Circles (Robinson Style)
    for (const ring of aromaticRings) {
      this.renderAromaticCircle(ring.center, ring.radius);
    }

    // 4. Atoms on top
    for (const atom of molecule.atoms.values()) {
      this.renderAtom(atom, molecule, selectedAtoms.has(atom.id), validationErrors.has(atom.id));
    }

    // 5. Annotations (arrows, etc.)
    this.renderAnnotations(molecule);
  }

  // ─── Kekulé Assignment ───────────────────────────────────────────────────────

  /**
   * Assigns alternating double bonds to aromatic ring bonds.
   * Returns a Set of bond IDs that should render with a Kekulé inner line.
   */
  private computeKekuleSet(molecule: Molecule): Set<number> {
    const result = new Set<number>();
    const visited = new Set<number>();

    for (const bond of molecule.bonds.values()) {
      if (bond.type !== BOND_TYPE.AROMATIC) continue;
      if (visited.has(bond.id)) continue;

      // Find the ring this bond belongs to
      const ring = this.findRingPath(bond.begin, bond.end, molecule, 8);
      if (!ring || ring.length < 4) continue;

      // Assign alternating pattern: bonds 0, 2, 4... get inner line
      for (let i = 0; i < ring.length; i++) {
        const a1 = ring[i];
        const a2 = ring[(i + 1) % ring.length];
        const b = molecule.findBond(a1, a2);
        if (b) {
          visited.add(b.id);
          if (i % 2 === 0) result.add(b.id);
        }
      }
    }
    return result;
  }

  // ─── Atom Label Computation ──────────────────────────────────────────────────

  /**
   * Compute the label direction and metrics for an atom.
   * H is placed on the RIGHT by default, LEFT if the atom is on the right side of a ring.
   */
  private computeLabelMetrics(atom: Atom, molecule: Molecule): LabelMetrics | null {
    // Skip hidden atoms
    const isCarbonInRing = atom.label === 'C' && atom.neighbors.length >= 2;
    if (isCarbonInRing) return null;

    const bonds = molecule.getAtomBonds(atom.id);
    const bondOrders = bonds.map(b => b.getBondOrder());
    const implicitH = this.options.showImplicitH ? atom.calculateImplicitH(bondOrders) : 0;

    // Determine H direction using canonical GeometryEngine algorithm
    const hDirection = GeometryEngine.implicitHDirection(atom, molecule);

    const elemLabel = atom.getDisplayLabel();
    this.ctx.font = `bold ${FONT_SIZE}px 'Arial', sans-serif`;

    // Measure element symbol
    const elemWidth = this.ctx.measureText(elemLabel).width;

    if (implicitH === 0) {
      return {
        parts: [{ text: elemLabel, x: 0, y: 0, size: FONT_SIZE }],
        totalWidth: elemWidth,
        height: FONT_SIZE,
        hDirection,
      };
    }

    // H text
    this.ctx.font = `bold ${FONT_SIZE}px 'Arial', sans-serif`;
    const hWidth = this.ctx.measureText('H').width;

    // Subscript number
    this.ctx.font = `bold ${SUBSCRIPT_SIZE}px 'Arial', sans-serif`;
    const subWidth = implicitH > 1 ? this.ctx.measureText(implicitH.toString()).width : 0;

    const totalWidth = elemWidth + hWidth + subWidth;

    const parts: LabelMetrics['parts'] = [];

    if (hDirection === 'right') {
      // Element | H | subscript
      parts.push({ text: elemLabel, x: 0, y: 0, size: FONT_SIZE });
      parts.push({ text: 'H', x: elemWidth, y: 0, size: FONT_SIZE });
      if (implicitH > 1) {
        parts.push({ text: implicitH.toString(), x: elemWidth + hWidth, y: FONT_SIZE * 0.35, size: SUBSCRIPT_SIZE });
      }
    } else {
      // subscript | H | Element (reversed)
      let cursor = 0;
      if (implicitH > 1) {
        parts.push({ text: implicitH.toString(), x: cursor, y: FONT_SIZE * 0.35, size: SUBSCRIPT_SIZE });
        cursor += subWidth;
      }
      parts.push({ text: 'H', x: cursor, y: 0, size: FONT_SIZE });
      parts.push({ text: elemLabel, x: cursor + hWidth, y: 0, size: FONT_SIZE });
    }

    return { parts, totalWidth, height: FONT_SIZE, hDirection };
  }

  // ─── Atom Rendering ──────────────────────────────────────────────────────────

  private renderAtom(atom: Atom, molecule: Molecule, isSelected: boolean, hasValidationError: boolean = false): void {
    const pos = atom.position;

    // Safety check: Skip invalid coordinates
    if (isNaN(pos.x) || isNaN(pos.y) || !isFinite(pos.x) || !isFinite(pos.y)) return;

    this.ctx.save();

    // Validation error glow
    if (hasValidationError) {
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red-500 equivalent
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, CANVAS_CONSTANTS.HOVER_RADIUS + 2, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    // Selection glow
    if (isSelected && this.options.highlightSelection) {
      this.ctx.fillStyle = 'rgba(0, 123, 255, 0.18)';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, CANVAS_CONSTANTS.SELECTION_RADIUS, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    // Hover glow
    if (atom.isHovered) {
      this.ctx.fillStyle = 'rgba(255, 140, 0, 0.22)';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, CANVAS_CONSTANTS.HOVER_RADIUS, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    const metrics = this.computeLabelMetrics(atom, molecule);

    if (!metrics) {
      // Carbon-in-ring: just draw selection/hover, no label
      this.ctx.restore();
      return;
    }

    const { parts, totalWidth, height } = metrics;
    const color = getAtomColor(atom.label);
    const drawColor = (color === '#000000' || color === '#111111') ? '#000000' : color;

    // Center the full label block on pos
    const originX = pos.x - totalWidth / 2;
    const originY = pos.y;

    // White eraser background (covers bonds behind label)
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(
      originX - 2,
      originY - height / 2 - 2,
      totalWidth + 4,
      height + SUBSCRIPT_SIZE * 0.5 + 4   // extra for subscript descender
    );

    // Render each text part
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';

    for (const part of parts) {
      this.ctx.font = `bold ${part.size}px 'Arial', sans-serif`;
      this.ctx.fillStyle = drawColor;
      this.ctx.fillText(part.text, originX + part.x, originY + part.y);
    }

    // Charge superscript (top-right of element symbol)
    if (this.options.showCharges && atom.charge !== 0) {
      this.ctx.font = `bold ${SUBSCRIPT_SIZE}px Arial`;
      this.ctx.fillStyle = drawColor;
      this.ctx.fillText(
        atom.getChargeString(),
        pos.x + totalWidth / 2 + 2,
        originY - height * 0.45
      );
    }

    this.ctx.restore();
  }

  // ─── Bond Clearance ──────────────────────────────────────────────────────────

  /**
   * Get the horizontal clearance distance for a bond endpoint at this atom.
   * Bonds are trimmed by half the label's total rendered width.
   */
  private getBondClearance(atom: Atom, molecule: Molecule, bondDir: Vec2): number {
    const isCarbonInRing = atom.label === 'C' && atom.neighbors.length >= 2;
    if (isCarbonInRing) return 0;
    if (atom.label === 'C' && atom.neighbors.length <= 1) return 0; // terminal C: no label shown

    // Compute full label width
    const bonds = molecule.getAtomBonds(atom.id);
    const bondOrders = bonds.map(b => b.getBondOrder());
    const implicitH = this.options.showImplicitH ? atom.calculateImplicitH(bondOrders) : 0;

    this.ctx.font = `bold ${FONT_SIZE}px 'Arial', sans-serif`;
    const elemWidth = this.ctx.measureText(atom.getDisplayLabel()).width;
    const hWidth = implicitH > 0 ? this.ctx.measureText('H').width : 0;
    this.ctx.font = `bold ${SUBSCRIPT_SIZE}px 'Arial', sans-serif`;
    const subWidth = implicitH > 1 ? this.ctx.measureText(implicitH.toString()).width : 0;

    const totalWidth = elemWidth + hWidth + subWidth;

    // Project label half-width along the bond direction
    // Use ellipse approximation: clearance = half total label width along bond + padding
    const halfW = totalWidth / 2 + 3;
    const halfH = FONT_SIZE / 2 + 3;

    // Elliptical clearance: r = (halfW * halfH) / sqrt((halfH*cos)^2 + (halfW*sin)^2)
    const cosA = Math.abs(bondDir.x);
    const sinA = Math.abs(bondDir.y);
    const denom = Math.sqrt((halfH * cosA) ** 2 + (halfW * sinA) ** 2);
    return denom === 0 ? halfW : (halfW * halfH) / denom;
  }

  private getTrimmedEndpoints(startAtom: Atom, endAtom: Atom, molecule: Molecule) {
    const start = startAtom.position;
    const end = endAtom.position;
    const bondVec = end.sub(start);
    const bondLen = bondVec.length();
    if (bondLen === 0) return { trimStart: start, trimEnd: end };

    const dir = bondVec.normalized();

    const startClearance = this.getBondClearance(startAtom, molecule, dir);
    const endClearance = this.getBondClearance(endAtom, molecule, dir);

    const trimStart = start.add(dir.scaled(startClearance));
    const trimEnd = end.sub(dir.scaled(endClearance));

    return { trimStart, trimEnd };
  }

  // ─── Bond Rendering ──────────────────────────────────────────────────────────

  private renderBond(
    bond: Bond,
    molecule: Molecule,
    isSelected: boolean,
    kekuleDoubleSet: Set<number>,
    isAromaticRobinson: boolean = false
  ): void {
    const startAtom = molecule.getAtom(bond.begin);
    const endAtom = molecule.getAtom(bond.end);
    if (!startAtom || !endAtom) return;

    // Safety check: Skip invalid coordinates to prevent "streaking" artifacts
    if (!startAtom.position.isValid() || !endAtom.position.isValid() ||
        isNaN(startAtom.position.x) || isNaN(startAtom.position.y) ||
        isNaN(endAtom.position.x) || isNaN(endAtom.position.y) ||
        !isFinite(startAtom.position.x) || !isFinite(startAtom.position.y)) {
      return;
    }

    const { trimStart, trimEnd } = this.getTrimmedEndpoints(startAtom, endAtom, molecule);

    this.ctx.save();

    // Selection highlight
    if (isSelected && this.options.highlightSelection) {
      this.ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
      this.ctx.lineWidth = BOND_WIDTH + 7;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(trimStart.x, trimStart.y);
      this.ctx.lineTo(trimEnd.x, trimEnd.y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = '#111';
    this.ctx.lineWidth = BOND_WIDTH;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (bond.type) {
      case BOND_TYPE.SINGLE:
        this.renderSingleBond(trimStart, trimEnd, bond.stereo, startAtom.position, endAtom.position);
        break;
      case BOND_TYPE.DOUBLE:
        this.renderDoubleBond(trimStart, trimEnd, molecule, bond, false);
        break;
      case BOND_TYPE.TRIPLE:
        this.renderTripleBond(trimStart, trimEnd);
        break;
      case BOND_TYPE.AROMATIC:
        // Use Robinson Circle if detected, else Kekulé
        if (isAromaticRobinson) {
          // Draw just the single line (outer edge)
          this.renderSingleBond(trimStart, trimEnd, BOND_STEREO.NONE, startAtom.position, endAtom.position);
        } else {
          // Draw Kekulé inner line
          this.renderDoubleBond(trimStart, trimEnd, molecule, bond, !kekuleDoubleSet.has(bond.id));
        }
        break;
      default:
        this.renderSingleBond(trimStart, trimEnd, BOND_STEREO.NONE, startAtom.position, endAtom.position);
    }

    this.ctx.restore();
  }

  private renderSingleBond(
    start: Vec2, end: Vec2,
    stereo: number,
    rawStart: Vec2, rawEnd: Vec2
  ): void {
    if (stereo === BOND_STEREO.UP) {
      this.renderWedgeBond(rawStart, rawEnd);
    } else if (stereo === BOND_STEREO.DOWN) {
      this.renderHashedBond(rawStart, rawEnd);
    } else if (stereo === BOND_STEREO.EITHER) {
      this.renderWavyBond(start, end);
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
    }
  }

  /**
   * Kekulé double bond:
   * - `singleOnly`: draw just the outer single line (for alternating aromatic bonds)
   * - Otherwise: outer full line + inner inset line (toward ring center)
   */
  private renderDoubleBond(
    start: Vec2,
    end: Vec2,
    molecule: Molecule,
    bond: Bond,
    singleOnly: boolean
  ): void {
    // Always draw the main (outer) line
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    if (singleOnly) return;

    const OFFSET = 4.5; // px offset for inner line
    const INSET  = 0.14; // fraction to inset inner line ends

    const vec = end.sub(start).normalized();
    const perp = new Vec2(-vec.y, vec.x);

    // Determine which side the ring center is on
    const ringCenter = this.getRingCenter(bond, molecule);
    let perpDir = perp; // default: offset to the left of bond direction

    if (ringCenter) {
      const mid = start.add(end).scaled(0.5);
      const toCenter = ringCenter.sub(mid).normalized();
      // Pick the perp direction that points toward the ring center
      const dot = perp.x * toCenter.x + perp.y * toCenter.y;
      perpDir = dot >= 0 ? perp : perp.scaled(-1);
    }

    const off = perpDir.scaled(OFFSET);
    const segLen = end.sub(start);
    const insetVec = segLen.scaled(INSET);

    // Inner line: offset + inset from both ends
    this.ctx.beginPath();
    this.ctx.moveTo(start.x + off.x + insetVec.x, start.y + off.y + insetVec.y);
    this.ctx.lineTo(end.x + off.x - insetVec.x, end.y + off.y - insetVec.y);
    this.ctx.stroke();
  }

  private renderTripleBond(start: Vec2, end: Vec2): void {
    const OFFSET = CANVAS_CONSTANTS.TRIPLE_BOND_OFFSET;
    const vec = end.sub(start).normalized();
    const perp = new Vec2(-vec.y, vec.x).scaled(OFFSET);

    this.ctx.beginPath();
    // Center
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    // Upper
    this.ctx.moveTo(start.x + perp.x, start.y + perp.y);
    this.ctx.lineTo(end.x + perp.x, end.y + perp.y);
    // Lower
    this.ctx.moveTo(start.x - perp.x, start.y - perp.y);
    this.ctx.lineTo(end.x - perp.x, end.y - perp.y);
    this.ctx.stroke();
  }

  // ─── Ring Detection ──────────────────────────────────────────────────────────

  private getRingCenter(bond: Bond, molecule: Molecule): Vec2 | null {
    const path = this.findRingPath(bond.begin, bond.end, molecule, 8);
    if (!path || path.length < 3) return null;

    let cx = 0, cy = 0;
    for (const id of path) {
      const a = molecule.getAtom(id);
      if (!a) return null;
      cx += a.position.x;
      cy += a.position.y;
    }
    return new Vec2(cx / path.length, cy / path.length);
  }

  private findRingPath(
    startId: number,
    endId: number,
    molecule: Molecule,
    maxDepth: number
  ): number[] | null {
    const visited = new Set<number>([startId]);
    const stack: { id: number; path: number[] }[] = [{ id: endId, path: [endId] }];

    while (stack.length > 0) {
      const { id, path } = stack.pop()!;
      if (path.length > maxDepth) continue;

      const atom = molecule.getAtom(id);
      if (!atom) continue;

      for (const neighborId of atom.neighbors) {
        if (neighborId === startId && path.length >= 3) {
          return [startId, ...path];
        }
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          stack.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }
    return null;
  }

  // ─── Stereo Bonds ────────────────────────────────────────────────────────────

  private renderWedgeBond(start: Vec2, end: Vec2): void {
    const vec = end.sub(start).normalized();
    const perp = new Vec2(-vec.y, vec.x);
    const w = CANVAS_CONSTANTS.WEDGE_WIDTH;

    this.ctx.fillStyle = '#111';
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x + perp.x * w / 2, end.y + perp.y * w / 2);
    this.ctx.lineTo(end.x - perp.x * w / 2, end.y - perp.y * w / 2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderHashedBond(start: Vec2, end: Vec2): void {
    const vec = end.sub(start);
    const len = vec.length();
    const num = Math.floor(len / CANVAS_CONSTANTS.HASH_SPACING);
    const norm = vec.normalized();
    const perp = new Vec2(-norm.y, norm.x);

    this.ctx.lineWidth = CANVAS_CONSTANTS.HASH_LINE_WIDTH;
    for (let i = 0; i <= num; i++) {
      const t = i / Math.max(num, 1);
      const pos = start.add(vec.scaled(t));
      const w = t * CANVAS_CONSTANTS.WEDGE_WIDTH;
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x - perp.x * w / 2, pos.y - perp.y * w / 2);
      this.ctx.lineTo(pos.x + perp.x * w / 2, pos.y + perp.y * w / 2);
      this.ctx.stroke();
    }
  }

  private renderWavyBond(start: Vec2, end: Vec2): void {
    const vec = end.sub(start);
    const norm = vec.normalized();
    const perp = new Vec2(-norm.y, norm.x);
    const numWaves = 5;
    const amp = 3;

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    for (let i = 1; i <= numWaves * 2; i++) {
      const t = i / (numWaves * 2);
      const pos = start.add(vec.scaled(t));
      const offset = Math.sin(i * Math.PI) * amp;
      this.ctx.lineTo(pos.x + perp.x * offset, pos.y + perp.y * offset);
    }
    this.ctx.stroke();
  }

  // ─── Annotations ─────────────────────────────────────────────────────────────

  private renderAnnotations(molecule: Molecule): void {
    if (!molecule.annotations || molecule.annotations.length === 0) return;

    this.ctx.save();
    for (const ann of molecule.annotations) {
      if (ann.type === 'reaction-arrow') {
        this.drawReactionArrow(ann.start, ann.end, ann.subtype);
      } else if (ann.type === 'mechanism-arrow') {
        this.drawMechanismArrow(ann.start, ann.end, ann.sourceAtomId, ann.targetAtomId);
      }
    }
    this.ctx.restore();
  }

  private drawReactionArrow(start: { x: number, y: number }, end: { x: number, y: number }, subtype: string): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 5) return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Arrowhead
    const headLen = 10;
    const headAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLen * Math.cos(angle - headAngle), end.y - headLen * Math.sin(angle - headAngle));
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLen * Math.cos(angle + headAngle), end.y - headLen * Math.sin(angle + headAngle));
    ctx.stroke();

    if (subtype === 'arrow-equilibrium') {
      // Draw second half-head for equilibrium
      const offset = 4;
      const ox = Math.cos(angle + Math.PI / 2) * offset;
      const oy = Math.sin(angle + Math.PI / 2) * offset;
      
      ctx.beginPath();
      ctx.moveTo(start.x + ox, start.y + oy);
      ctx.lineTo(end.x + ox, end.y + oy);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(start.x + ox, start.y + oy);
      ctx.lineTo(start.x + ox + headLen * Math.cos(angle - headAngle), start.y + oy + headLen * Math.sin(angle - headAngle));
      ctx.stroke();
    }
  }

  private drawMechanismArrow(start: { x: number, y: number }, end: { x: number, y: number }, _sId: any, _tId: any): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#2563EB'; // Blue for mechanism arrows
    ctx.lineWidth = 1.2;

    // Simple curved arrow using quadratic curve
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    // Control point offset for curve
    const offsetX = -dy * 0.3;
    const offsetY = dx * 0.3;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(midX + offsetX, midY + offsetY, end.x, end.y);
    ctx.stroke();

    // Arrowhead at end
    const angle = Math.atan2(end.y - (midY + offsetY), end.x - (midX + offsetX));
    const headLen = 8;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  // ─── Robinson Aromatic Detection & Drawing ───────────────────────────────────

  private findAromaticRings(molecule: Molecule): any[] {
     // For each aromatic bond, find the smallest cycle it belongs to
     const aromaticBonds = Array.from(molecule.bonds.values()).filter(b => b.type === BOND_TYPE.AROMATIC);
     if (aromaticBonds.length === 0) return [];

     const rings: any[] = [];

     for (const bond of aromaticBonds) {
       const path = this.findRingPath(bond.begin, bond.end, molecule, 6);
       if (path && path.length === 6) {
         // This is a 6-ring. Check if all bonds are aromatic
         const bondIds = new Set<number>();
         let allAromatic = true;
         let sumX = 0, sumY = 0;
         
         for (let i = 0; i < 6; i++) {
           const a1 = path[i];
           const a2 = path[(i + 1) % 6];
           const b = molecule.findBond(a1, a2);
           if (!b || b.type !== BOND_TYPE.AROMATIC) {
             allAromatic = false;
             break;
           }
           bondIds.add(b.id);
           const atom = molecule.atoms.get(a1)!;
           sumX += atom.position.x;
           sumY += atom.position.y;
         }

         if (allAromatic) {
           const center = new Vec2(sumX / 6, sumY / 6);
           // dedupe rings using center comparison
           const isDuplicate = rings.some(r => r.center.dist(center) < 1.0);
           if (!isDuplicate) {
             const rOuter = GeometryEngine.ringRadius(6);
             rings.push({ center, radius: rOuter * 0.75, bondIds });
           }
         }
       }
     }
     return rings;
  }

  private renderAromaticCircle(center: Vec2, radius: number): void {
    if (!center.isValid()) return;
    this.ctx.save();
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([]); // NO dashes
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.restore();
  }
}
