import type { Command } from './Command';
import { Molecule } from '../entities/Molecule';
import type { BondType } from '../entities/Bond';

interface PropertyChange {
    type: 'atom' | 'bond';
    id: string | number;
    property: string; // 'element', 'charge', 'order', 'type'
    value: any;
    oldValue: any;
}

export class ChangePropertyCommand implements Command {
    private molecule: Molecule;
    private changes: PropertyChange[];

    constructor(molecule: Molecule, changes: PropertyChange[]) {
        this.molecule = molecule;
        this.changes = changes;
    }

    execute() {
        this.applyChanges(false);
    }

    undo() {
        this.applyChanges(true);
    }

    private applyChanges(isUndo: boolean) {
        this.changes.forEach(change => {
            const val = isUndo ? change.oldValue : change.value;
            const id = Number(change.id);

            if (change.type === 'atom') {
                const atom = this.molecule.atoms.get(id);
                if (atom) {
                    if (change.property === 'element' || change.property === 'label') atom.element = val;
                    if (change.property === 'charge') atom.charge = val;
                }
            } else if (change.type === 'bond') {
                const bond = this.molecule.bonds.get(id);
                if (bond) {
                    if (change.property === 'order' || change.property === 'type') {
                        bond.type = val as BondType;
                    }
                }
            }
        });
    }
}
