import { create } from 'zustand';
import { Molecule } from '../entities/Molecule';
import { Atom } from '../entities/Atom';
import { Bond } from '../entities/Bond';
import { Vec2 } from '../entities/Vec2';

// v3.3 compatibility imports
import { Vec2D } from '../math/Vec2D';
import { CommandManager } from '../commands/CommandManager';
import type { Command } from '../commands/Command';
import type { Template } from '../chem/Template';
import { DEFAULT_STYLE, type CanvasStyle } from '../styles/StyleManager';
import type { LabWare } from '../chem/LabWare';

export interface ValidationError {
  atomId: number;
  type: 'error' | 'warning';
  message: string;
}

export type ToolType =
  | 'select'
  | 'lasso'
  | 'bond'
  | 'ring'
  | 'chain'
  | 'erase'
  | 'text'
  | 'atom'
  | 'scissor'
  | 'ai'; // Added scissor and ai from v3.3

export interface CanvasState {
  // ── Molecule ──────────────────────────────────────────────────────────────
  molecule: Molecule;

  // ── Tool ──────────────────────────────────────────────────────────────────
  activeTool: ToolType | string; // Extended to allow string from v3.3
  activeSubTool: string | null;
  activeElement: string;

  // ── Selection ─────────────────────────────────────────────────────────────
  selectedAtoms: Set<number>;
  selectedBonds: Set<number>;
  selectedAtomIds: string[]; // [v3.3 Compatibility]
  selectedBondIds: string[]; // [v3.3 Compatibility]

  // ── Hover ─────────────────────────────────────────────────────────────────
  hoveredAtom: number | null;
  hoveredBond: number | null;

  // ── Clipboard (for copy/paste) ────────────────────────────────────────────
  clipboard: Molecule | null;

  // ── History & Commands ─────────────────────────────────────────────────────
  history: Molecule[];
  historyIndex: number;
  commandManager: CommandManager; // [v3.3]
  version: number; // [v3.3] Increment to force re-renders

  // ── View ──────────────────────────────────────────────────────────────────
  zoom: number;
  pan: { x: number; y: number };
  offset: Vec2D; // [v3.3] Alias for pan/offset

  // ── Styles & Labware ──────────────────────────────────────────────────────
  style: CanvasStyle; // [v3.3]
  labware: LabWare[]; // [v3.3]
  pageOrientation: 'portrait' | 'landscape'; // [v3.3]
  pageSize: { width: number; height: number }; // [v3.3]
  scissorMode: 'homolytic' | 'heterolytic'; // [v3.3]
  retrosynthesisMode: boolean; // [v3.3]
  activeTemplate: Template | null; // [v3.3]
  selectedColor: string | null; // [v3.3]
  validationErrors: ValidationError[];
  activePopup: string | null;

  // ── Tool actions ──────────────────────────────────────────────────────────
  setActiveTool: (tool: ToolType | string, subTool?: string) => void;
  setActiveSubTool: (subTool: string | null) => void;
  setActiveElement: (element: string) => void;

  // ── Selection actions ─────────────────────────────────────────────────────
  selectAtom: (atomId: number | string, append?: boolean) => void;
  selectBond: (bondId: number| string, append?: boolean) => void;
  setSelected: (atoms: (string | number)[], bonds: (string | number)[]) => void; // [v3.3]
  clearSelection: () => void;
  selectAll: () => void;
  selectConnectedComponent: (atomId: number | string) => void;
  selectAtomsInRect: (x1: number, y1: number, x2: number, y2: number) => void;
  selectAtomsInPolygon: (points: (Vec2 | Vec2D)[]) => void;
  toggleAtomSelection: (atomId: number | string) => void;
  toggleBondSelection: (bondId: number | string) => void;
  setSelectedAtoms: (atomIds: (string | number)[]) => void; // [v3.3]

  // ── Deletion ──────────────────────────────────────────────────────────────
  deleteSelected: () => void;

