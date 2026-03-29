/**
 * Molecule Entity
 * Container for atoms and bonds
 */

import { Atom, type AtomAttributes } from './Atom';
import { Bond, type BondAttributes } from './Bond';
import { Vec2 } from './Vec2';

export class Molecule {
  atoms: Map<number, Atom>;
  bonds: Map<number, Bond>;
  nextAtomId: number;
  nextBondId: number;
  adjacency: Map<number, number[]>; // atomId -> bondIds for v3.3 compat
  annotations: any[];

  constructor() {
    this.atoms = new Map();
    this.bonds = new Map();
    this.nextAtomId = 0;
    this.nextBondId = 0;
    this.adjacency = new Map();
    this.annotations = [];
  }

  /**
   * Add an atom to the molecule
   */
  addAtom(data: AtomAttributes | Atom): Atom {
    if (data instanceof Atom) {
      this.atoms.set(data.id, data);
      this.nextAtomId = Math.max(this.nextAtomId, data.id + 1);
      return data;
    }
    const atom = new Atom(this.nextAtomId++, data);
    this.atoms.set(atom.id, atom);
    return atom;
  }

  /**
   * Remove an atom (and all connected bonds)
   */
  removeAtom(atomId: number | string): void {
    const id = typeof atomId === 'string' ? parseInt(atomId) : atomId;
    if (isNaN(id)) return;

    // Remove all bonds connected to this atom
    const bondsToRemove: number[] = [];
    for (const [bondId, bond] of this.bonds) {
      if (bond.hasAtom(id)) {
        bondsToRemove.push(bondId);
      }
    }
    bondsToRemove.forEach(bid => this.removeBond(bid));

    // Remove the atom
    this.atoms.delete(id);
  }

  /**
   * Add a bond between two atoms
   */
  addBond(data: BondAttributes | Bond): Bond {
    let bond: Bond;
    if (data instanceof Bond) {
      bond = data;
      this.nextBondId = Math.max(this.nextBondId, bond.id + 1);
    } else {
      bond = new Bond(this.nextBondId++, data);
    }
    
    // Update atom neighbors
    const startAtom = this.atoms.get(bond.begin);
    const endAtom = this.atoms.get(bond.end);
    
    if (!startAtom || !endAtom) {
      // In undo/redo, we might be adding bonds before atoms sometimes, but usually not.
      // Let's be lenient if it's an instance.
      if (data instanceof Bond) {
         this.bonds.set(bond.id, bond);
         return bond;
      }
      throw new Error('Cannot create bond: atoms not found');
    }

    startAtom.addNeighbor(bond.end);
    endAtom.addNeighbor(bond.begin);

    // Calculate geometry
    bond.updateGeometry(startAtom.position, endAtom.position);

    this.bonds.set(bond.id, bond);
    return bond;
  }

  /**
   * Remove a bond
   */
  removeBond(bondId: number): void {
    const bond = this.bonds.get(bondId);
    if (!bond) return;

    // Update atom neighbors
    const startAtom = this.atoms.get(bond.begin);
    const endAtom = this.atoms.get(bond.end);
    
    if (startAtom) startAtom.removeNeighbor(bond.end);
    if (endAtom) endAtom.removeNeighbor(bond.begin);

    this.bonds.delete(bondId);
  }

  /**
   * Get atom by ID
   */
  getAtom(id: any): Atom | undefined {
    if (id === undefined || id === null) return undefined;
    const numId = typeof id === 'string' ? parseInt(id) : id;
    return this.atoms.get(numId);
  }

  /**
   * Get bond by ID
   */
  getBond(id: any): Bond | undefined {
    if (id === undefined || id === null) return undefined;
    const numId = typeof id === 'string' ? parseInt(id) : id;
    return this.bonds.get(numId);
  }

  /**
   * Find bond between two atoms
   */
  findBond(atomId1: number, atomId2: number): Bond | undefined {
    for (const bond of this.bonds.values()) {
      if (bond.connects(atomId1, atomId2)) {
        return bond;
      }
    }
    return undefined;
  }

  /**
   * Get all bonds connected to an atom
   */
  getAtomBonds(atomId: number): Bond[] {
    const result: Bond[] = [];
    for (const bond of this.bonds.values()) {
      if (bond.hasAtom(atomId)) {
        result.push(bond);
      }
    }
    return result;
  }

