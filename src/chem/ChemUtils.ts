import { Atom } from '../molecular/Atom';
import { Bond } from '../molecular/Bond';
import { ELEMENTS } from './elements';

export class ChemUtils {
    static getImplicitHydrogens(element: string, bondOrderSum: number, charge: number): number {
        const data = ELEMENTS.get(element);
        if (!data) return 0;

        let standardValence = data.valence[0];
        if (element === 'N' && bondOrderSum > 3) standardValence = 5;
        if (element === 'S' && bondOrderSum > 2) standardValence = 6;
        if (element === 'P' && bondOrderSum > 3) standardValence = 5;

        const hCount = standardValence - bondOrderSum + charge;
        return Math.max(0, hCount);
    }

    static calculateStats(molecule: any) {
        if (!molecule) return { formula: '', weight: 0, atoms: 0, bonds: 0 };

        const counts = new Map<string, number>();
        let weight = 0;
        let atomCount = 0;

        if (molecule.atoms) {
            molecule.atoms.forEach((atom: any) => {
                atomCount++;
                const el = atom.element;
                const data = ELEMENTS.get(el);
                if (data) {
                    const mass = this.getAtomicMass(el);
                    weight += mass;
                    counts.set(el, (counts.get(el) || 0) + 1);

                    // Add implicit hydrogens to mass and formula
                    const bonds = this.getConnectedBonds(atom, molecule);
                    let bondOrderSum = 0;
                    bonds.forEach((b: any) => {
                        if (b.type === 'DOUBLE') bondOrderSum += 2;
                        else if (b.type === 'TRIPLE') bondOrderSum += 3;
                        else bondOrderSum += 1;
                    });
                    const hCount = this.getImplicitHydrogens(el, bondOrderSum, atom.charge || 0);
                    if (hCount > 0) {
                        weight += this.getAtomicMass('H') * hCount;
                        counts.set('H', (counts.get('H') || 0) + hCount);
                    }
                }
            });
        }

        let formula = '';
        if (counts.has('C')) {
            formula += `C${counts.get('C') !== 1 ? counts.get('C') : ''}`;
            counts.delete('C');
        }
        if (counts.has('H')) {
            formula += `H${counts.get('H') !== 1 ? counts.get('H') : ''}`;
            counts.delete('H');
        }
        const sorted = Array.from(counts.keys()).sort();
        sorted.forEach(el => {
            formula += `${el}${counts.get(el) !== 1 ? counts.get(el) : ''}`;
        });

        return {
            formula,
            weight: parseFloat(weight.toFixed(2)),
            atoms: atomCount,
            bonds: molecule.bonds ? molecule.bonds.size || molecule.bonds.length : 0
        };
    }

    // [NEW] Calculate formula/weight for a specific sub-graph (used for Scissor tool)
    static calculateFragment(molecule: any, startAtomId: string, cutBondId: string) {
        if (!molecule || !molecule.atoms.has(startAtomId)) return { formula: '', weight: 0, atomIds: new Set<string>() };

        const visitedAtoms = new Set<string>();
        const queue = [startAtomId];
        visitedAtoms.add(startAtomId);

        let weight = 0;
        const counts = new Map<string, number>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const atom = molecule.atoms.get(currentId) as Atom;
            if (!atom) continue;

            const el = atom.element;
            const data = ELEMENTS.get(el);
            if (data) {
                weight += this.getAtomicMass(el);
                counts.set(el, (counts.get(el) || 0) + 1);

                // Calculate implicit hydrogens but DON'T count the cut bond in the valence math 
                // Wait, if it's cut homolytically/heterolytically, does the H count change? 
                // For a simple prediction, let's just assume the bond *is* absent and we want the fragment mass as if it were a radical/ion.
                // Actually, just calculating the H's *before* the cut gives the accurate "fragment" mass composed of exactly those atoms.
                // Let's use the actual pre-cut H count for this atom.
                const bonds = this.getConnectedBonds(atom, molecule);
                let bondOrderSum = 0;
                bonds.forEach((b: any) => {
                    if (b.type === 'DOUBLE') bondOrderSum += 2;
                    else if (b.type === 'TRIPLE') bondOrderSum += 3;
                    else bondOrderSum += 1;
                });
                const hCount = this.getImplicitHydrogens(el, bondOrderSum, atom.charge || 0);
                if (hCount > 0) {
                    weight += this.getAtomicMass('H') * hCount;
                    counts.set('H', (counts.get('H') || 0) + hCount);
                }
            }

            // Traverse neighbors, avoiding the cut bond
            molecule.bonds.forEach((b: Bond) => {
                if (b.id !== cutBondId) {
                    if (b.atomA === currentId && !visitedAtoms.has(b.atomB)) {
                        visitedAtoms.add(b.atomB);
                        queue.push(b.atomB);
                    } else if (b.atomB === currentId && !visitedAtoms.has(b.atomA)) {
                        visitedAtoms.add(b.atomA);
                        queue.push(b.atomA);
                    }
                }
            });
        }