  // ── Clipboard ─────────────────────────────────────────────────────────────
  copySelected: () => void;
  pasteClipboard: (offset?: Vec2 | Vec2D) => void;

  // ── Hover ─────────────────────────────────────────────────────────────────
  setHoveredAtom: (atomId: number | null) => void;
  setHoveredBond: (bondId: number | null) => void;

  // ── Molecule mutations ────────────────────────────────────────────────────
  addAtom: (atom: Atom) => void;
  removeAtom: (atomId: number) => void;
  addBond: (bond: Bond) => void;
  removeBond: (bondId: number) => void;
  updateMolecule: (molecule: Molecule) => void;
  setMolecule: (mol: Molecule | any, centerView?: boolean) => void; // [v3.3]

  // ── History & Commands ─────────────────────────────────────────────────────
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  executeCommand: (command: Command) => void; // [v3.3]
  setCommandManager: (manager: CommandManager) => void; // [v3.3]

  // ── View ──────────────────────────────────────────────────────────────────
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setOffset: (offset: Vec2D) => void; // [v3.3]
  resetView: () => void;

  // ── Labware & Styles ──────────────────────────────────────────────────────
  setLabWare: (items: LabWare[]) => void;
  addLabWare: (item: LabWare) => void;
  setStyle: (style: CanvasStyle) => void;
  setPageOrientation: (orientation: 'portrait' | 'landscape') => void;
  setScissorMode: (mode: 'homolytic' | 'heterolytic') => void;
  setRetrosynthesisMode: (enabled: boolean) => void;
  setActiveTemplate: (template: Template | null) => void;
  setSelectedColor: (color: string | null) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  setActivePopup: (popupId: string | null) => void;

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  molecule: new Molecule(),
  activeTool: 'select',
  activeSubTool: null,
  activeElement: 'C',
  selectedAtoms: new Set<number>(),
  selectedBonds: new Set<number>(),
  selectedAtomIds: [],
  selectedBondIds: [],
  hoveredAtom: null,
  hoveredBond: null,
  clipboard: null,
  history: [],
  historyIndex: -1,
  commandManager: new CommandManager(),
  version: 0,
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  offset: new Vec2D(0, 0),
  style: DEFAULT_STYLE,
  labware: [],
  pageOrientation: 'portrait' as const,
  pageSize: { width: 816, height: 1056 },
  scissorMode: 'homolytic' as const,
  retrosynthesisMode: false,
  activeTemplate: null,
  selectedColor: null,
  validationErrors: [],
  activePopup: null as string | null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasState>((set, get) => ({
  ...initialState,

  // ── Tool ────────────────────────────────────────────────────────────────
  setActiveTool: (tool, subTool) => {
    // If clicking a color, only update the selectedColor
    if (tool === 'color') {
      if (subTool) {
        const colorMap: Record<string, string> = {
          'color-black': '#000000',
          'color-blue': '#3b82f6',
          'color-red': '#ef4444',
          'color-yellow': '#eab308',
          'color-green': '#22c55e',
          'color-purple': '#a855f7',
          'color-orange': '#f97316'
        };
        set({ selectedColor: colorMap[subTool] || null });
      }
      return;
    }

    set({
      activeTool: tool as ToolType,
      // Only set activeSubTool when a specific subTool is chosen; otherwise null
      activeSubTool: subTool && subTool !== tool ? subTool : null,
      selectedAtoms: new Set(),
      selectedBonds: new Set(),
      selectedAtomIds: [],
      selectedBondIds: []
    });
  },
  setActiveSubTool: (subTool) => set({ activeSubTool: subTool }),
  setActiveElement: (element) => set({ activeElement: element }),
  setActivePopup: (popupId) => set({ activePopup: popupId }),

  // ── Selection ────────────────────────────────────────────────────────────

  selectAtom: (atomId, append = false) =>
    set((state) => {
      const id = typeof atomId === 'string' ? parseInt(atomId) : atomId;
      if (isNaN(id)) return state;
      const sel = append ? new Set(state.selectedAtoms) : new Set<number>();
      sel.add(id);
      return { 
        selectedAtoms: sel,
        selectedAtomIds: Array.from(sel).map(i => i.toString())
      };
    }),

  selectBond: (bondId, append = false) =>
    set((state) => {
      const id = typeof bondId === 'string' ? parseInt(bondId) : bondId;
      if (isNaN(id)) return state;
      const sel = append ? new Set(state.selectedBonds) : new Set<number>();
      sel.add(id);
      return { 
        selectedBonds: sel,
        selectedBondIds: Array.from(sel).map(i => i.toString())
      };
    }),

  setSelected: (atoms, bonds) => {
    const atomNums = atoms.map(id => typeof id === 'string' ? parseInt(id) : id).filter(id => !isNaN(id));
    const bondNums = bonds.map(id => typeof id === 'string' ? parseInt(id) : id).filter(id => !isNaN(id));
    set({ 
      selectedAtomIds: atomNums.map(String), 
      selectedBondIds: bondNums.map(String),
      selectedAtoms: new Set(atomNums),
      selectedBonds: new Set(bondNums)
    });
  },

  setSelectedAtoms: (atoms) => {
    const atomNums = atoms.map(id => typeof id === 'string' ? parseInt(id) : id).filter(id => !isNaN(id));
    set({ 
      selectedAtomIds: atomNums.map(String), 
      selectedAtoms: new Set(atomNums)
    });
  },

  toggleAtomSelection: (atomId) =>
    set((state) => {
      const id = typeof atomId === 'string' ? parseInt(atomId) : atomId;
      if (isNaN(id)) return state;
      const sel = new Set(state.selectedAtoms);
      if (sel.has(id)) sel.delete(id);
      else sel.add(id);
      return { 
        selectedAtoms: sel,
        selectedAtomIds: Array.from(sel).map(i => i.toString())
      };
    }),

  toggleBondSelection: (bondId) =>
    set((state) => {
      const id = typeof bondId === 'string' ? parseInt(bondId) : bondId;
      if (isNaN(id)) return state;
      const sel = new Set(state.selectedBonds);
      if (sel.has(id)) sel.delete(id);
      else sel.add(id);
      return { 
        selectedBonds: sel,
        selectedBondIds: Array.from(sel).map(i => i.toString())
      };
    }),

  clearSelection: () =>
    set({ 
      selectedAtoms: new Set(), 
      selectedBonds: new Set(), 
      selectedAtomIds: [], 
      selectedBondIds: [] 
    }),

  selectAll: () =>
    set((state) => {
      const atoms = new Set(state.molecule.atoms.keys());
      const bonds = new Set(state.molecule.bonds.keys());
      return {
        selectedAtoms: atoms,
        selectedBonds: bonds,
        selectedAtomIds: Array.from(atoms).map(id => id.toString()),
        selectedBondIds: Array.from(bonds).map(id => id.toString())
      };
    }),

  selectConnectedComponent: (atomId) =>
    set((state) => {
      // BFS to find all atoms/bonds in the same connected component
      const startId = typeof atomId === 'string' ? parseInt(atomId) : atomId;
      if (isNaN(startId)) return state;

      const visited = new Set<number>();
      const queue: number[] = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        // Find all bonds connected to current atom
        for (const bond of state.molecule.bonds.values()) {
          if (bond.begin === current && !visited.has(bond.end)) {
            visited.add(bond.end);
            queue.push(bond.end);
          } else if (bond.end === current && !visited.has(bond.begin)) {
            visited.add(bond.begin);
            queue.push(bond.begin);
          }
        }
      }

      const selectedBonds = new Set<number>();
      for (const bond of state.molecule.bonds.values()) {
        if (visited.has(bond.begin) && visited.has(bond.end)) {
          selectedBonds.add(bond.id);
        }
      }

      return {
        selectedAtoms: visited,
        selectedBonds,
        selectedAtomIds: Array.from(visited).map(String),
        selectedBondIds: Array.from(selectedBonds).map(String),
      };
    }),

  selectAtomsInRect: (x1, y1, x2, y2) =>
    set((state) => {
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);

      const atoms = new Set<number>();
      for (const atom of state.molecule.atoms.values()) {
        if (
          atom.position.x >= minX && atom.position.x <= maxX &&
          atom.position.y >= minY && atom.position.y <= maxY
        ) {
          atoms.add(atom.id);
        }
      }

      const bonds = new Set<number>();
      for (const bond of state.molecule.bonds.values()) {
        if (atoms.has(bond.begin) && atoms.has(bond.end)) {
          bonds.add(bond.id);
        }
      }

      return { selectedAtoms: atoms, selectedBonds: bonds };
    }),

  selectAtomsInPolygon: (points) =>
    set((state) => {
      if (points.length < 3) return state;

      // Ray-casting point-in-polygon test
      const insidePolygon = (x: number, y: number): boolean => {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].x, yi = points[i].y;
          const xj = points[j].x, yj = points[j].y;
          const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      };

      const atoms = new Set<number>();
      for (const atom of state.molecule.atoms.values()) {
        if (insidePolygon(atom.position.x, atom.position.y)) {
          atoms.add(atom.id);
        }
      }

      const bonds = new Set<number>();
      for (const bond of state.molecule.bonds.values()) {
        if (atoms.has(bond.begin) && atoms.has(bond.end)) {
          bonds.add(bond.id);
        }
      }

      return {
        selectedAtoms: atoms,
        selectedBonds: bonds,
        selectedAtomIds: Array.from(atoms).map(String),
        selectedBondIds: Array.from(bonds).map(String),
      };
    }),

