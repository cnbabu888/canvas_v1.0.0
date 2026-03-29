import { Vec2D } from '../math/Vec2D';

import { ACS } from './ACSConstants';

export class RingGenerator {
    private static readonly DEFAULT_BOND_LENGTH = ACS.BOND_LENGTH;

    /**
     * Generates a regular polygon ring.
     * @param center - Center of the ring
     * @param sides - Number of atoms (3-8)
     * @param bondLength - Length of each bond (default 40px)
     * @param isAromatic - Whether it's a benzene-style ring
     */
    static generateRing(center: Vec2D, sides: number, bondLength: number = this.DEFAULT_BOND_LENGTH): Vec2D[] {
        const points: Vec2D[] = [];
        
        // 1. Radius: bondLength / (2 * sin(PI/N))
        const radius = bondLength / (2 * Math.sin(Math.PI / sides));
        
        // 2. Rotation offset
        // Standard chemistry: vertex at top (270° in canvas coords)
        let rotationOffset = -Math.PI / 2; // Default vertex at top

        const angleStep = (Math.PI * 2) / sides;

        for (let i = 0; i < sides; i++) {
            const angle = rotationOffset + i * angleStep;
            const x = center.x + radius * Math.cos(angle);
            const y = center.y + radius * Math.sin(angle);
            points.push(new Vec2D(x, y));
        }

        return points;
    }

    static async fromSmiles(smiles: string, cx: number, cy: number) {
        const { smilesTo2D } = await import('./IndigoEngine');
        const { atoms } = await smilesTo2D(smiles);
        const xs = atoms.map((a: any) => a.x), ys = atoms.map((a: any) => a.y);
        const offX = cx - (Math.min(...xs) + Math.max(...xs)) / 2;
        const offY = cy - (Math.min(...ys) + Math.max(...ys)) / 2;
        return atoms.map((a: any) => new Vec2D(a.x + offX, a.y + offY));
    }

    /**
     * Calculates the position for a ring sprouted from a single atom.
     * Oriented such that the center is along 'angle' from 'atomPos'.
     */
    static getSproutedRing(atomPos: Vec2D, angle: number, sides: number, bondLength: number = this.DEFAULT_BOND_LENGTH): Vec2D[] {
        const radius = bondLength / (2 * Math.sin(Math.PI / sides));

        const center = new Vec2D(
            atomPos.x + radius * Math.cos(angle),
            atomPos.y + radius * Math.sin(angle)
        );

        // Orient so one vertex is at atomPos
        const angleToAtom = Math.atan2(atomPos.y - center.y, atomPos.x - center.x);
        
        const points: Vec2D[] = [];
        const angleStep = (Math.PI * 2) / sides;
        for (let i = 0; i < sides; i++) {
            const a = angleToAtom + i * angleStep;
            points.push(new Vec2D(center.x + radius * Math.cos(a), center.y + radius * Math.sin(a)));
        }
        return points;
    }

    /**
     * Calculates points for a ring fused to an existing bond.
     * @param posA, posB - The two atoms of the shared bond
     * @param sides - Size of the new ring
     * @param existingAtoms - Used to calculate the center of the existing ring for reflection
     */
    static getFusedRing(posA: Vec2D, posB: Vec2D, sides: number, bondLength: number = this.DEFAULT_BOND_LENGTH, existingAtoms: {x: number, y: number}[] = []): Vec2D[] {
        const mid = new Vec2D((posA.x + posB.x) / 2, (posA.y + posB.y) / 2);
        const apothem = bondLength / (2 * Math.tan(Math.PI / sides));

        // Attempt center reflection if possible to ensure "outward" sprout
        // Find the ring centroid of existingAtoms that contains this bond?
        // Actually, simplify: Find center of the ring which contains posA and posB.
        // We can just calculate the two possible centers and pick the one farthest from the existing centroid.
        
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle - Math.PI / 2;

        const c1 = new Vec2D(mid.x + apothem * Math.cos(perpAngle), mid.y + apothem * Math.sin(perpAngle));
        const c2 = new Vec2D(mid.x - apothem * Math.cos(perpAngle), mid.y - apothem * Math.sin(perpAngle));

        let center = c1;
        if (existingAtoms.length > 0) {
            // Find centroid of those existing atoms
            let ex = 0, ey = 0;
            existingAtoms.forEach(p => { ex += p.x; ey += p.y; });
            const centroid = new Vec2D(ex/existingAtoms.length, ey/existingAtoms.length);
            
            // Pick center farthest from centroid
            if (c2.distance(centroid) > c1.distance(centroid)) {
                center = c2;
            }
        }

        const radius = bondLength / (2 * Math.sin(Math.PI / sides));
        const angleToA = Math.atan2(posA.y - center.y, posA.x - center.x);
        const angleToB = Math.atan2(posB.y - center.y, posB.x - center.x);
        
        // Ensure we step in the correct direction (A -> B or B -> A)
        const diff = angleToB - angleToA;
        const step = (Math.PI * 2) / sides;
        // Normalize diff to [-PI, PI]
        let normalizedDiff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        const direction = Math.abs(normalizedDiff - step) < 0.1 ? 1 : -1;

        const points: Vec2D[] = [];
        for (let i = 0; i < sides; i++) {
            const a = angleToA + direction * i * step;
            points.push(new Vec2D(center.x + radius * Math.cos(a), center.y + radius * Math.sin(a)));
        }
        return points;
    }

    static generateNaphthalene(center: Vec2D, bondLength: number = this.DEFAULT_BOND_LENGTH): Vec2D[] {
        const apothem = bondLength / (2 * Math.tan(Math.PI / 6));
        
        // Two connected hexagons
        const r1 = this.generateRing(new Vec2D(center.x - apothem, center.y), 6, bondLength);
        const r2 = this.generateRing(new Vec2D(center.x + apothem, center.y), 6, bondLength);
        return [...r1, ...r2];
    }

    static generateAnthracene(center: Vec2D, bondLength: number = this.DEFAULT_BOND_LENGTH): Vec2D[] {
        const apothem = bondLength / (2 * Math.tan(Math.PI / 6));
        
        const r1 = this.generateRing(new Vec2D(center.x - apothem * 2, center.y), 6, bondLength);
        const r2 = this.generateRing(center, 6, bondLength);
        const r3 = this.generateRing(new Vec2D(center.x + apothem * 2, center.y), 6, bondLength);
        return [...r1, ...r2, ...r3];
    }
}
