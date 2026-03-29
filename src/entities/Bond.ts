/**
 * Bond Entity
 * Simplified from Ketcher (Apache 2.0 license)
 * Represents a chemical bond between two atoms
 */

import { BOND_TYPE, BOND_STEREO } from '../engines/ChemistryConstants';
import { Vec2 } from './Vec2';

export type BondType = typeof BOND_TYPE[keyof typeof BOND_TYPE];

export interface BondAttributes {
  begin: number;              // Start atom ID
  end: number;                // End atom ID
  type: number;               // Bond type (1=single, 2=double, 3=triple, etc.)
  stereo?: number;            // Stereochemistry (0=none, 1=up, 4=either, 6=down)
  topology?: number;          // Ring/chain constraint
}

export class Bond {
  // Constants (from Ketcher/MDL Molfile format)
  static readonly TYPE = BOND_TYPE;
  static readonly STEREO = BOND_STEREO;

  id: number;                 // Unique bond ID
  begin: number;              // Start atom ID
  end: number;                // End atom ID
  type: number;               // Bond type
  stereo: number;             // Stereochemistry
  topology: number;           // Ring/chain constraint

  // Runtime properties (calculated)
  length: number;             // Bond length (pixels)
  angle: number;              // Bond angle (radians)
  center: Vec2;               // Midpoint
  isSelected: boolean;        // Selection state
  isHovered: boolean;         // Hover state

  constructor(id: number, attributes: BondAttributes) {
    this.id = id;
    this.begin = attributes.begin;
    this.end = attributes.end;
    this.type = attributes.type;
    this.stereo = attributes.stereo ?? Bond.STEREO.NONE;
    this.topology = attributes.topology ?? 0;

    // Runtime state (will be calculated)
    this.length = 0;
    this.angle = 0;
    this.center = new Vec2(0, 0);
    this.isSelected = false;
    this.isHovered = false;
  }

  // --- v3.3 Compatibility Getters ---
  get atom1() { return this.begin; }
  set atom1(val: number) { this.begin = val; }
  get atom2() { return this.end; }
  set atom2(val: number) { this.end = val; }
  get order() { return this.type; }
  set order(val: number) { this.type = val; }

  static create(id: number, begin: number, end: number, type: number): Bond {
    return new Bond(id, { begin, end, type });
  }

  /**
   * Clone this bond
   */
  clone(): Bond {
    return new Bond(this.id, {
      begin: this.begin,
      end: this.end,
      type: this.type,
      stereo: this.stereo,
      topology: this.topology,
    });
  }

  /**
   * Update calculated properties based on atom positions
   */
  updateGeometry(startPos: Vec2, endPos: Vec2): void {
    this.length = Vec2.dist(startPos, endPos);
    this.center = startPos.add(endPos).scaled(0.5);
    
    // Calculate angle (in radians)
    const delta = endPos.sub(startPos);
    this.angle = Math.atan2(delta.y, delta.x);
  }

  /**
   * Get the other atom ID (given one end)
   */
  getOtherAtom(atomId: number): number {
    if (atomId === this.begin) return this.end;
    if (atomId === this.end) return this.begin;
    throw new Error(`Atom ${atomId} is not part of bond ${this.id}`);
  }

  /**
   * Check if this bond connects to a given atom
   */
  hasAtom(atomId: number): boolean {
    return this.begin === atomId || this.end === atomId;
  }

  /**
   * Check if this bond connects two specific atoms
   */
  connects(atomId1: number, atomId2: number): boolean {
    return (
      (this.begin === atomId1 && this.end === atomId2) ||
      (this.begin === atomId2 && this.end === atomId1)
    );
  }

  /**
   * Get bond order for valence calculation
   */
  getBondOrder(): number {
    switch (this.type) {
      case Bond.TYPE.SINGLE:
        return 1;
      case Bond.TYPE.DOUBLE:
        return 2;
      case Bond.TYPE.TRIPLE:
        return 3;
      case Bond.TYPE.AROMATIC:
        return 1.5;
      default:
        return 1;
    }
  }

  /**
   * Get display name for bond type
   */
  getTypeName(): string {
    switch (this.type) {
      case Bond.TYPE.SINGLE:
        return 'Single';
      case Bond.TYPE.DOUBLE:
        return 'Double';
      case Bond.TYPE.TRIPLE:
        return 'Triple';
      case Bond.TYPE.AROMATIC:
        return 'Aromatic';
      case Bond.TYPE.DATIVE:
        return 'Dative';
      case Bond.TYPE.HYDROGEN:
        return 'Hydrogen';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get display name for stereo
   */
  getStereoName(): string {
    switch (this.stereo) {
      case Bond.STEREO.NONE:
        return 'None';
      case Bond.STEREO.UP:
        return 'Up (Wedge)';
      case Bond.STEREO.DOWN:
        return 'Down (Hash)';
      case Bond.STEREO.EITHER:
        return 'Either (Wavy)';
      case Bond.STEREO.CIS_TRANS:
        return 'Cis/Trans';
      default:
        return 'Unknown';
    }
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      begin: this.begin,
      end: this.end,
      type: this.type,
      stereo: this.stereo,
      topology: this.topology,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data: any): Bond {
    return new Bond(data.id, {
      begin: data.begin,
      end: data.end,
      type: data.type,
      stereo: data.stereo,
      topology: data.topology,
    });
  }
}