  // ── Delete ───────────────────────────────────────────────────────────────

  deleteSelected: () =>
    set((state) => {
      const mol = state.molecule.clone();
      state.saveToHistory();

      for (const bondId of state.selectedBonds) mol.removeBond(bondId);
      for (const atomId of state.selectedAtoms) mol.removeAtom(atomId);

      return {
        molecule: mol,
        selectedAtoms: new Set(),
        selectedBonds: new Set(),
      };
    }),

  // ── Clipboard ────────────────────────────────────────────────────────────

  copySelected: () =>
    set((state) => {
      if (state.selectedAtoms.size === 0 && state.selectedBonds.size === 0) return {};
      // Deep copy the selected fragment
      const fragment = new Molecule();
      const idMap = new Map<number, number>();

      for (const atomId of state.selectedAtoms) {
        const atom = state.molecule.atoms.get(atomId);
        if (!atom) continue;
        const newAtom = fragment.addAtom({
          label: atom.label,
          position: atom.position.clone(),
          charge: atom.charge,
        });
        idMap.set(atomId, newAtom.id);
      }

      for (const bondId of state.selectedBonds) {
        const bond = state.molecule.bonds.get(bondId);
        if (!bond) continue;
        const newBegin = idMap.get(bond.begin);
        const newEnd = idMap.get(bond.end);
        if (newBegin !== undefined && newEnd !== undefined) {
          fragment.addBond({ begin: newBegin, end: newEnd, type: bond.type, stereo: bond.stereo });
        }
      }

      return { clipboard: fragment };
    }),

