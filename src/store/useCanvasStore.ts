// @ts-nocheck
import { create } from 'zustand';
import { Vec2D } from '../math/Vec2D';
import { Molecule } from '../molecular/Molecule';
import { Atom } from '../molecular/Atom';
import { Bond } from '../molecular/Bond';
import { CommandManager } from '../commands/CommandManager';
import type { Command } from '../commands/Command';
import type { Template } from '../chem/Template';
import { DEFAULT_STYLE, type CanvasStyle } from '../styles/StyleManager';
import type { LabWare } from '../chem/LabWare';
import { RemoveElementsCommand } from '../commands/RemoveElementsCommand';
import { AddAtomCommand } from '../commands/AddAtomCommand';
import { AddBondCommand } from '../commands/AddBondCommand';

interface CanvasState {
    zoom: number;
    offset: Vec2D;
    activeLayer: string;
    activeTool: string;
    activeSubTool: string; // [NEW] Track sub-tool state (e.g., 'RING_5' vs 'ring')

    scissorMode: 'homolytic' | 'heterolytic';
    retrosynthesisMode: boolean;

    activeTemplate: Template | null; // Selected template to place
    selectedColor: string | null;

    // Selection
    selectedAtomIds: string[];
    selectedBondIds: string[];

    // Clipboard
    clipboard: { atoms: Atom[]; bonds: Bond[] } | null;

    // Data
    molecule: Molecule;
    labware: LabWare[];
    commandManager: CommandManager;
    version: number; // Increment on every change to force re-renders for deep objects
    style: CanvasStyle;
    pageOrientation: 'portrait' | 'landscape';
    pageSize: { width: number; height: number }; // in px at 100% zoom

    // Actions
    setZoom: (zoom: number) => void;
    setOffset: (offset: Vec2D) => void;
    setActiveLayer: (layer: string) => void;
    setActiveTool: (tool: string, subTool?: string) => void; // [NEW] Optional subTool
    setScissorMode: (mode: 'homolytic' | 'heterolytic') => void;
    setRetrosynthesisMode: (enabled: boolean) => void;
    setActiveTemplate: (template: Template | null) => void;
    setSelectedColor: (color: string | null) => void;

    setSelected: (atoms: string[], bonds: string[]) => void;
    clearSelection: () => void;

    copySelection: () => void;
    cutSelection: () => void;
    pasteClipboard: (offset?: Vec2D) => void;

    executeCommand: (command: Command) => void;
    undo: () => void;
    redo: () => void;

    setMolecule: (mol: Molecule, centerView?: boolean) => void;
    pendingCenter: boolean;
    clearPendingCenter: () => void;
    setLabWare: (items: LabWare[]) => void;
    addLabWare: (item: LabWare) => void;
    setCommandManager: (manager: CommandManager) => void;
    setVersion: (ver: number) => void;
    setStyle: (style: CanvasStyle) => void;
    setPageOrientation: (orientation: 'portrait' | 'landscape') => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    zoom: 1,
    offset: new Vec2D(0, 0),
    activeLayer: 'layer-1-content',
    activeTool: 'select',
    activeSubTool: 'select', // Default

    scissorMode: 'homolytic',
    retrosynthesisMode: false,

    activeTemplate: null,
    selectedColor: null,

    selectedAtomIds: [],
    selectedBondIds: [],

    clipboard: null,
    pendingCenter: false,

    molecule: new Molecule(),
    labware: [],
    commandManager: new CommandManager(),
    version: 0,
    style: DEFAULT_STYLE,
    pageOrientation: 'portrait' as const,
    pageSize: { width: 816, height: 1056 }, // Letter size: 8.5x11 inches at 96dpi

