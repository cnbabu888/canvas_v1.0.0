import type { Command } from './Command';
import { Molecule } from '../entities/Molecule';
import { Vec2 } from '../entities/Vec2';

export class LayoutCommand implements Command {
    private molecule: Molecule;
    private oldPositions: Map<number, Vec2>;
    private newPositions: Map<number, Vec2>;

    constructor(molecule: Molecule, newPositions?: Map<number, Vec2>) {
        this.molecule = molecule;
        this.oldPositions = new Map();
        this.newPositions = newPositions || new Map();

        // Snapshot current positions
        if (this.molecule.atoms) {
            this.molecule.atoms.forEach(atom => {
                this.oldPositions.set(atom.id, atom.position.clone());
            });
        }
    }

    public setNewPositions(positions: Map<number, Vec2>) {
        this.newPositions = positions;
    }

    execute() {
        if (!this.newPositions || this.newPositions.size === 0) return;
        this.applyPositions(this.newPositions);
    }

    undo() {
        this.applyPositions(this.oldPositions);
    }

    private applyPositions(positions: Map<number, Vec2>) {
        positions.forEach((pos, atomId) => {
            const atom = this.molecule.atoms.get(Number(atomId));
            if (atom) {
                atom.pos = pos.clone();
            }
        });
    }
}
