import React, { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { LeftToolbar } from './components/layout/LeftToolbar';
import { RightPanel } from './components/layout/RightPanel';
import { TopHeader } from './components/layout/TopHeader';
import { Canvas } from './core/Canvas';
import { useCanvasStore } from './core/StateManager';
import { FileIO } from './utils/FileIO';
import { Molecule } from './entities/Molecule';
import { Vec2 } from './entities/Vec2';

const App: React.FC = () => {
    const store = useCanvasStore();
    const { setMolecule, setZoom, setOffset } = store;
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial load from LocalStorage
    useEffect(() => {
        try {
            const savedData = localStorage.getItem('chemora_autosave');
            if (savedData) {
                const data = JSON.parse(savedData);
                const mol = new Molecule();

                if (data.molecule && data.molecule.atoms) {
                    data.molecule.atoms.forEach(([_id, atomData]: any) => {
                        const pos = new Vec2(atomData.pos.x, atomData.pos.y);
                        const atom = mol.addAtom({
                            label: atomData.element || atomData.label,
                            position: pos,
                            charge: atomData.charge || 0,
                            valence: atomData.valence || 4,
                        });
                        atom.hydrogenCount = atomData.hydrogenCount || 0;
                    });
                }

                if (data.molecule && data.molecule.bonds) {
                    data.molecule.bonds.forEach(([_id, bondData]: any) => {
                        mol.addBond({
                            begin: bondData.atom1 || bondData.begin,
                            end: bondData.atom2 || bondData.end,
                            type: bondData.order || bondData.type,
                        });
                    });
                }

                setMolecule(mol);

                if (data.view) {
                    setZoom(data.view.zoom || 1);
                    if (data.view.offset) {
                        setOffset(new Vec2(data.view.offset.x, data.view.offset.y) as any);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load autosave:', err);
        } finally {
            setIsLoaded(true);
        }
    }, [setMolecule, setZoom, setOffset]);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = document.activeElement?.tagName ?? '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const currentStore = useCanvasStore.getState();
            const ctrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            // Debug log
            console.log(`[Shortcut] Key: ${key}, Ctrl: ${ctrl}`);

            // ── Ctrl/Cmd combos ──
            if (ctrl) {
                switch (key) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            console.log('[Shortcut] Redo');
                            currentStore.redo();
                        } else {
                            console.log('[Shortcut] Undo');
                            currentStore.undo();
                        }
                        return;
                    case 'y':
                        e.preventDefault();
                        console.log('[Shortcut] Redo');
                        currentStore.redo();
                        return;
                    case 'a':
                        e.preventDefault();
                        console.log('[Shortcut] Select All');
                        currentStore.selectAll();
                        return;
                    case 'c':
                        e.preventDefault();
                        console.log('[Shortcut] Copy');
                        currentStore.copySelected();
                        return;
                    case 'x':
                        e.preventDefault();
                        console.log('[Shortcut] Cut');
                        currentStore.copySelected();
                        currentStore.deleteSelected();
                        return;
                    case 'v':
                        e.preventDefault();
                        console.log('[Shortcut] Paste');
                        currentStore.pasteClipboard(new Vec2(20, 20));
                        return;
                }
            }

            // ── Tool shortcuts ──
            const setTool = (toolId: string, subToolId?: string) => {
                console.log(`[Shortcut] Switch to Tool: ${toolId}`);
                currentStore.setActiveTool(toolId, subToolId);
                currentStore.setActivePopup(null);
            };

            switch (key) {
                case 'escape':
                    setTool('select');
                    currentStore.clearSelection();
                    break;
                case 'v': setTool('select'); break;
                case 'l': setTool('lasso'); break;
                case 'b': setTool('bond'); break;
                case 'r': setTool('ring'); break;
                case 't': setTool('text'); break;
                case 'm': setTool('mechanism'); break;
                case 'w': setTool('reaction'); break;
                case 'a': setTool('attributes'); break;
                case 'x': setTool('scissor'); break;
                case 'e':
                case 'q': setTool('erase'); break;

                case 'delete':
                case 'backspace':
                    e.preventDefault();
                    if (currentStore.selectedAtoms.size > 0 || currentStore.selectedBonds.size > 0) {
                        console.log('[Shortcut] Delete Selected');
                        currentStore.deleteSelected();
                    }
                    break;
                case '+':
                case '=':
                    currentStore.setZoom(currentStore.zoom * 1.15);
                    break;
                case '-':
                    currentStore.setZoom(currentStore.zoom / 1.15);
                    break;
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isLoaded]);

    // Auto-save on molecule changes
    useEffect(() => {
        if (!isLoaded) return;
        const timeout = setTimeout(() => {
            const json = FileIO.saveToChemora(useCanvasStore.getState().molecule, useCanvasStore.getState());
            localStorage.setItem('chemora_autosave', json);
        }, 1000);
        return () => clearTimeout(timeout);
    }, [useCanvasStore.getState().molecule, useCanvasStore.getState().version, isLoaded]);

    return (
        <MainLayout
            topHeader={<TopHeader />}
            leftPanel={<LeftToolbar />}
            rightPanel={<RightPanel />}
        >
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                height: '100%',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <Canvas width={1920} height={1080} />
            </div>
        </MainLayout>
    );
};

export default App;
