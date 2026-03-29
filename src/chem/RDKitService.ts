// @ts-nocheck
/**
 * RDKitService — Lazy-loaded RDKit WASM integration for structure clean-up,
 * canonical SMILES, and molecular property calculations.
 */

let rdkitInstance: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Lazily loads the RDKit WASM module. Returns the same instance on subsequent calls.
 */
async function getRDKit(): Promise<any> {
    if (rdkitInstance) return rdkitInstance;

    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            // @rdkit/rdkit provides initRDKitModule as default export
            const initRDKitModule = (await import('@rdkit/rdkit')).default;
            rdkitInstance = await initRDKitModule();
            return rdkitInstance;
        } catch (err) {
            console.error('[RDKitService] Failed to load RDKit WASM:', err);
            loadingPromise = null;
            throw err;
        }
    })();

    return loadingPromise;
}

export class RDKitService {
    /**
     * Check if RDKit is loaded
     */
    static isLoaded(): boolean {
        return rdkitInstance !== null;
    }

    /**
     * Pre-load RDKit WASM in the background (call early to hide latency)
     */
    static async preload(): Promise<void> {
        await getRDKit();
    }

    /**
     * Clean a structure: parse SMILES → compute ideal 2D coordinates via RDKit coordgen → return positions.
     * Returns a map of atom index to {x, y} positions, or null on failure.
     */
    static async cleanStructure(smiles: string): Promise<{ positions: { x: number, y: number }[], canonSmiles: string } | null> {
        try {
            const RDKit = await getRDKit();
            const mol = RDKit.get_mol(smiles);
            if (!mol || !mol.is_valid()) {
                mol?.delete();
                return null;
            }

            // Generate 2D coordinates using coordgen
            mol.set_new_coords(true); // Use CoordGen for clean 2D layout

            const molBlock = mol.get_molblock();
            const canonSmiles = mol.get_smiles();

            // Parse the molblock to extract atom positions
            const positions = this.parseMolBlockPositions(molBlock);

            mol.delete();
            return { positions, canonSmiles };
        } catch (err) {
            console.error('[RDKitService] cleanStructure failed:', err);
            return null;
        }
    }

    /**
     * Get canonical SMILES for a given SMILES string
     */
    static async canonicalize(smiles: string): Promise<string | null> {
        try {
            const RDKit = await getRDKit();
            const mol = RDKit.get_mol(smiles);
            if (!mol || !mol.is_valid()) {
                mol?.delete();
                return null;
            }
            const canonical = mol.get_smiles();
            mol.delete();
            return canonical;
        } catch (err) {
            console.error('[RDKitService] canonicalize failed:', err);
            return null;
        }
    }

    /**
     * Get molecular descriptors from RDKit
     */
    static async getDescriptors(smiles: string): Promise<{
        exactMW: number;
        logP: number;
        hba: number;
        hbd: number;
        tpsa: number;
        numRotatableBonds: number;
        numRings: number;
        formula: string;
    } | null> {
        try {
            const RDKit = await getRDKit();
            const mol = RDKit.get_mol(smiles);
            if (!mol || !mol.is_valid()) {
                mol?.delete();
                return null;
            }

            const descriptorsJSON = mol.get_descriptors();
            const desc = JSON.parse(descriptorsJSON);
            mol.delete();

            return {
                exactMW: desc.exactmw || 0,
                logP: desc.CrippenClogP || 0,
                hba: desc.NumHBA || 0,
                hbd: desc.NumHBD || 0,
                tpsa: desc.tpsa || 0,
                numRotatableBonds: desc.NumRotatableBonds || 0,
                numRings: desc.NumRings || 0,
                formula: desc.formula || '',
            };
        } catch (err) {
            console.error('[RDKitService] getDescriptors failed:', err);
            return null;
        }
    }

    /**
     * Get SVG rendering of a molecule (useful for thumbnails / previews)
     */
    static async getMolSVG(smiles: string, width: number = 200, height: number = 150): Promise<string | null> {
        try {
            const RDKit = await getRDKit();
            const mol = RDKit.get_mol(smiles);
            if (!mol || !mol.is_valid()) {
                mol?.delete();
                return null;
            }
            const svg = mol.get_svg_with_highlights(JSON.stringify({
                width,
                height,
            }));
            mol.delete();
            return svg;
        } catch (err) {
            console.error('[RDKitService] getMolSVG failed:', err);
            return null;
        }
    }

    /**
     * Parse a V2000 Mol Block to extract atom 2D positions
     */
    private static parseMolBlockPositions(molBlock: string): { x: number, y: number }[] {
        const positions: { x: number, y: number }[] = [];
        const lines = molBlock.split('\n');

        // V2000 Mol block: line 4 contains atom/bond counts
        // Format: aaabbblllfffcccsssxxxrrrpppiiimmmvvvvvv
        if (lines.length < 4) return positions;

        const countsLine = lines[3].trim();
        const numAtoms = parseInt(countsLine.substring(0, 3).trim());

        // Atom block starts at line 5 (index 4)
        for (let i = 0; i < numAtoms; i++) {
            const atomLine = lines[4 + i];
            if (!atomLine) continue;

            // V2000 format: xxxxx.xxxxyyyyy.yyyyzzzzz.zzzz aaaddcccssshhhbbbvvvHHHrrriiimmmnnneee
            const x = parseFloat(atomLine.substring(0, 10).trim());
            const y = parseFloat(atomLine.substring(10, 20).trim());

            // RDKit coords are in Angstroms, scale to canvas pixels (1Å ≈ 40px)
            positions.push({ x: x * 40, y: -y * 40 }); // Flip Y for screen coords
        }

        return positions;
    }
}