  pasteClipboard: (offset = new Vec2(20, 20)) =>
    set((state) => {
      if (!state.clipboard) return state;
      state.saveToHistory();
      const mol = state.molecule.clone();
      const idMap = new Map<number, number>();
      const dx = (offset as Vec2).x ?? 20;
      const dy = (offset as Vec2).y ?? 20;

      state.clipboard.atoms.forEach((atom) => {
        const newAtom = mol.addAtom({
          label: atom.label,
          position: new Vec2(atom.position.x + dx, atom.position.y + dy),
          charge: atom.charge,
        });
        idMap.set(atom.id, newAtom.id);
      });

      state.clipboard.bonds.forEach((bond) => {
        const newBegin = idMap.get(bond.begin);
        const newEnd = idMap.get(bond.end);
        if (newBegin !== undefined && newEnd !== undefined) {
          mol.addBond({ begin: newBegin, end: newEnd, type: bond.type, stereo: bond.stereo });
        }
      });

      return { molecule: mol };
    }),

  // ── Hover ────────────────────────────────────────────────────────────────
  setHoveredAtom: (atomId) => set({ hoveredAtom: atomId }),
  setHoveredBond: (bondId) => set({ hoveredBond: bondId }),

  // ── Molecule mutations ───────────────────────────────────────────────────
  addAtom: (atom) =>
    set((state) => {
      const mol = state.molecule.clone();
      mol.atoms.set(atom.id, atom);
      return { molecule: mol };
    }),