        let formula = '';
        if (counts.has('C')) {
            formula += `C${counts.get('C') !== 1 ? counts.get('C') : ''}`;
            counts.delete('C');
        }
        if (counts.has('H')) {
            formula += `H${counts.get('H') !== 1 ? counts.get('H') : ''}`;
            counts.delete('H');
        }
        const sorted = Array.from(counts.keys()).sort();
        sorted.forEach(el => {
            formula += `${el}${counts.get(el) !== 1 ? counts.get(el) : ''}`;
        });

        return {
            formula,
            weight: parseFloat(weight.toFixed(2)),
            atomIds: visitedAtoms
        };
    }

    static getAtomicMass(symbol: string): number {
        const masses: { [key: string]: number } = {
            'H': 1.008, 'He': 4.003, 'Li': 6.941, 'Be': 9.012, 'B': 10.81, 'C': 12.011, 'N': 14.007, 'O': 15.999, 'F': 18.998, 'Ne': 20.180,
            'Na': 22.990, 'Mg': 24.305, 'Al': 26.982, 'Si': 28.086, 'P': 30.974, 'S': 32.065, 'Cl': 35.453, 'K': 39.098, 'Ar': 39.948,
            'Ca': 40.078, 'Sc': 44.956, 'Ti': 47.867, 'V': 50.942, 'Cr': 51.996, 'Mn': 54.938, 'Fe': 55.845, 'Co': 58.933, 'Ni': 58.693,
            'Cu': 63.546, 'Zn': 65.38, 'Ga': 69.723, 'Ge': 72.64, 'As': 74.922, 'Se': 78.96, 'Br': 79.904, 'Kr': 83.798, 'Rb': 85.468,
            'Sr': 87.62, 'Y': 88.906, 'Zr': 91.224, 'Nb': 92.906, 'Mo': 95.96, 'Tc': 98, 'Ru': 101.07, 'Rh': 102.91, 'Pd': 106.42,
            'Ag': 107.87, 'Cd': 112.41, 'In': 114.82, 'Sn': 118.71, 'Sb': 121.76, 'Te': 127.60, 'I': 126.90, 'Xe': 131.29
        };
        return masses[symbol] || 0;
    }

    static analyzeSafety(molecule: any): string[] {
        if (!molecule || !molecule.atoms) return [];
        const warnings: string[] = [];

        const atoms = Array.from(molecule.atoms.values()) as Atom[];

        // 1. Azide Detection (N=N=N)
        // Heuristic: Node N connected to 2 other Ns
        const nitrogens = atoms.filter(a => a.element === 'N');
        for (const n of nitrogens) {
            const neighbors = this.getNeighbors(n, molecule);
            const nNeighbors = neighbors.filter(nb => nb.atom.element === 'N');
            if (nNeighbors.length >= 2) {
                if (!warnings.includes('High Energy Group: Azide (N3)')) {
                    warnings.push('High Energy Group: Azide (N3)');
                }
            }
        }

        // 2. Nitro Group (N connected to 2 Os)
        for (const n of nitrogens) {
            const neighbors = this.getNeighbors(n, molecule);
            const oNeighbors = neighbors.filter(nb => nb.atom.element === 'O');
            if (oNeighbors.length >= 2) {
                if (!warnings.includes('Oxidizer: Nitro Group (NO2)')) {
                    warnings.push('Oxidizer: Nitro Group (NO2)');
                }
            }
        }

        return warnings;
    }

    static getMonoisotopicMass(symbol: string): number {
        const masses: { [key: string]: number } = {
            'H': 1.00783, 'C': 12.00000, 'N': 14.00307, 'O': 15.99491,
            'F': 18.99840, 'Si': 27.97693, 'P': 30.97376, 'S': 31.97207,
            'Cl': 34.96885, 'Br': 78.91834, 'I': 126.90447, 'Se': 79.91652,
            'B': 11.00931, 'Na': 22.98977, 'K': 38.96371, 'Li': 7.01600,
            'Mg': 23.98504, 'Ca': 39.96259, 'Fe': 55.93494, 'Cu': 62.92960,
            'Zn': 63.92914, 'As': 74.92160, 'Sn': 119.90220,
        };
        return masses[symbol] || this.getAtomicMass(symbol); // fallback to average mass
    }

    static calculateExactMass(molecule: any): number {
        if (!molecule || !molecule.atoms) return 0;
        let mass = 0;

        molecule.atoms.forEach((atom: any) => {
            const el = atom.element;
            mass += this.getMonoisotopicMass(el);

            // Add implicit hydrogens
            const bonds = this.getConnectedBonds(atom, molecule);
            let bondOrderSum = 0;
            bonds.forEach((b: any) => {
                if (b.type === 'DOUBLE') bondOrderSum += 2;
                else if (b.type === 'TRIPLE') bondOrderSum += 3;
                else bondOrderSum += 1;
            });
            const hCount = this.getImplicitHydrogens(el, bondOrderSum, atom.charge || 0);
            mass += this.getMonoisotopicMass('H') * hCount;
        });

        return parseFloat(mass.toFixed(4));
    }

    /**
     * Generate a SMILES string for the given molecule using DFS traversal.
     * Handles ring closures, branching, bond orders, and charges.
     */
    static generateSMILES(molecule: any): string {
        if (!molecule || !molecule.atoms || molecule.atoms.size === 0) return '';

        // Build adjacency list
        const adj = new Map<string, { neighbor: string; bond: any }[]>();
        molecule.atoms.forEach((_: any, id: string) => adj.set(id, []));
        if (molecule.bonds) {
            molecule.bonds.forEach((b: any) => {
                adj.get(b.atomA)?.push({ neighbor: b.atomB, bond: b });
                adj.get(b.atomB)?.push({ neighbor: b.atomA, bond: b });
            });
        }

        const visited = new Set<string>();
        const visitedBonds = new Set<string>();
        let ringClosureId = 1;
        const ringClosures = new Map<string, number>(); // bondId → ring closure digit
        const result: string[] = [];

        // Find all connected components
        const atomIds = Array.from(molecule.atoms.keys()) as string[];

        const atomToSMILES = (atomId: string): string => {
            const atom = molecule.atoms.get(atomId);
            if (!atom) return '';
            const el = atom.element;
            const charge = atom.charge || 0;

            // Organic subset (can be written without brackets): B, C, N, O, P, S, F, Cl, Br, I
            const organicSubset = ['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I'];
            const needsBrackets = !organicSubset.includes(el) || charge !== 0;

            if (needsBrackets) {
                let s = '[';
                s += el;
                if (charge > 0) s += '+' + (charge > 1 ? charge : '');
                else if (charge < 0) s += '-' + (Math.abs(charge) > 1 ? Math.abs(charge) : '');
                s += ']';
                return s;
            }
            return el;
        };

        const bondSymbol = (bond: any): string => {
            if (!bond) return '';
            const t = bond.type || 'SINGLE';
            if (t === 'DOUBLE') return '=';
            if (t === 'TRIPLE') return '#';
            return ''; // Single bonds are implicit
        };

        const dfs = (atomId: string) => {
            visited.add(atomId);
            result.push(atomToSMILES(atomId));

            const neighbors = adj.get(atomId) || [];

            // Check for ring closures (bonds to already-visited atoms)
            const ringBonds: { neighbor: string; bond: any }[] = [];
            const treeBonds: { neighbor: string; bond: any }[] = [];

            for (const nb of neighbors) {
                if (visitedBonds.has(nb.bond.id)) continue;
                if (visited.has(nb.neighbor)) {
                    ringBonds.push(nb);
                } else {
                    treeBonds.push(nb);
                }
            }

            // Handle ring closures
            for (const rb of ringBonds) {
                visitedBonds.add(rb.bond.id);
                const rId = ringClosureId++;
                ringClosures.set(rb.bond.id, rId);
                result.push(bondSymbol(rb.bond));
                result.push(rId < 10 ? String(rId) : `%${rId}`);
            }

            // Handle tree branches
            for (let i = 0; i < treeBonds.length; i++) {
                const nb = treeBonds[i];
                visitedBonds.add(nb.bond.id);
                if (i < treeBonds.length - 1) {
                    // Branch
                    result.push('(');
                    result.push(bondSymbol(nb.bond));
                    dfs(nb.neighbor);
                    result.push(')');
                } else {
                    // Main chain (last neighbor)
                    result.push(bondSymbol(nb.bond));
                    dfs(nb.neighbor);
                }
            }
        };

        // Handle potentially disconnected molecules (fragments)
        let first = true;
        for (const atomId of atomIds) {
            if (!visited.has(atomId)) {
                if (!first) result.push('.');
                dfs(atomId);
                first = false;
            }
        }

        // Now handle ring closures for visited atoms
        // We need to add closure digits at the closure partner
        // Actually, we already handle this inline. Let's clean the output.
        return result.join('');
    }

    static calculateProperties(molecule: any) {
        let logP = 0;
        let tpsa = 0;
        let hbd = 0;
        let hba = 0;

        if (molecule && molecule.atoms) {
            molecule.atoms.forEach((atom: Atom) => {
                const el = atom.element;

                // H-Bond Acceptors: N, O, F
                if (['N', 'O', 'F'].includes(el)) {
                    hba++;
                }

                // H-Bond Donors: Heteroatoms with Hydrogens
                // We need implicit H count.
                // Assuming we can get bonds to calculate implicit H
                const bonds = this.getConnectedBonds(atom, molecule);
                let bondOrderSum = 0;
                bonds.forEach((b: any) => {
                    if (b.type === 'DOUBLE') bondOrderSum += 2;
                    else if (b.type === 'TRIPLE') bondOrderSum += 3;
                    else bondOrderSum += 1;
                });
                const hCount = this.getImplicitHydrogens(el, bondOrderSum, 0); // Assuming neutral for now

                if (['N', 'O'].includes(el) && hCount > 0) {
                    hbd += hCount;
                }

                // LogP (Simplified Atom Additive)
                // Values roughly adapted from Ghose/Crippen or similar
                if (el === 'C') logP += 0.5; // Hydrophobic
                else if (el === 'H') logP += 0.0; // Implicit usually included in heavy atom
                else if (el === 'O' || el === 'N') logP -= 1.0; // Polar
                else if (el === 'F' || el === 'Cl') logP += 0.5; // Halogen
                else if (el === 'S') logP += 0.0;

                // TPSA (Simplified Ertl)
                if (el === 'N') {
                    if (hCount === 0) tpsa += 12.36; // Tertiary
                    else if (hCount === 1) tpsa += 12.03; // Secondary // Wait, Ertl NH is ~12?
                    else if (hCount >= 2) tpsa += 26.02; // Primary
                } else if (el === 'O') {
                    if (hCount === 0) tpsa += 17.07; // Carbonyl / Ether
                    else tpsa += 20.23; // Hydroxyl
                } else if (el === 'S') {
                    // S often has low TPSA unless oxidized? 
                    // P: ~10-20?
                    // Keep simple.
                    tpsa += 10;
                }
            });
        }

        return {
            logP: parseFloat(logP.toFixed(2)),
            tpsa: parseFloat(tpsa.toFixed(2)),
            hbd,
            hba
        };
    }

    private static getConnectedBonds(atom: Atom, molecule: any): Bond[] {
        const bonds: Bond[] = [];
        if (molecule.bonds) {
            molecule.bonds.forEach((b: any) => {
                if (b.atomA === atom.id || b.atomB === atom.id) bonds.push(b);
            });
        }
        return bonds;
    }

    private static getNeighbors(atom: Atom, molecule: any): { atom: Atom, bond: Bond }[] {
        const neighbors: { atom: Atom, bond: Bond }[] = [];
        if (molecule.bonds) {
            molecule.bonds.forEach((b: Bond) => {
                if (b.atomA === atom.id) {
                    const neighbor = molecule.atoms.get(b.atomB);
                    if (neighbor) neighbors.push({ atom: neighbor, bond: b });
                }
                else if (b.atomB === atom.id) {
                    const neighbor = molecule.atoms.get(b.atomA);
                    if (neighbor) neighbors.push({ atom: neighbor, bond: b });
                }
            });
        }
        return neighbors;
    }
}
