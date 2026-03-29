/**
 * Chemistry Constants
 * Based on ChemDraw standards and IUPAC recommendations
 * @module ChemistryConstants
 */

/**
 * Standard bond lengths in Angstroms (Å)
 * Source: IUPAC recommendations and experimental data
 */
export const BOND_LENGTH = {
  SINGLE: 1.54,       // C-C single bond
  DOUBLE: 1.34,       // C=C double bond
  TRIPLE: 1.20,       // C≡C triple bond
  AROMATIC: 1.40,     // Benzene C-C
  C_N: 1.47,          // C-N single
  C_O: 1.43,          // C-O single
  C_S: 1.82,          // C-S single
  DEFAULT: 1.54,      // Fallback
} as const;

/**
 * Bond angles in degrees
 * Based on VSEPR theory and hybridization
 */
export const BOND_ANGLE = {
  SP3: 109.47,        // Tetrahedral (CH4, diamond)
  SP2: 120.0,         // Trigonal planar (C=C, benzene)
  SP: 180.0,          // Linear (C≡C, CO2)
  CYCLOPROPANE: 60.0,
  CYCLOBUTANE: 90.0,
  CYCLOPENTANE: 108.0,
  CYCLOHEXANE: 120.0,
  DEFAULT: 120.0,     // Fallback
} as const;

/**
 * Ring geometry templates
 * Defines angle, radius factor, and strain level for rings
 */
export const RING_TEMPLATE = {
  3: { angle: 60, radiusFactor: 0.9, strain: 'high' },
  4: { angle: 90, radiusFactor: 0.95, strain: 'medium' },
  5: { angle: 108, radiusFactor: 0.98, strain: 'low' },
  6: { angle: 120, radiusFactor: 1.0, strain: 'none' },   // Perfect hexagon
  7: { angle: 128.57, radiusFactor: 1.02, strain: 'none' },
  8: { angle: 135, radiusFactor: 1.05, strain: 'none' },
} as const;

/**
 * Canvas rendering constants (pixels)
 * Standard dimensions for drawing on HTML5 Canvas
 */
export const CANVAS_CONSTANTS = {
  BOND_LENGTH_PX: 40,         // Standard bond length in pixels
  ATOM_FONT_SIZE: 16,         // Font size for atom labels (C, N, O, etc.)
  CHARGE_FONT_SIZE: 12,       // Font size for charges (+, -, 2+, etc.)
  SUBSCRIPT_FONT_SIZE: 12,    // Font size for subscripts (CH₃)
  
  // Bond rendering
  BOND_LINE_WIDTH: 2,         // Single bond line width
  DOUBLE_BOND_OFFSET: 4,      // Spacing between double bond lines
  TRIPLE_BOND_OFFSET: 6,      // Spacing between triple bond lines
  AROMATIC_DASH_LENGTH: 4,    // Dash length for aromatic bonds
  AROMATIC_DASH_GAP: 2,       // Gap between dashes
  
  // Stereochemistry
  WEDGE_WIDTH: 8,             // Width at wide end of wedge bond
  HASH_SPACING: 3,            // Spacing between hash marks on dashed bond
  HASH_LINE_WIDTH: 1,         // Width of hash lines
  
  // Selection and interaction
  SELECTION_RADIUS: 10,       // Hit detection radius (pixels)
  HOVER_RADIUS: 12,           // Hover detection radius
  SNAP_THRESHOLD: 15,         // Auto-snap threshold for alignment
} as const;

/**
 * CPK atom colors (standard chemistry coloring)
 * Based on Corey-Pauling-Koltun (CPK) convention
 */
