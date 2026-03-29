import type { Command } from './Command';
import { Molecule } from '../entities/Molecule';
import { Vec2 } from '../entities/Vec2';

export class MoveElementsCommand implements Command {
    private molecule: Molecule;
    private atomIds: (string | number)[];
    private delta: Vec2;

    constructor(molecule: Molecule, atomIds: (string | number)[], delta: any) {
        this.molecule = molecule;
        this.atomIds = atomIds;
        this.delta = delta instanceof Vec2 ? delta : new Vec2(delta.x, delta.y);
    }

    execute() {
        this.atomIds.forEach(id => {
            const atom = this.molecule.atoms.get(Number(id));
            if (atom) {
                atom.pos = atom.pos.add(this.delta);
            }
        });
    }

    undo() {
        this.atomIds.forEach(id => {
            const atom = this.molecule.atoms.get(Number(id));
            if (atom) {
                atom.pos = atom.pos.sub(this.delta);
            }
        });
    }
}