  /**
   * Update all bond geometries
   */
  updateBondGeometry(): void {
    for (const bond of this.bonds.values()) {
      const startAtom = this.atoms.get(bond.begin);
      const endAtom = this.atoms.get(bond.end);
      
      if (startAtom && endAtom) {
        bond.updateGeometry(startAtom.position, endAtom.position);
      }
    }
  }

  // --- v3.3 Compatibility Methods ---
  getConnectedBonds(atomId: any): Bond[] {
    const id = typeof atomId === 'string' ? parseInt(atomId) : atomId;
    return this.getAtomBonds(id);
  }

  get allAtoms() {
    return Array.from(this.atoms.values());
  }

  get allBonds() {
    return Array.from(this.bonds.values());
  }

  /**
   * Get bounding box of molecule
   */
  getBoundingBox(): { min: Vec2; max: Vec2 } | null {
    if (this.atoms.size === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const atom of this.atoms.values()) {
      minX = Math.min(minX, atom.position.x);
      minY = Math.min(minY, atom.position.y);
      maxX = Math.max(maxX, atom.position.x);
      maxY = Math.max(maxY, atom.position.y);
    }

    return {
      min: new Vec2(minX, minY),
      max: new Vec2(maxX, maxY),
    };
  }

  /**
   * Get center point of molecule
   */
  getCenter(): Vec2 {
    if (this.atoms.size === 0) {
      return new Vec2(0, 0);
    }

    let sumX = 0;
    let sumY = 0;

    for (const atom of this.atoms.values()) {
      sumX += atom.position.x;
      sumY += atom.position.y;
    }

    return new Vec2(
      sumX / this.atoms.size,
      sumY / this.atoms.size
    );
  }

  /**
   * Translate entire molecule
   */
  translate(offset: Vec2): void {
    for (const atom of this.atoms.values()) {
      atom.position = atom.position.add(offset);
    }
    this.updateBondGeometry();
  }

  /**
   * Rotate entire molecule around a point
   */
  rotate(angle: number, center?: Vec2): void {
    const pivot = center || this.getCenter();
    
    for (const atom of this.atoms.values()) {
      atom.position = atom.position.rotateAroundVector(angle, pivot);
    }
    
    this.updateBondGeometry();
  }

  /**
   * Scale molecule
   */
  scale(factor: number, center?: Vec2): void {
    const pivot = center || this.getCenter();
    
    for (const atom of this.atoms.values()) {
      const offset = atom.position.sub(pivot);
      atom.position = pivot.add(offset.scaled(factor));
    }
    
    this.updateBondGeometry();
  }

  /**
   * Clear all atoms and bonds
   */
  clear(): void {
    this.atoms.clear();
    this.bonds.clear();
    this.annotations = [];
    this.nextAtomId = 0;
    this.nextBondId = 0;
  }

  /**
   * Clone this molecule
   */
  clone(): Molecule {
    const cloned = new Molecule();
    
    // Clone atoms
    for (const [id, atom] of this.atoms) {
      cloned.atoms.set(id, atom.clone());
    }
    
    // Clone bonds
    for (const [id, bond] of this.bonds) {
      cloned.bonds.set(id, bond.clone());
    }

    // Clone annotations
    cloned.annotations = JSON.parse(JSON.stringify(this.annotations));
    
    cloned.nextAtomId = this.nextAtomId;
    cloned.nextBondId = this.nextBondId;
    
    return cloned;
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      atoms: Array.from(this.atoms.values()).map(a => a.toJSON()),
      bonds: Array.from(this.bonds.values()).map(b => b.toJSON()),
      annotations: this.annotations,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data: any): Molecule {
    const mol = new Molecule();
    
    // Load atoms
    for (const atomData of data.atoms) {
      const atom = Atom.fromJSON(atomData);
      mol.atoms.set(atom.id, atom);
      mol.nextAtomId = Math.max(mol.nextAtomId, atom.id + 1);
    }
    
    // Load bonds
    for (const bondData of data.bonds) {
      const bond = Bond.fromJSON(bondData);
      mol.bonds.set(bond.id, bond);
      mol.nextBondId = Math.max(mol.nextBondId, bond.id + 1);
      
      // Update atom neighbors
      const startAtom = mol.atoms.get(bond.begin);
      const endAtom = mol.atoms.get(bond.end);
      if (startAtom && endAtom) {
        startAtom.addNeighbor(bond.end);
        endAtom.addNeighbor(bond.begin);
      }
    }
    
    mol.annotations = data.annotations || [];

    mol.updateBondGeometry();
    
    return mol;
  }
}
