import React, { useState } from 'react';
import { useCanvasStore } from '../../core/StateManager';
import { STYLES } from '../../styles/StyleManager';
import { FileIO } from '../../utils/FileIO';
import { ChemExports } from '../../chem/ChemExports';
import { SvgRenderer } from '../../core/renderer/SvgRenderer';
import { Molecule } from '../../entities/Molecule';
import { Vec2 } from '../../entities/Vec2';
import { CommandManager } from '../../commands/CommandManager';
import { LayoutCommand } from '../../commands/LayoutCommand';
import { ValidationEngine } from '../../chem/ValidationEngine';


import {
    FilePlus2, FolderOpen, Save,
    ZoomIn, ZoomOut, RotateCcw,
    FileJson, FileImage, Copy,
    Loader2, Search, Sparkles,
    Bold, Italic, Eraser, Trash2,
    FlaskConical, AlertCircle, Focus,
    Stethoscope, AlignVerticalJustifyCenter,
    FileText
} from 'lucide-react';
import { RemoveElementsCommand } from '../../commands/RemoveElementsCommand';
import { MoveElementsCommand } from '../../commands/MoveElementsCommand';

export const TopHeader: React.FC = () => {
    const {
        molecule, zoom, offset, style,
        activeTool, scissorMode, setScissorMode,
        setMolecule, setZoom, setOffset, setCommandManager, executeCommand, setStyle, pageSize,
        setActiveTool, setValidationErrors, validationErrors
    } = useCanvasStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Pre-load RDKit WASM in background on first mount
    React.useEffect(() => {

    }, []);

    // AI tool (lightning bolt) → focus the molecule search bar
    React.useEffect(() => {
        if (activeTool === 'ai') {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
            setActiveTool('select'); // Return to select after triggering
        }
    }, [activeTool]);

    const handleOmniSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError(null);

        try {
            const searchRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(searchQuery)}/cids/JSON`);
            const searchData = await searchRes.json();

            if (!searchData.IdentifierList?.CID?.[0]) {
                throw new Error('Compound not found');
            }

            const cid = searchData.IdentifierList.CID[0];
            const recordRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/JSON?record_type=2d`);
            const recordData = await recordRes.json();

            if (!recordData.PC_Compounds?.[0]) {
                throw new Error('No structure data found');
            }

            const compound = recordData.PC_Compounds[0];
            const atoms = compound.atoms;
            const bonds = compound.bonds;
            const coords = compound.coords?.[0]?.conformers?.[0];

            if (!atoms || !coords) throw new Error('Invalid structure data');

            const newMol = new Molecule();
            const idMap = new Map<number, number>();

            const getSymbol = (z: number) => {
                const map: Record<number, string> = { 1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I' };
                return map[z] || 'C';
            };

            // Phase 1: Filter atoms to ignore Explicit Hydrogens
            const validAids = new Set<number>();
            atoms.aid.forEach((aid: number, index: number) => {
                const z = atoms.element[index];
                const element = getSymbol(z);

                // Keep all atoms except terminal Hydrogens
                if (element !== 'H') {
                    validAids.add(aid);
                    const x = coords.x[index] * 40;
                    const y = -coords.y[index] * 40;

                    const atom = newMol.addAtom({
                         label: element,
                         position: new Vec2(x + 400, y + 300)
                    });
                    idMap.set(aid, atom.id);
                }
            });

            if (bonds) {
                bonds.aid1.forEach((aid1: number, index: number) => {
                    const aid2 = bonds.aid2[index];
                    const order = bonds.order[index];

                    // Only connect valid heavy atoms
                    if (validAids.has(aid1) && validAids.has(aid2)) {
                        const id1 = idMap.get(aid1);
                        const id2 = idMap.get(aid2);

                        if (id1 !== undefined && id2 !== undefined) {
                            let type: number = 1; // SINGLE
                            if (order === 2) type = 2; // DOUBLE
                            if (order === 3) type = 3; // TRIPLE

                            newMol.addBond({ begin: id1, end: id2, type });
                        }
                    }
                });
            }

            setMolecule(newMol, true);
            setSearchQuery('');
        } catch (err: any) {
            console.error('OmniSearch Error:', err);
            setSearchError(err.message || 'Failed to fetch');
        } finally {
            setIsSearching(false);
        }
    };

    // -- File Handlers --

    const handleNew = () => {
        if (confirm('Create new file? Unsaved changes will be lost.')) {
            setMolecule(new Molecule());
            setCommandManager(new CommandManager());
            setZoom(1);
            setOffset(new Vec2(0, 0) as any);
        }
    };

    const handleOpen = async () => {
        try {
            const { content } = await FileIO.openFile('.chemora,.json');
            const data = JSON.parse(content);

            const mol = new Molecule();

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

            data.molecule.bonds.forEach(([_id, bondData]: any) => {
                mol.addBond({
                    begin: bondData.atom1 || bondData.begin,
                    end: bondData.atom2 || bondData.end,
                    type: bondData.order || bondData.type,
                });
            });

            setMolecule(mol);
            setCommandManager(new CommandManager());

            if (data.view) {
                setZoom(data.view.zoom || 1);
                if (data.view.offset) {
                    setOffset(new Vec2(data.view.offset.x, data.view.offset.y) as any);
                }
            }

        } catch (err) {
            console.error('Failed to open file:', err);
            alert('Error opening file: ' + err);
        }
    };

    const handleSave = () => {
        const json = FileIO.saveToChemora(molecule, { zoom, offset });
        FileIO.saveFile(json, 'molecule.chemora', 'application/json');
    };

    // -- Export Handlers --

    const handleExportSMILES = () => {
        const smiles = ChemExports.toSMILES(molecule);
        FileIO.copyToClipboard(smiles);
        alert(`SMILES copied to clipboard:\n${smiles}`);
    };

    const handleExportMOL = () => {
        const mol = ChemExports.toMOL(molecule);
        FileIO.saveFile(mol, 'molecule.mol', 'chemical/x-mdl-molfile');
    };

    const handleExportSVG = () => {
        const svg = SvgRenderer.render(molecule);
        FileIO.saveFile(svg, 'molecule.svg', 'image/svg+xml');
    };

    const handleClean = async () => {
        if (!molecule || !molecule.atoms || molecule.atoms.size === 0) return;





        // Use Indigo for structure cleanup
        _runCleanAnimation(new Map<number, Vec2>());
    };

    const _runCleanAnimation = (targetPositions: Map<number, Vec2>) => {
        const command = new LayoutCommand(molecule);
        // Cast or convert for command which likely expects string keys for historical compatibility
        const stringTargetPos = new Map<string, Vec2>();
        targetPositions.forEach((v, k) => stringTargetPos.set(k.toString(), v));
        command.setNewPositions(stringTargetPos as any);

        // Animation state
        const duration = 350; // 350ms smooth transition
        const startTime = performance.now();
        const initialPositions = new Map<number, Vec2>();

        molecule.atoms.forEach((atom, id) => {
            initialPositions.set(id, atom.position.clone());
        });

        const animate = (time: number) => {
            let progress = (time - startTime) / duration;
            if (progress > 1) progress = 1;

            // Ease out back (springy)
            const c1 = 1.70158, c3 = c1 + 1;
            const ease = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

            const interpolatedMol = new Molecule();
            interpolatedMol.bonds = molecule.bonds;
            interpolatedMol.adjacency = molecule.adjacency;

            molecule.atoms.forEach((atom, id) => {
                const startPos = initialPositions.get(id)!;
                const targetPos = targetPositions.get(id) || startPos;

                const newX = startPos.x + (targetPos.x - startPos.x) * ease;
                const newY = startPos.y + (targetPos.y - startPos.y) * ease;

                interpolatedMol.addAtom({
                    label: atom.label,
                    position: new Vec2(newX, newY),
                    charge: atom.charge
                });
            });

            setMolecule(interpolatedMol);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                executeCommand(command);
            }
        };

        requestAnimationFrame(animate);
    };

    const handleCheck = () => {
        if (!molecule) return;
        const errors = ValidationEngine.validate(molecule);
        setValidationErrors(errors);
        if (errors.length > 0) {
            console.log(`Validation failed: ${errors.length} errors found.`);
        } else {
            alert('Structure is valid!');
        }
    };

    const handleAlign = () => {
        if (!molecule) return;
        const moves = ValidationEngine.alignReaction(molecule);
        if (moves.length === 0) return;

        // Execute moves for each atom
        // For efficiency, we'll just update the whole molecule once
        const newMol = molecule.clone();
        moves.forEach(m => {
            const atom = newMol.atoms.get(m.atomId);
            if (atom) atom.position = m.newPos;
        });
        
        // Save to history and update
        useCanvasStore.getState().saveToHistory();
        setMolecule(newMol);
    };

    const handleCenter = () => {
        if (!molecule || molecule.atoms.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        molecule.atoms.forEach(atom => {
            if (atom.pos.x < minX) minX = atom.pos.x;
            if (atom.pos.x > maxX) maxX = atom.pos.x;
            if (atom.pos.y < minY) minY = atom.pos.y;
            if (atom.pos.y > maxY) maxY = atom.pos.y;
        });

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const targetX = pageSize.width / 2;
        const targetY = pageSize.height / 2;

        const delta = new Vec2(targetX - cx, targetY - cy);

        if (delta.length() > 0.1) {
            const atomIds = Array.from(molecule.atoms.keys());
            const cmd = new MoveElementsCommand(molecule, atomIds, delta);
            executeCommand(cmd);
        }
    };

    const handleClear = () => {
        if (!molecule || molecule.atoms.size === 0) return;
        if (confirm('Clear the entire canvas?')) {
            const atomIds = Array.from(molecule.atoms.keys());
            const bondIds = Array.from(molecule.bonds.keys());
            const cmd = new RemoveElementsCommand(molecule, atomIds, bondIds);
            executeCommand(cmd);
        }
    };

    const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStyle = STYLES[e.target.value];
        if (newStyle) setStyle(newStyle);
    };

    // Icon button helper — with custom tooltip and blue hover animation
    const IconBtn = ({ icon: Icon, title, onClick, accent, size = 20 }: {
        icon: React.ElementType; title: string; onClick?: () => void; accent?: boolean; size?: number;
    }) => {
        const [hovered, setHovered] = React.useState(false);
        return (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
                <button
                    style={{
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid transparent',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        padding: 0,
                        background: 'transparent',
                        color: accent ? '#4f46e5' : '#555',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'border-color 150ms',
                    }}
                    onClick={onClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {/* Blue circle hover animation */}
                    <span
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            background: accent
                                ? 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(79,70,229,0) 70%)'
                                : 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 70%)',
                            transform: hovered ? 'scale(1)' : 'scale(0)',
                            opacity: hovered ? 1 : 0,
                            transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1), opacity 200ms',
                            pointerEvents: 'none',
                        }}
                    />
                    <Icon size={size} strokeWidth={1.5} style={{ position: 'relative', zIndex: 1 }} />
                </button>
                {/* Custom Tooltip */}
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '6px',
                        padding: '4px 10px',
                        background: '#1e293b',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 500,
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        whiteSpace: 'nowrap' as const,
                        zIndex: 99999,
                        pointerEvents: 'none' as const,
                        opacity: hovered ? 1 : 0,
                        transition: 'opacity 150ms',
                    }}
                >
                    {title}
                    {/* Tooltip arrow */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '8px',
                            height: '8px',
                            background: '#1e293b',
                        }}
                    />
                </div>
            </div>
        );
    };

    // Separator — thin vertical divider
    const Sep = () => <div style={{ width: '1px', height: '24px', background: '#ccc', margin: '0 5px' }} />;

    return (
        <div className="flex flex-col select-none" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", position: 'relative', zIndex: 50 }}>
            {/* Menu Bar — compact, native feel */}
            <div style={{ height: '24px', display: 'flex', alignItems: 'center', padding: '0 8px', background: '#fff', borderBottom: '1px solid #d0d0d0', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                    <button style={{ display: 'inline-flex', padding: '1px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#555', fontWeight: 500, fontSize: '12px', borderRadius: '2px' }} onClick={handleNew} onMouseEnter={e => e.currentTarget.style.background = '#e8e8e8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>File</button>
                    <button style={{ display: 'inline-flex', padding: '1px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#555', fontWeight: 500, fontSize: '12px', borderRadius: '2px' }} onClick={() => {
                        const store = useCanvasStore.getState();
                        const atomIds = Array.from(store.molecule.atoms.keys());
                        const bondIds = Array.from(store.molecule.bonds.keys());
                        store.setSelected(atomIds, bondIds);
                    }} onMouseEnter={e => e.currentTarget.style.background = '#e8e8e8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Edit</button>
                    <button style={{ display: 'inline-flex', padding: '1px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#555', fontWeight: 500, fontSize: '12px', borderRadius: '2px' }} onMouseEnter={e => e.currentTarget.style.background = '#e8e8e8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>View</button>
                    <Sep />
                    <button style={{ display: 'inline-flex', padding: '1px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#4f46e5', fontWeight: 600, fontSize: '12px', borderRadius: '2px' }} onClick={handleExportSMILES} onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Copy SMILES</button>
                    <button style={{ display: 'inline-flex', padding: '1px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#666', fontWeight: 500, fontSize: '12px', borderRadius: '2px' }} onClick={handleExportMOL} onMouseEnter={e => e.currentTarget.style.background = '#e8e8e8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Export MOL</button>
                    <button style={{ display: 'inline-flex', padding: '1px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#666', fontWeight: 500, fontSize: '12px', borderRadius: '2px' }} onClick={handleExportSVG} onMouseEnter={e => e.currentTarget.style.background = '#e8e8e8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Export SVG</button>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#aaa', fontWeight: 500, letterSpacing: '0.5px' }}>
                    Chemora Canvas v3.3
                </div>
            </div>

            {/* Icon Toolbar Row — flat grouped like ChemDraw */}
            <div style={{ height: '40px', display: 'flex', alignItems: 'center', padding: '0 8px', gap: '2px', background: '#f0f0f0', borderBottom: '1px solid #d0d0d0' }}>
                {/* File Group */}
                <IconBtn icon={FilePlus2} title="New File" onClick={handleNew} />
                <IconBtn icon={FolderOpen} title="Open File" onClick={handleOpen} />
                <IconBtn icon={Save} title="Save" onClick={handleSave} />

                <Sep />

                {/* Zoom Group */}
                <IconBtn icon={ZoomIn} title="Zoom In" onClick={() => setZoom(zoom * 1.1)} />
                <IconBtn icon={ZoomOut} title="Zoom Out" onClick={() => setZoom(zoom * 0.9)} />
                <IconBtn icon={RotateCcw} title="Reset View" onClick={() => { setZoom(1); setOffset(new Vec2(0, 0) as any); }} />
                <IconBtn icon={Focus} title="Center Structure" onClick={handleCenter} accent />

                <Sep />

                {/* Export Group */}
                <IconBtn icon={FileJson} title="Export JSON" onClick={handleSave} accent />
                <IconBtn icon={FileImage} title="Export SVG" onClick={handleExportSVG} accent />
                <IconBtn icon={Copy} title="Copy SMILES" onClick={handleExportSMILES} accent />

                <Sep />

                {/* Clean Tool */}
                <IconBtn
                    icon={Sparkles}
                    title="Clean Structure"
                    onClick={handleClean}
                    accent
                />
                <IconBtn 
                    icon={Stethoscope} 
                    title="Check Structure (Valency)" 
                    onClick={handleCheck} 
                    accent={validationErrors.length > 0} 
                />
                <IconBtn 
                    icon={AlignVerticalJustifyCenter} 
                    title="Align Reaction" 
                    onClick={handleAlign} 
                    accent 
                />

                <Sep />

                {/* Style Selector — compact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 6px', height: '26px' }}>
                    <FileText size={12} style={{ color: '#999' }} />
                    <span style={{ fontSize: '11px', color: '#777', fontWeight: 500 }}>Style:</span>
                    <select
                        style={{ fontSize: '11px', background: 'transparent', outline: 'none', cursor: 'pointer', color: '#555', fontWeight: 500, border: 'none', paddingRight: '12px' }}
                        value={style?.name || 'Chemora Modern'}
                        onChange={handleStyleChange}
                    >
                        {Object.keys(STYLES).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>

                <Sep />

                {/* Text Formatting */}
                <IconBtn icon={Bold} title="Bold" />
                <IconBtn icon={Italic} title="Italic" />
                <IconBtn icon={Eraser} title="Clear Formatting" />
                <IconBtn icon={Trash2} title="Clear Canvas" onClick={handleClear} />

                <Sep />

                <IconBtn icon={FlaskConical} title="Add Lab Equipment" accent onClick={() => {
                    const { addLabWare, zoom, offset } = useCanvasStore.getState();
                    addLabWare({
                        id: Math.random().toString(36),
                        type: 'beaker',
                        x: -offset.x + 400 / zoom,
                        y: -offset.y + 300 / zoom,
                        width: 50,
                        height: 70,
                        color: 'blue'
                    });
                }} />

                {/* Scissor Context Bar */}
                {activeTool === 'scissor' && (
                    <>
                        <Sep />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', background: '#eef2ff', borderRadius: '4px', height: '28px', border: '1px solid #c7d2fe' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5' }}>Cleavage Mode:</span>
                            <button
                                onClick={() => setScissorMode('homolytic')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer',
                                    fontSize: '11px', fontWeight: scissorMode === 'homolytic' ? 700 : 500,
                                    color: scissorMode === 'homolytic' ? '#4f46e5' : '#64748b'
                                }}
                            >
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid', borderColor: scissorMode === 'homolytic' ? '#4f46e5' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {scissorMode === 'homolytic' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f46e5' }} />}
                                </div>
                                Homolytic
                            </button>
                            <button
                                onClick={() => setScissorMode('heterolytic')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer',
                                    fontSize: '11px', fontWeight: scissorMode === 'heterolytic' ? 700 : 500,
                                    color: scissorMode === 'heterolytic' ? '#4f46e5' : '#64748b'
                                }}
                            >
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid', borderColor: scissorMode === 'heterolytic' ? '#4f46e5' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {scissorMode === 'heterolytic' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f46e5' }} />}
                                </div>
                                Heterolytic
                            </button>
                        </div>
                    </>
                )}

                {/* Omni-Search Bar (Gemini Style) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#fff',
                    borderRadius: '16px',
                    border: searchError ? '1px solid #ef4444' : '1px solid #e0e0e0',
                    padding: '2px 4px 2px 12px',
                    marginLeft: 'auto',
                    marginRight: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    width: '260px',
                    transition: 'border-color 200ms',
                }}>
                    <input
                        ref={searchInputRef}
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: '12px',
                            color: '#333',
                            background: 'transparent',
                        }}
                        placeholder="Search Name or SMILES..."
                        value={searchQuery}
                        onChange={e => {
                            setSearchQuery(e.target.value);
                            setSearchError(null);
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleOmniSearch()}
                    />
                    {searchError && (
                        <div title={searchError} style={{ color: '#ef4444', marginRight: '6px', display: 'flex' }}>
                            <AlertCircle size={14} />
                        </div>
                    )}
                    <button
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '12px',
                            background: '#4f46e5',
                            color: '#fff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            opacity: searchQuery ? 1 : 0.6,
                        }}
                        onClick={handleOmniSearch}
                        disabled={isSearching || !searchQuery}
                    >
                        {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

