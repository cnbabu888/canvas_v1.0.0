/**
 * Atom Entity
 * Simplified from Ketcher (Apache 2.0 license)
 * Represents a single atom in a molecule
 */

import { Vec2 } from './Vec2';

export interface AtomAttributes {
  label: string;              // Element symbol (C, N, O, etc.)
  position: Vec2;             // 2D coordinates
  charge?: number;            // Ionic charge (-2, -1, 0, +1, +2, etc.)
  isotope?: number;           // Mass number (12 for C-12, 13 for C-13)
  radical?: number;           // Radical state (0=none, 1=singlet, 2=doublet, 3=triplet)
  valence?: number;           // Explicit valence
  implicitH?: number;         // Number of implicit hydrogens
  stereoParity?: number;      // Stereochemistry parity
  stereoLabel?: string;       // Stereo label (abs, &, or)
  alias?: string;             // Alias (e.g., "Ph" for phenyl)
}

export class Atom {
  id: number;                 // Unique atom ID
  label: string;              // Element symbol
  position: Vec2;             // 2D coordinates
  charge: number;             // Ionic charge
  isotope: number | null;     // Mass number
  radical: number;            // Radical state
  valence: number | null;     // Explicit valence
  implicitH: number | null;   // Implicit hydrogens
  stereoParity: number;       // Stereochemistry
  stereoLabel: string | null; // Stereo label
  alias: string | null;       // Alias
  turns: number;              // Runtime properties for v3.3
  hydrogenCount: number;      // Runtime properties for v3.3

  // Runtime properties (not serialized)
  neighbors: number[];        // Connected atom IDs
  isSelected: boolean;        // Selection state
  isHovered: boolean;         // Hover state

  constructor(id: number, attributes: AtomAttributes) {
    this.id = id;
    this.label = attributes.label;
    this.position = new Vec2(attributes.position);
    this.charge = attributes.charge ?? 0;
    this.isotope = attributes.isotope ?? null;
    this.radical = attributes.radical ?? 0;
    this.valence = attributes.valence ?? null;
    this.implicitH = attributes.implicitH ?? null;
    this.stereoParity = attributes.stereoParity ?? 0;
    this.stereoLabel = attributes.stereoLabel ?? null;
    this.alias = attributes.alias ?? null;
    this.turns = 0;              // Added for mechanism arrows in v3.3
    this.hydrogenCount = 0;

    // Runtime state
    this.neighbors = [];
    this.isSelected = false;
    this.isHovered = false;
  }

  get pos() { return this.position; }
  set pos(val: Vec2) { this.position = val; }
  get element() { return this.label; }
  set element(val: string) { this.label = val; }

  static create(id: number, element: string, position: Vec2, charge: number = 0): Atom {
    return new Atom(id, { label: element, position, charge });
  }

  /**
   * Clone this atom
   */
  clone(): Atom {
    const cloned = new Atom(this.id, {
      label: this.label,
      position: new Vec2(this.position),
      charge: this.charge,
      isotope: this.isotope ?? undefined,
      radical: this.radical,
      valence: this.valence ?? undefined,
      implicitH: this.implicitH ?? undefined,
      stereoParity: this.stereoParity,
      stereoLabel: this.stereoLabel ?? undefined,
      alias: this.alias ?? undefined,
    });
    cloned.neighbors = [...this.neighbors];
    return cloned;
  }

  /**
   * Add a neighbor atom ID
   */
  addNeighbor(atomId: number): void {
    if (!this.neighbors.includes(atomId)) {
      this.neighbors.push(atomId);
    }
  }

  /**
   * Remove a neighbor atom ID
   */
  removeNeighbor(atomId: number): void {
    this.neighbors = this.neighbors.filter(id => id !== atomId);
  }

  /**
   * Get display label (with charge, isotope, etc.)
   */
  getDisplayLabel(): string {
    let display = this.alias || this.label;

    // Add isotope prefix if present
    if (this.isotope !== null) {
      display = `${this.isotope}${display}`;
    }

    return display;
  }

  /**
   * Get charge string for display
   */
  getChargeString(): string {
    if (this.charge === 0) return '';
    
    const abs = Math.abs(this.charge);
    const sign = this.charge > 0 ? '+' : '−'; // Use minus sign (not hyphen)
    
    if (abs === 1) {
      return sign;
    } else {
      return `${abs}${sign}`;
    }
  }

  /**
   * Calculate number of implicit hydrogens
   * Based on valence and current bonds
   */
  calculateImplicitH(bondOrders: number[]): number {
    // Get standard valence for this element
    const valenceMap: Record<string, number> = {
      'C': 4, 'N': 3, 'O': 2, 'S': 2, 'P': 3,
      'F': 1, 'Cl': 1, 'Br': 1, 'I': 1, 'H': 1,
    };

    const standardValence = valenceMap[this.label] ?? 0;
    const usedValence = bondOrders.reduce((sum, order) => sum + order, 0);
    
    // Account for charge
    let availableValence = standardValence - usedValence - Math.abs(this.charge);
    
    return Math.max(0, availableValence);
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      label: this.label,
      position: { x: this.position.x, y: this.position.y },
      charge: this.charge,
      isotope: this.isotope,
      radical: this.radical,
      valence: this.valence,
      implicitH: this.implicitH,
      stereoParity: this.stereoParity,
      stereoLabel: this.stereoLabel,
      alias: this.alias,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data: any): Atom {
    return new Atom(data.id, {
      label: data.label,
      position: new Vec2(data.position.x, data.position.y),
      charge: data.charge,
      isotope: data.isotope,
      radical: data.radical,
      valence: data.valence,
      implicitH: data.implicitH,
      stereoParity: data.stereoParity,
      stereoLabel: data.stereoLabel,
      alias: data.alias,
    });
  }
}