    setZoom: (zoom) => set({ zoom: Math.max(0.01, Math.min(zoom, 9.99)) }),
    setOffset: (offset) => set({ offset }),
    setActiveLayer: (activeLayer) => set({ activeLayer }),
    setActiveTool: (activeTool, subTool) => {
        // If clicking a color, only update the selectedColor and keep the current tool active
        if (activeTool === 'color') {
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

        set((state) => ({
            activeTool,
            activeSubTool: subTool || activeTool, // Fallback to main tool id if no subtool
            selectedAtomIds: [],
            selectedBondIds: []
        }));
    },
    setScissorMode: (mode) => set({ scissorMode: mode }),
    setRetrosynthesisMode: (enabled) => set({ retrosynthesisMode: enabled }),
    setActiveTemplate: (t) => set({ activeTemplate: t }),
    setSelectedColor: (color) => set({ selectedColor: color }),

    setSelected: (atoms, bonds) => set({ selectedAtomIds: atoms, selectedBondIds: bonds }),
    clearSelection: () => set({ selectedAtomIds: [], selectedBondIds: [] }),

    copySelection: () => {
        const { molecule, selectedAtomIds, selectedBondIds } = get();
        if (selectedAtomIds.length === 0 && selectedBondIds.length === 0) return;

        const atomIdSet = new Set(selectedAtomIds);
        // Deep-copy selected atoms
        const atoms: Atom[] = selectedAtomIds
            .map(id => molecule.atoms.get(id))
            .filter(Boolean)
            .map(a => {
                const copy = new Atom(a.id, a.element, new Vec2D(a.pos.x, a.pos.y));
                copy.charge = a.charge;
                copy.hydrogenCount = a.hydrogenCount;
                copy.implicitHCount = a.implicitHCount;
                copy.valence = a.valence;
                if (a.isotope !== undefined) copy.isotope = a.isotope;
                return copy;
            });

        // Include explicitly selected bonds + bonds whose both endpoints are selected
        const bondIdSet = new Set(selectedBondIds);
        molecule.bonds.forEach(b => {
            if (atomIdSet.has(b.atomA) && atomIdSet.has(b.atomB)) bondIdSet.add(b.id);
        });
        const bonds: Bond[] = Array.from(bondIdSet)
            .map(id => molecule.bonds.get(id))
            .filter(b => b && atomIdSet.has(b.atomA) && atomIdSet.has(b.atomB))
            .map(b => new Bond(b.id, b.atomA, b.atomB, b.order, b.type));

        set({ clipboard: { atoms, bonds } });
    },

    cutSelection: () => {
        const store = get();
        store.copySelection();
        const { molecule, selectedAtomIds, selectedBondIds, executeCommand, version } = get();
        if (selectedAtomIds.length === 0 && selectedBondIds.length === 0) return;

        const cmd = new RemoveElementsCommand(molecule, selectedAtomIds, selectedBondIds);
        store.executeCommand(cmd);
        set({ selectedAtomIds: [], selectedBondIds: [] });
    },

    pasteClipboard: (offset?: Vec2D) => {
        const { clipboard, molecule, executeCommand, version } = get();
        if (!clipboard || clipboard.atoms.length === 0) return;

        const dx = offset?.x ?? 20;
        const dy = offset?.y ?? 20;

        // Create new IDs mapping old → new
        const idMap = new Map<string, string>();
        clipboard.atoms.forEach(a => idMap.set(a.id, crypto.randomUUID()));

        const newAtomIds: string[] = [];
        const newBondIds: string[] = [];

        clipboard.atoms.forEach(a => {
            const newId = idMap.get(a.id)!;
            const newAtom = new Atom(newId, a.element, new Vec2D(a.pos.x + dx, a.pos.y + dy));
            newAtom.charge = a.charge;
            newAtom.hydrogenCount = a.hydrogenCount;
            newAtom.implicitHCount = a.implicitHCount;
            newAtom.valence = a.valence;
            if (a.isotope !== undefined) newAtom.isotope = a.isotope;
            const cmd = new AddAtomCommand(molecule, newAtom);
            executeCommand(cmd);
            newAtomIds.push(newId);
        });

        clipboard.bonds.forEach(b => {
            const newA = idMap.get(b.atomA);
            const newB = idMap.get(b.atomB);
            if (!newA || !newB) return;
            const newBondId = crypto.randomUUID();
            const newBond = new Bond(newBondId, newA, newB, b.order, b.type);
            const cmd = new AddBondCommand(molecule, newBond);
            executeCommand(cmd);
            newBondIds.push(newBondId);
        });

        // Select the newly pasted items
        set({ selectedAtomIds: newAtomIds, selectedBondIds: newBondIds });
    },

    executeCommand: (command: Command) => {
        const { commandManager, molecule, version } = get();
        commandManager.execute(command);
        set({ molecule: molecule, version: version + 1 });
    },

    undo: () => {
        const { commandManager, molecule, version } = get();
        if (commandManager.canUndo()) {
            commandManager.undo();
            set({ molecule: molecule, version: version + 1 });
        }
    },

    redo: () => {
        const { commandManager, molecule, version } = get();
        if (commandManager.canRedo()) {
            commandManager.redo();
            set({ molecule: molecule, version: version + 1 });
        }
    },

    setMolecule: (molecule, centerView = false) => set((state) => ({ molecule, version: state.version + 1, pendingCenter: centerView || state.pendingCenter })),
    clearPendingCenter: () => set({ pendingCenter: false }),
    setLabWare: (labware) => set({ labware }),
    addLabWare: (item) => set((state) => ({ labware: [...state.labware, item] })),
    setCommandManager: (commandManager) => set({ commandManager }),
    setVersion: (ver) => set({ version: ver }),
    setStyle: (style) => set({ style }),
    setPageOrientation: (orientation) => set({
        pageOrientation: orientation,
        pageSize: orientation === 'portrait'
            ? { width: 816, height: 1056 }
            : { width: 1056, height: 816 },
    }),
}));
