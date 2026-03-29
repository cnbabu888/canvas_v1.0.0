import type { Command } from './Command';
import { Vec2 } from '../entities/Vec2';
import type { CanvasStyle } from '../styles/StyleManager';

export class CleanStructureCommand implements Command {
    public description = 'Clean Structure';
    private molecule: any;
    private style: CanvasStyle;
    private canvasCenter: Vec2;
    private oldPositions: Map<number, Vec2> = new Map();

    constructor(molecule: any, style: CanvasStyle, canvasCenter: Vec2) {
        this.molecule = molecule;
        this.style = style;
        this.canvasCenter = canvasCenter;
    }

    execute(): void {
        this.oldPositions.clear();

        // Save old positions for undo
        this.molecule.atoms.forEach((atom: any, id: number) => {
            this.oldPositions.set(id, atom.pos.clone());
        });

        if (this.molecule.atoms.size === 0) return;

        // ─── Step 1: Normalize bond lengths ───
        const targetLen = this.style.bondLength;
        const visited = new Set<number>();
        const atomIds = Array.from(this.molecule.atoms.keys()) as number[];

        // Build adjacency
        const adj = new Map<number, { neighbor: number; bond: any }[]>();
        atomIds.forEach(id => adj.set(id, []));
        this.molecule.bonds.forEach((b: any) => {
            adj.get(b.begin)?.push({ neighbor: b.end, bond: b });
            adj.get(b.end)?.push({ neighbor: b.begin, bond: b });
        });

        // Get connected bond count for hybridization detection
        const bondCounts = new Map<number, number>();
        atomIds.forEach(id => {
            bondCounts.set(id, (adj.get(id) || []).length);
        });

        // Place root atom at origin
        const rootId = atomIds[0];
        const rootAtom = this.molecule.atoms.get(rootId);
        if (!rootAtom) return;

        const newPositions = new Map<number, Vec2>();
        newPositions.set(rootId, new Vec2(0, 0));
        visited.add(rootId);

        const queue: number[] = [rootId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const currentPos = newPositions.get(currentId)!;
            const neighbors = adj.get(currentId) || [];
            const nCount = neighbors.length;

            let placedNeighborAngles: number[] = [];

            for (const nb of neighbors) {
                if (visited.has(nb.neighbor)) {
                    const nbPos = newPositions.get(nb.neighbor)!;
                    const dx = nbPos.x - currentPos.x;
                    const dy = nbPos.y - currentPos.y;
                    placedNeighborAngles.push(Math.atan2(dy, dx));
                }
            }

            const unplaced = neighbors.filter(nb => !visited.has(nb.neighbor));
            if (unplaced.length === 0) continue;

            let startAngle: number;
            let angleStep: number;

            if (placedNeighborAngles.length === 0) {
                startAngle = -Math.PI / 2;
                angleStep = (2 * Math.PI) / nCount;
            } else if (placedNeighborAngles.length === 1) {
                const incomingAngle = placedNeighborAngles[0];
                const outgoing = incomingAngle + Math.PI;

                if (unplaced.length === 1) {
                    startAngle = outgoing + (Math.PI / 6);
                    angleStep = 0;
                } else {
                    const totalAngleRange = Math.PI * 2 / 3 * 2;
                    angleStep = totalAngleRange / (unplaced.length + 1);
                    startAngle = outgoing - totalAngleRange / 2 + angleStep;
                }
            } else {
                placedNeighborAngles.sort((a, b) => a - b);
                let maxGap = 0;
                let gapStart = 0;
                for (let i = 0; i < placedNeighborAngles.length; i++) {
                    const next = (i + 1) % placedNeighborAngles.length;
                    let gap = placedNeighborAngles[next] - placedNeighborAngles[i];
                    if (gap < 0) gap += 2 * Math.PI;
                    if (gap > maxGap) {
                        maxGap = gap;
                        gapStart = placedNeighborAngles[i];
                    }
                }
                angleStep = maxGap / (unplaced.length + 1);
                startAngle = gapStart + angleStep;
            }

            for (let i = 0; i < unplaced.length; i++) {
                const nb = unplaced[i];
                const angle = startAngle + i * angleStep;
                const newPos = new Vec2(
                    currentPos.x + targetLen * Math.cos(angle),
                    currentPos.y + targetLen * Math.sin(angle),
                );
                newPositions.set(nb.neighbor, newPos);
                visited.add(nb.neighbor);
                queue.push(nb.neighbor);
            }
        }

        // Handle disconnected atoms (not in any bond)
        atomIds.forEach(id => {
            if (!newPositions.has(id)) {
                const atom = this.molecule.atoms.get(id);
                if (atom) newPositions.set(id, atom.pos.clone());
            }
        });

        // ─── Step 2: Center on canvas ───
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        newPositions.forEach(pos => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
        });
        const structCenterX = (minX + maxX) / 2;
        const structCenterY = (minY + maxY) / 2;
        const offsetX = this.canvasCenter.x - structCenterX;
        const offsetY = this.canvasCenter.y - structCenterY;

        // ─── Step 3: Apply new positions ───
        newPositions.forEach((pos, id) => {
            const atom = this.molecule.atoms.get(id);
            if (atom) {
                atom.pos = new Vec2(pos.x + offsetX, pos.y + offsetY);
            }
        });
    }

    undo(): void {
        // Restore old positions
        this.oldPositions.forEach((pos, id) => {
            const atom = this.molecule.atoms.get(id);
            if (atom) {
                atom.pos = pos.clone();
            }
        });
    }

    redo(): void {
        this.execute();
    }
}
