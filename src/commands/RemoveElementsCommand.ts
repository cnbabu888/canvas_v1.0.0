import type { Command } from './Command';
import { Molecule } from '../entities/Molecule';
import { Atom } from '../entities/Atom';
import { Bond } from '../entities/Bond';

export class RemoveElementsCommand implements Command {
    public description = 'Remove Elements';
    private molecule: Molecule;
    private atomIdsToRemove: any[];
    private bondIdsToRemove: any[];

    // State for undo
    private removedAtoms: Atom[] = [];
    private removedBonds: Bond[] = [];
    private adjacentBondsRemoved: Bond[] = []; // Bonds removed because their atom was removed

    constructor(molecule: Molecule, atomIds: (string | number)[], bondIds: (string | number)[]) {
        this.molecule = molecule;
        this.atomIdsToRemove = [...atomIds];
        this.bondIdsToRemove = [...bondIds];
    }

    execute(): void {
        this.removedAtoms = [];
        this.removedBonds = [];
        this.adjacentBondsRemoved = [];

        // 1. Remove explicitly requested bonds
        this.bondIdsToRemove.forEach(bondId => {
            const id = Number(bondId);
            const bond = this.molecule.bonds.get(id);
            if (bond) {
                this.removedBonds.push(bond);
                this.molecule.removeBond(id);
            }
        });

        // 2. Remove atoms and any connected bonds that weren't explicitly requested
        this.atomIdsToRemove.forEach(atomId => {
            const id = Number(atomId);
            const atom = this.molecule.atoms.get(id);
            if (atom) {
                this.removedAtoms.push(atom);

                // Find and remove connected bonds
                const connectedBonds = Array.from(this.molecule.bonds.values()).filter(
                    b => b.begin === id || b.end === id
                );

                connectedBonds.forEach(bond => {
                    this.adjacentBondsRemoved.push(bond);
                    this.molecule.removeBond(bond.id);
                });

                this.molecule.removeAtom(id);
            }
        });
    }

    undo(): void {
        // Restore in reverse order: Atoms first, then bonds
        this.removedAtoms.forEach(atom => {
            this.molecule.addAtom(atom);
        });

        this.adjacentBondsRemoved.forEach(bond => {
            this.molecule.addBond(bond);
        });

        this.removedBonds.forEach(bond => {
            this.molecule.addBond(bond);
        });
    }

    redo(): void {
        this.execute();
    }
}
