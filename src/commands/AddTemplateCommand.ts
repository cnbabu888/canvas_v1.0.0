import type { Command } from './Command';
import { Molecule } from '../entities/Molecule';
import type { Template } from '../chem/Template';
import { Vec2 } from '../entities/Vec2';

export class AddTemplateCommand implements Command {
    private molecule: Molecule;
    private template: Template;
    private position: Vec2;
    private sproutFromAtomId: number | null;

    // Undo tracking
    private createdAtomIds: number[] = [];
    private createdBondIds: number[] = [];

    constructor(molecule: Molecule, template: Template, position: Vec2, sproutFromAtomId: number | null = null) {
        this.molecule = molecule;
        this.template = template;
        this.position = position;
        this.sproutFromAtomId = sproutFromAtomId;
    }

    execute() {
        const atomIdMap = new Map<number, number>(); // Template Index -> Real Atom ID

        // 1. Create Atoms
        this.template.atoms.forEach((tAtom, index) => {
            const atom = this.molecule.addAtom({
                label: tAtom.element || 'C',
                position: new Vec2(this.position.x + tAtom.x, this.position.y + tAtom.y),
                charge: tAtom.charge || 0
            });

            atomIdMap.set(index, atom.id);
            this.createdAtomIds.push(atom.id);
        });

        // 2. Create Bonds within Template
        this.template.bonds.forEach(tBond => {
            const idA = atomIdMap.get(tBond.from);
            const idB = atomIdMap.get(tBond.to);
            if (idA !== undefined && idB !== undefined) {
                let order = 1;
                if (tBond.type === 'DOUBLE') order = 2;
                if (tBond.type === 'TRIPLE') order = 3;

                const bond = this.molecule.addBond({
                    begin: idA,
                    end: idB,
                    type: order
                });
                this.createdBondIds.push(bond.id);
            }
        });

        // 3. Sprout Link (if applicable)
        if (this.sproutFromAtomId !== null) {
            // Connect sprout source to the First Atom (index 0) of template
            const attachToId = atomIdMap.get(0);
            if (attachToId !== undefined) {
                const bond = this.molecule.addBond({
                    begin: Number(this.sproutFromAtomId),
                    end: attachToId,
                    type: 1
                });
                this.createdBondIds.push(bond.id);
            }
        }
    }

    undo() {
        this.createdBondIds.forEach(id => this.molecule.removeBond(id));
        this.createdAtomIds.forEach(id => this.molecule.removeAtom(id));
        this.createdBondIds = [];
        this.createdAtomIds = [];
    }
}