  removeAtom: (atomId) =>
    set((state) => {
      const mol = state.molecule.clone();
      mol.removeAtom(atomId);
      return { molecule: mol };
    }),

  addBond: (bond) =>
    set((state) => {
      const mol = state.molecule.clone();
      mol.bonds.set(bond.id, bond);
      return { molecule: mol };
    }),

  removeBond: (bondId) =>
    set((state) => {
      const mol = state.molecule.clone();
      mol.removeBond(bondId);
      return { molecule: mol };
    }),

  updateMolecule: (molecule) => set({ molecule }),

  setMolecule: (molecule: any, _centerView = false) => set((state) => ({
    molecule: (molecule instanceof Molecule) ? molecule : state.molecule,
    version: state.version + 1
  })),

  // ── History & Commands ───────────────────────────────────────────────────
  saveToHistory: () =>
    set((state) => {
      const snapshot = state.molecule.clone();
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > 100) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      console.log('[History] Undoing to index', state.historyIndex - 1);
      const newIndex = state.historyIndex - 1;
      return { molecule: state.history[newIndex].clone(), historyIndex: newIndex };
    }
    console.warn('[History] Nothing to undo');
    return {};
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      console.log('[History] Redoing to index', state.historyIndex + 1);
      const newIndex = state.historyIndex + 1;
      return { molecule: state.history[newIndex].clone(), historyIndex: newIndex };
    }
    console.warn('[History] Nothing to redo');
    return {};
  }),

  executeCommand: (command: Command) => {
    const { commandManager, version } = get();
    get().saveToHistory();
    commandManager.execute(command);
    set({ version: version + 1 });
  },

  setCommandManager: (commandManager) => set({ commandManager }),

  // ── View ────────────────────────────────────────────────────────────────
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan:  (pan)  => set({ pan, offset: new Vec2D(pan.x, pan.y) }),
  setOffset: (offset) => set({ offset, pan: { x: offset.x, y: offset.y } }),
  resetView: ()   => set({ zoom: 1.0, pan: { x: 0, y: 0 }, offset: new Vec2D(0, 0) }),

  // ── Labware & Styles ────────────────────────────────────────────────────
  setLabWare: (labware) => set({ labware }),
  addLabWare: (item) => set((state) => ({ labware: [...state.labware, item] })),
  setStyle: (style) => set({ style }),
  setPageOrientation: (orientation) => set({
      pageOrientation: orientation,
      pageSize: orientation === 'portrait' ? { width: 816, height: 1056 } : { width: 1056, height: 816 },
  }),
  setScissorMode: (mode) => set({ scissorMode: mode }),
  setRetrosynthesisMode: (enabled) => set({ retrosynthesisMode: enabled }),
  setActiveTemplate: (t) => set({ activeTemplate: t }),
  setSelectedColor: (color) => set({ selectedColor: color }),

  setValidationErrors: (errors) => {
    set({ validationErrors: errors });
  },

  // ── Reset ────────────────────────────────────────────────────────────────
  reset: () => set({ ...initialState, molecule: new Molecule() }),
}));
