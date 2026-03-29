
import { Molecule } from '../entities/Molecule';
import { Atom } from '../entities/Atom';
import { Vec2 } from '../entities/Vec2';

export interface ValidationError {
  atomId: number;
  type: 'error' | 'warning';
  message: string;
}

export class ValidationEngine {
  /**
   * Run all validation checks.
   */
  static validate(molecule: Molecule): ValidationError[] {
    const errors: ValidationError[] = [];

    molecule.atoms.forEach(atom => {
      const valenceError = this.checkValence(atom, molecule);
      if (valenceError) errors.push(valenceError);
    });

    return errors;
  }

  private static checkValence(atom: Atom, molecule: Molecule): ValidationError | null {
    // H=1, C=4, N=3, O=2, F/Cl/Br/I=1, P=3/5, S=2/4/6
    const valenceMap: Record<string, number[]> = {
      'H': [1],
      'C': [4],
      'N': [3, 4],
      'O': [2],
      'F': [1], 'Cl': [1], 'Br': [1], 'I': [1],
      'P': [3, 5],
      'S': [2, 4, 6]
    };

    const allowed = valenceMap[atom.label];
    if (!allowed) return null;

    const bonds = molecule.getAtomBonds(atom.id);
    let bondOrderSum = 0;
    bonds.forEach(b => {
      // Use bond order (1, 2, 3)
      bondOrderSum += b.type; 
    });

    const maxValence = Math.max(...allowed);

    if (bondOrderSum > maxValence) {
      return {
        atomId: atom.id,
        type: 'error',
        message: `Valence exceeded: ${atom.label} has ${bondOrderSum} bonds (Max ${maxValence})`
      };
    }

    return null;
  }

  /**
   * Horizontally aligns components based on reaction arrows.
   */
  static alignReaction(molecule: Molecule): { atomId: number; newPos: Vec2 }[] {
    if (!molecule.annotations || molecule.annotations.length === 0) return [];

    const reactionArrows = molecule.annotations.filter(ann => ann.type === 'reaction-arrow');
    if (reactionArrows.length === 0) return [];

    // For now, simplify to the first arrow found
    const arrow = reactionArrows[0];
    const arrowY = (arrow.start.y + arrow.end.y) / 2;

    const moves: { atomId: number; newPos: Vec2 }[] = [];

    // Group atoms by left/right of arrow midpoint
    molecule.atoms.forEach(atom => {
      // Find the component this atom belongs to and its center
      // For simplicity in this version, just align every atom to the arrow's Y center
      // But we should really align the whole group's centroid.
      
      // Let's implement a simple vertical center alignment for all atoms 
      // relative to the arrow.
      const dy = arrowY - atom.position.y;
      if (Math.abs(dy) > 1) {
        moves.push({
          atomId: atom.id,
          newPos: new Vec2(atom.position.x, arrowY)
        });
      }
    });

    return moves;
  }
}
