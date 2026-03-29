import type { Command } from './Command';
import { Molecule } from '../entities/Molecule';
import { Atom } from '../entities/Atom';
import { Bond } from '../entities/Bond';
import type { BondType } from '../entities/Bond';
import { Vec2D } from '../math/Vec2D';

interface RingData {
    points: Vec2D[];
    fusionAtoms?: { index: number, atomId: (string | number) }[]; // connect ring vertex 'index' to existing 'atomId'
    isAromatic?: boolean; // If true, create alternating double bonds (benzene-style)
    aromaticCircle?: boolean; // explicit flag for benzene tools
}

export class AddRingCommand implements Command {
    private molecule: Molecule;
    private ringData: RingData;
    private createdAtomIds: number[] = [];
    private createdBondIds: number[] = [];

    constructor(molecule: Molecule, ringData: RingData) {
        this.molecule = molecule;
        this.ringData = ringData;
    }

    execute() {
        const { points, fusionAtoms } = this.ringData;
        const newAtoms: Atom[] = [];
        const ringAtomIds: number[] = new Array(points.length).fill(0);

        // 1. Identify or Create Atoms
        points.forEach((pos, index) => {
            const fusion = fusionAtoms?.find(f => f.index === index);
            if (fusion) {
                // Reuse existing atom
                ringAtomIds[index] = Number(fusion.atomId);
            } else {
                // Create new atom
                const id = this.molecule.nextAtomId; // Use current counter estimate
                const atom = Atom.create(id, 'C', pos as any); // Default to carbon
                this.molecule.addAtom(atom);
                this.createdAtomIds.push(atom.id);
                ringAtomIds[index] = atom.id;
                newAtoms.push(atom);
            }
        });

        // 2. Create Bonds between ring atoms
        for (let i = 0; i < ringAtomIds.length; i++) {
            const idA = ringAtomIds[i];
            const idB = ringAtomIds[(i + 1) % ringAtomIds.length];

            // Check if bond already exists (for fusion edge)
            const existingBond = this.findBond(idA, idB);
            if (!existingBond) {
                const id = this.molecule.nextBondId;
                // Aromatic logic
                let type: BondType = 1 as BondType; // Default Single
                
                if (this.ringData.aromaticCircle) {
                    type = 4 as BondType; // Aromatic
                } else if (this.ringData.isAromatic) {
                    // Alternate double bonds (Kekulé)
                    const isDouble = (i % 2 === 0);
                    type = (isDouble ? 2 : 1) as BondType;
                }
                
                const bond = Bond.create(id, idA, idB, type);
                this.molecule.addBond(bond);
                this.createdBondIds.push(bond.id);
            }
        }
    }

    undo() {
        // Remove created bonds
        this.createdBondIds.forEach(id => this.molecule.removeBond(id));
        this.createdBondIds = [];

        // Remove created atoms
        this.createdAtomIds.forEach(id => this.molecule.removeAtom(id));
        this.createdAtomIds = [];
    }

    private findBond(idA: number, idB: number): Bond | undefined {
        if (!this.molecule.bonds) return undefined;
        // Molecule.bonds is a Map<number, Bond>
        for (const bond of this.molecule.bonds.values()) {
            if ((bond.begin === idA && bond.end === idB) ||
                (bond.begin === idB && bond.end === idA)) {
                return bond;
            }
        }
        return undefined;
    }
}