export const ATOM_COLOR = {
  H: '#FFFFFF',   // Hydrogen - white
  C: '#000000',   // Carbon - black
  N: '#0000FF',   // Nitrogen - blue
  O: '#FF0000',   // Oxygen - red
  F: '#00FF00',   // Fluorine - green
  Cl: '#00FF00',  // Chlorine - green
  Br: '#8B0000',  // Bromine - dark red
  I: '#8B008B',   // Iodine - dark magenta
  S: '#FFFF00',   // Sulfur - yellow
  P: '#FFA500',   // Phosphorus - orange
  B: '#FFB6C1',   // Boron - light pink
  Si: '#DAA520',  // Silicon - goldenrod
  DEFAULT: '#000000',
} as const;

/**
 * Van der Waals radii in Angstroms (Å)
 * Used for space-filling models and collision detection
 */
export const ATOM_RADIUS = {
  H: 1.20,
  C: 1.70,
  N: 1.55,
  O: 1.52,
  F: 1.47,
  Cl: 1.75,
  Br: 1.85,
  I: 1.98,
  S: 1.80,
  P: 1.80,
  B: 1.92,
  Si: 2.10,
  DEFAULT: 1.70,
} as const;

/**
 * Bond type constants (compatible with Ketcher/MDL Molfile format)
 */
export const BOND_TYPE = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  AROMATIC: 4,
  SINGLE_OR_DOUBLE: 5,
  SINGLE_OR_AROMATIC: 6,
  DOUBLE_OR_AROMATIC: 7,
  ANY: 8,
  DATIVE: 9,
  HYDROGEN: 10,
} as const;

/**
 * Bond stereochemistry constants
 */
export const BOND_STEREO = {
  NONE: 0,
  UP: 1,          // Wedge bond (solid, coming out of plane)
  EITHER: 4,      // Wavy bond (unknown stereochemistry)
  DOWN: 6,        // Hashed bond (dashed, going into plane)
  CIS_TRANS: 3,   // E/Z double bond notation
} as const;

/**
 * Periodic table element data (essential subset)
 */
export const ELEMENTS = {
  H: { number: 1, mass: 1.008, name: 'Hydrogen', valence: 1 },
  C: { number: 6, mass: 12.011, name: 'Carbon', valence: 4 },
  N: { number: 7, mass: 14.007, name: 'Nitrogen', valence: 3 },
  O: { number: 8, mass: 15.999, name: 'Oxygen', valence: 2 },
  F: { number: 9, mass: 18.998, name: 'Fluorine', valence: 1 },
  P: { number: 15, mass: 30.974, name: 'Phosphorus', valence: 3 },
  S: { number: 16, mass: 32.065, name: 'Sulfur', valence: 2 },
  Cl: { number: 17, mass: 35.453, name: 'Chlorine', valence: 1 },
  Br: { number: 35, mass: 79.904, name: 'Bromine', valence: 1 },
  I: { number: 53, mass: 126.904, name: 'Iodine', valence: 1 },
} as const;

/**
 * Helper function to get atom color
 */
export function getAtomColor(element: string): string {
  return ATOM_COLOR[element as keyof typeof ATOM_COLOR] || ATOM_COLOR.DEFAULT;
}

/**
 * Helper function to get atom radius
 */
export function getAtomRadius(element: string): number {
  return ATOM_RADIUS[element as keyof typeof ATOM_RADIUS] || ATOM_RADIUS.DEFAULT;
}

/**
 * Helper function to get bond angle for ring size
 */
export function getRingAngle(size: number): number {
  const template = RING_TEMPLATE[size as keyof typeof RING_TEMPLATE];
  return template ? template.angle : BOND_ANGLE.DEFAULT;
}

/**
 * Helper function to convert Angstroms to pixels
 */
export function angstromsToPixels(angstroms: number): number {
  // Standard scaling: 1.54Å (C-C bond) = 40px
  const scale = CANVAS_CONSTANTS.BOND_LENGTH_PX / BOND_LENGTH.SINGLE;
  return angstroms * scale;
}

/**
 * Helper function to convert pixels to Angstroms
 */
export function pixelsToAngstroms(pixels: number): number {
  const scale = BOND_LENGTH.SINGLE / CANVAS_CONSTANTS.BOND_LENGTH_PX;
  return pixels * scale;
}
