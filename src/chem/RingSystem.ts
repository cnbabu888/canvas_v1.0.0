import { Vec2D } from '../math/Vec2D';

/**
 * Represents a single node (atom/vertex) within a specific Ring structure.
 * This structure explicitly maps ring graph connectivity and stereochemistry.
 */
export class RingNode {
    index: number; // 0-indexed position in the ring
    atomId: string; // Reference to the Molecule's Atom
    position: Vec2D; // 2D layout coordinate

    // Potential stereochemistry indicators relative to the ring plane
    stereo: 'UP' | 'DOWN' | 'PLANAR' | 'UNKNOWN' = 'UNKNOWN';

    constructor(index: number, atomId: string, position: Vec2D) {
        this.index = index;
        this.atomId = atomId;
        this.position = position;
    }
}

/**
 * Represents an explicitly defined cyclic structure within a Molecule.
 */
export class Ring {
    id: string;
    nodes: RingNode[]; // Ordered array of nodes forming the cycle
    isAromatic: boolean;
    size: number;

    // Track connectivity edges specific to this ring
    // edge map: atomIdA -> atomIdB -> bondId
    edges: Map<string, Map<string, string>>;

    constructor(id: string, nodes: RingNode[], isAromatic: boolean = false) {
        this.id = id;
        this.nodes = nodes;
        this.size = nodes.length;
        this.isAromatic = isAromatic;
        this.edges = new Map();
    }

    /**
     * Registers a bond as an edge of this ring.
     */
    addEdge(atomIdA: string, atomIdB: string, bondId: string) {
        if (!this.edges.has(atomIdA)) this.edges.set(atomIdA, new Map());
        if (!this.edges.has(atomIdB)) this.edges.set(atomIdB, new Map());

        this.edges.get(atomIdA)!.set(atomIdB, bondId);
        this.edges.get(atomIdB)!.set(atomIdA, bondId);
    }

    /**
     * Checks if this ring shares at least one bond (2 atoms) with another ring.
     */
    isFusedWith(other: Ring): boolean {
        let sharedAtoms = 0;
        const myAtomIds = new Set(this.nodes.map(n => n.atomId));

        for (const otherNode of other.nodes) {
            if (myAtomIds.has(otherNode.atomId)) {
                sharedAtoms++;
            }
        }

        return sharedAtoms >= 2;
    }
}

/**
 * Encapsulates all cyclic/ring drawing, handling, and editing logic.
 */
export class RingSystem {

    /**
     * Calculates the ideal 2D coordinate vertices for a regular polygon ring.
     * @param center The center Vec2D of the ring
     * @param sides Number of members in the ring (e.g., 6 for Benzene)
     * @param radius Distance from center to vertex
     * @param startAngle Offset angle in radians
     */
    static calculateRingVertices(center: Vec2D, sides: number, radius: number, startAngle: number = 0): Vec2D[] {
        const points: Vec2D[] = [];
        const angleStep = (2 * Math.PI) / sides;
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + i * angleStep;
            points.push(new Vec2D(
                center.x + radius * Math.cos(angle),
                center.y + radius * Math.sin(angle)
            ));
        }
        return points;
    }
}
