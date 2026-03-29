/**
 * ValencyEngine - IUPAC Standard Valency Rules
 *
 * Covers all common organic/inorganic elements with:
 * - Standard valencies (multiple oxidation states)
 * - Implicit H calculation
 * - Bond count validation
 * - Maximum bond order detection
 */

// ─── IUPAC Valency Table ─────────────────────────────────────────────────────

export const VALENCY_TABLE: Record<string, number[]> = {
  // Hydrogen group
  H:  [1],
  // Group IIIA
  B:  [3],
  Al: [3],
  Ga: [3],
  // Group IVA
  C:  [4],
  Si: [4],
  Ge: [4],
  Sn: [2, 4],
  Pb: [2, 4],
  // Group VA
  N:  [3, 5],
  P:  [3, 5],
  As: [3, 5],
  Sb: [3, 5],
  Bi: [3, 5],
  // Group VIA
  O:  [2],
  S:  [2, 4, 6],
  Se: [2, 4, 6],
  Te: [2, 4, 6],
  // Group VIIA (halogens)
  F:  [1],
  Cl: [1, 3, 5, 7],
  Br: [1, 3, 5, 7],
  I:  [1, 3, 5, 7],
  // Metals (simplified)
  Li: [1], Na: [1], K: [1],
  Mg: [2], Ca: [2], Ba: [2],
  Fe: [2, 3], Cu: [1, 2], Zn: [2],
  Ag: [1], Au: [1, 3],
  Hg: [1, 2], Mn: [2, 4, 7],
  // Noble (no valency)
  He: [0], Ne: [0], Ar: [0],
};

// CPK color map (ACS standard)
export const CPK_COLORS: Record<string, string> = {
  H:  '#FFFFFF',
  C:  '#404040',
  N:  '#3050F8',
  O:  '#FF0D0D',
  F:  '#90E050',
  Cl: '#1FF01F',
  Br: '#A62929',
  I:  '#940094',
  S:  '#FFFF30',
  P:  '#FF8000',
  B:  '#FFB5B5',
  Si: '#F0C8A0',
  Fe: '#E06633',
  Cu: '#C88033',
  Zn: '#7D80B0',
};

// ─── ValencyEngine ────────────────────────────────────────────────────────────

export const ValencyEngine = {

  /**
   * Get the standard IUPAC valencies for an element.
   * Returns empty array for unknown elements (treated as any valency).
   */
  getValencies(element: string): number[] {
    return VALENCY_TABLE[element] ?? [];
  },

  /**
   * Compute implicit H count using IUPAC rules.
   * Finds the smallest standard valency ≥ current bond order sum.
   */
  calculateImplicitH(element: string, bondOrderSum: number): number {
    const valencies = VALENCY_TABLE[element];
    if (!valencies || valencies.length === 0) return 0;

    for (const v of valencies) {
      if (bondOrderSum <= v) return v - bondOrderSum;
    }
    return 0; // Over-saturated
  },

  /**
   * Check if the given bond order sum is valid for an element.
   */
  isValenceValid(element: string, bondOrderSum: number, charge = 0): boolean {
    const valencies = VALENCY_TABLE[element];
    if (!valencies || valencies.length === 0) return true; // Unknown element — allow

    const effectiveSum = bondOrderSum - charge;
    return valencies.some(v => effectiveSum <= v);
  },

  /**
   * Maximum bonds allowed for an element (highest valency).
   */
  maxBonds(element: string): number {
    const valencies = VALENCY_TABLE[element];
    if (!valencies || valencies.length === 0) return 8;
    return Math.max(...valencies);
  },

  /**
   * Can this atom accept additional bonds?
   */
  canAddBond(element: string, currentBondOrderSum: number, newBondOrder = 1): boolean {
    return currentBondOrderSum + newBondOrder <= ValencyEngine.maxBonds(element);
  },
};
