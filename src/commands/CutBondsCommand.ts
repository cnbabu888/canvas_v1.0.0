import type { Command } from './Command';
import { Bond } from '../entities/Bond';
import { Vec2 } from '../entities/Vec2';

export class CutBondsCommand implements Command {
    public description = 'Cut Bonds';
    private molecule: any;
    private bondIdsToCut: (string | number)[];
    private mode: 'homolytic' | 'heterolytic';
    private addRetroArrow: boolean;

    // State for undo
    private removedBonds: Bond[] = [];
    private oldCharges: Map<number, number> = new Map();
    private oldRadicals: Map<number, number> = new Map();
    private addedBadges: any[] = [];
    private addedArrow: any = null;

    // Derived displacement
    private fragmentDisplacements: Map<number, Vec2> = new Map();

    constructor(molecule: any, bondIds: (string | number)[], mode: 'homolytic' | 'heterolytic', addRetroArrow: boolean = false) {
        this.molecule = molecule;
        this.bondIdsToCut = [...bondIds];
        this.mode = mode;
        this.addRetroArrow = addRetroArrow;
    }

    execute(): void {
        this.removedBonds = [];
        this.oldCharges.clear();
        this.oldRadicals.clear();
        this.fragmentDisplacements.clear();
        this.addedBadges = [];
        this.addedArrow = null;

        // Determine fragments *before* cutting for correct MW calculation 
        // We will just do a simple component search, but we need ChemUtils, which is a bit messy to import here due to dependency cycle.
        // Let's compute mass roughly based on atoms inside the CutBondsCommand or rely on post-cut MW.
        // Actually, let's just create badges for the atoms involved in the cut to keep it localized.

        let centerPos = new Vec2(0, 0);
        let validCuts = 0;

        this.bondIdsToCut.forEach(bondId => {
            const id = Number(bondId);
            const bond = this.molecule.bonds.get(id);
            if (bond) {
                this.removedBonds.push(bond);

                const atom1 = this.molecule.atoms.get(bond.begin);
                const atom2 = this.molecule.atoms.get(bond.end);

                if (atom1 && atom2) {
                    // Record old state
                    if (!this.oldCharges.has(atom1.id)) this.oldCharges.set(atom1.id, atom1.charge || 0);
                    if (!this.oldCharges.has(atom2.id)) this.oldCharges.set(atom2.id, atom2.charge || 0);

                    // Assign Charges based on electronegativity (simplified)
                    if (this.mode === 'heterolytic') {
                        const isAHetero = atom1.element !== 'C' && atom1.element !== 'H';
                        const isBHetero = atom2.element !== 'C' && atom2.element !== 'H';

                        if (isAHetero && !isBHetero) {
                            atom1.charge = (atom1.charge || 0) - 1;
                            atom2.charge = (atom2.charge || 0) + 1;
                        } else if (!isAHetero && isBHetero) {
                            atom1.charge = (atom1.charge || 0) + 1;
                            atom2.charge = (atom2.charge || 0) - 1;
                        } else {
                            // Default: A gets +, B gets -
                            atom1.charge = (atom1.charge || 0) + 1;
                            atom2.charge = (atom2.charge || 0) - 1;
                        }
                    } else {
                        // Homolytic: radicals
                        atom1.radical = (atom1.radical || 0) + 1;
                        atom2.radical = (atom2.radical || 0) + 1;

                        // We should track this for undo
                        if (!this.oldRadicals.has(atom1.id)) this.oldRadicals.set(atom1.id, atom1.radical - 1);
                        if (!this.oldRadicals.has(atom2.id)) this.oldRadicals.set(atom2.id, atom2.radical - 1);
                    }

                    centerPos = centerPos.add(atom1.pos).add(atom2.pos);
                    validCuts += 2;

                    // Badges for fragments
                    if (!this.molecule.badges) this.molecule.badges = [];

                    // Add badge for Atom A side
                    const badgeA = {
                        id: 'badge_' + Math.random().toString(36).substr(2, 9),
                        pos: atom1.pos.add(atom1.pos.sub(atom2.pos).normalized.scaled(20)),
                        text: '-', 
                        atomId: atom1.id
                    };
                    const badgeB = {
                        id: 'badge_' + Math.random().toString(36).substr(2, 9),
                        pos: atom2.pos.add(atom2.pos.sub(atom1.pos).normalized.scaled(20)),
                        text: '-',
                        atomId: atom2.id
                    };
                    this.addedBadges.push(badgeA, badgeB);
                    this.molecule.badges.push(badgeA, badgeB);
                }

                this.molecule.removeBond(id);
            }
        });

        if (validCuts > 0 && this.addRetroArrow) {
            centerPos = centerPos.scaled(1 / validCuts);
            const arrow = {
                id: 'arrow_' + Math.random().toString(36).substr(2, 9),
                type: 'RETROSYNTHESIS',
                start: centerPos.add(new Vec2(-40, 20)),
                end: centerPos.add(new Vec2(40, -20))
            };
            if (!this.molecule.arrows) this.molecule.arrows = [];
            this.molecule.arrows.push(arrow);
            this.addedArrow = arrow;
        }

        // We can update the badges text post-cut if we had a MW calculator here.
        // For visual sake, we leave it as Fragment A / B, or we calculate exact MW in the CanvasEngine via ChemUtils when rendering!
    }

    undo(): void {
        // Restore bonds
        this.removedBonds.forEach(bond => {
            this.molecule.addBond(bond);
        });

        // Restore charges
        this.oldCharges.forEach((charge, atomId) => {
            const atom = this.molecule.atoms.get(atomId);
            if (atom) atom.charge = charge;
        });

        // Restore radicals
        this.oldRadicals.forEach((rad, atomId) => {
            const atom = this.molecule.atoms.get(atomId);
            if (atom) (atom as any).radical = rad === 0 ? undefined : rad;
        });

        // Remove badges
        if (this.molecule.badges) {
            this.molecule.badges = this.molecule.badges.filter((b: any) => !this.addedBadges.includes(b));
        }

        // Remove arrow
        if (this.addedArrow && this.molecule.arrows) {
            this.molecule.arrows = this.molecule.arrows.filter((a: any) => a.id !== this.addedArrow.id);
        }
    }

    redo(): void {
        this.execute();
    }
}
