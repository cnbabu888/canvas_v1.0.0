import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Info, Beaker, ShieldAlert, Scissors, FileDown, ArrowRightLeft, Copy, Check, AlertTriangle, Atom as AtomIcon, Brain } from 'lucide-react';
import { DeepChemPanel } from '../widgets/DeepChemPanel';
import { useCanvasStore } from '../../core/StateManager';
import { ChemUtils } from '../../chem/ChemUtils';
import { ChangePropertyCommand } from '../../commands/ChangePropertyCommand';

import { ValidationEngine } from '../../chem/ValidationEngine';

export const RightPanel: React.FC = () => {
    const selectedAtomIds = useCanvasStore((state) => state.selectedAtomIds);
    const selectedBondIds = useCanvasStore((state) => state.selectedBondIds);
    const molecule = useCanvasStore((state) => state.molecule);
    const version = useCanvasStore((state) => state.version);
    const executeCommand = useCanvasStore((state) => state.executeCommand);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const retrosynthesisMode = useCanvasStore((state) => state.retrosynthesisMode);
    const setRetrosynthesisMode = useCanvasStore((state) => state.setRetrosynthesisMode);

    const [showAI, setShowAI] = useState(false);

    // Derived Selection State
    const selection = useMemo(() => {
        if (selectedAtomIds.length === 1) {
            return { type: 'atom', item: molecule.getAtom(selectedAtomIds[0]) };
        }
        if (selectedBondIds.length === 1) {
            return { type: 'bond', item: molecule.getBond(selectedBondIds[0]) };
        }
        if (selectedAtomIds.length > 1 || selectedBondIds.length > 1) {
            return { type: 'multi' };
        }
        return null;
    }, [selectedAtomIds, selectedBondIds, molecule, version]);

    // Stats
    const stats = useMemo(() => {
        return ChemUtils.calculateStats(molecule);
    }, [molecule, version]);

    // Exact Mass
    const exactMass = useMemo(() => {
        return ChemUtils.calculateExactMass(molecule);
    }, [molecule, version]);

    // SMILES
    const smiles = useMemo(() => {
        return ChemUtils.generateSMILES(molecule);
    }, [molecule, version]);

    // Safety Warnings
    const safetyWarnings = useMemo(() => {
        return ChemUtils.analyzeSafety(molecule);
    }, [molecule, version]);

    // IUPAC Name
    const iupacName = useMemo(() => {
        return 'IUPAC naming coming soon';
    }, [molecule, version]);

    // Validation Errors
    const validationErrors = useMemo(() => {
        return ValidationEngine.validate(molecule as any);
    }, [molecule, version]);

    // Copy to clipboard state
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    // Handlers
    const handleAtomChange = (prop: string, val: any, item: any) => {
        const cmd = new ChangePropertyCommand(molecule, [{
            type: 'atom',
            id: item.id,
            property: prop,
            value: val,
            oldValue: item[prop]
        }]);
        executeCommand(cmd);
    };

    const handleBondChange = (prop: string, val: any, item: any) => {
        const cmd = new ChangePropertyCommand(molecule, [{
            type: 'bond',
            id: item.id,
            property: prop,
            value: val,
            oldValue: item[prop]
        }]);
        executeCommand(cmd);
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="absolute top-16 right-4 w-80 flex flex-col max-h-[calc(100vh-120px)] select-none bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-xl overflow-hidden pointer-events-auto"
            style={{ zIndex: 100 }}
        >
            {/* Header */}
            <div className="h-10 flex items-center px-4 bg-gray-50/80 border-b border-gray-100/50 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-grab active:cursor-grabbing">
                Properties
            </div>

            {/* Content */}
            <div className="flex-1 p-5 overflow-y-auto space-y-6">

                {/* IUPAC Name */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">IUPAC Name</div>
                    <div className="text-sm text-indigo-900 font-medium break-words font-mono">
                        {iupacName || 'Structure incomplete'}
                    </div>
                </div>

                {/* Safety & Validation Alerts */}
                {(safetyWarnings.length > 0 || validationErrors.length > 0) && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 animate-fadeIn">
                        <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                            <ShieldAlert size={16} />
                            <span>Safety & Quality Alerts</span>
                        </div>
                        <div className="space-y-1">
                            {safetyWarnings.map((warning, idx) => (
                                <div key={`safe-${idx}`} className="text-xs text-red-600 bg-red-100/50 px-2 py-1 rounded">
                                    [SAFETY] {warning}
                                </div>
                            ))}
                            {validationErrors.map((err, idx) => (
                                <div
                                    key={`val-${idx}`}
                                    className="text-xs text-amber-700 bg-amber-100/50 px-2 py-1 rounded border border-amber-200 cursor-pointer hover:bg-amber-200/50 transition-colors flex items-center gap-1.5"
                                    onClick={() => {
                                        // Navigate to the error atom
                                        useCanvasStore.getState().setSelected([err.atomId], []);
                                    }}
                                    title="Click to select this atom"
                                >
                                    <AlertTriangle size={11} className="flex-shrink-0" />
                                    <span>[{err.type.toUpperCase()}] {err.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Fragmentation Analysis (Scissor Tool Only) */}
                {activeTool === 'scissor' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fadeIn shadow-sm">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-3">
                            <Scissors size={18} className="text-indigo-500" />
                            <span>Fragmentation Analysis</span>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="bg-white rounded-lg p-2 border border-slate-100 flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Parent MW</span>
                                <span className="font-mono text-slate-800 font-semibold">{stats.weight} <span className="text-xs text-slate-400 font-sans font-normal">g/mol</span></span>
                            </div>

                            {/* Fragments Analysis */}
                            {(!(molecule as any).badges || (molecule as any).badges.length === 0) ? (
                                <div className="text-xs text-slate-400 italic px-1">
                                    Click or drag across bonds to cleave molecules and analyze fragments here.
                                </div>
                            ) : (
                                <div className="space-y-2 mt-2">
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Detected Fragments</div>
                                    {(molecule as any).badges.map((badge: any, idx: number) => {
                                        // Attempt to parse MW from badge text for generic loss finding
                                        const mwMatch = badge.text.match(/([0-9.]+)/);
                                        const mw = mwMatch ? parseFloat(mwMatch[1]) : 0;
                                        const diff = stats.weight ? Math.abs(stats.weight - mw) : 0;

                                        // Simple lookup for common MS losses
                                        let lossLabel = '';
                                        if (diff > 0) {
                                            if (Math.abs(diff - 15) < 1) lossLabel = '-CH3 (15)';
                                            else if (Math.abs(diff - 17) < 1) lossLabel = '-OH (17)';
                                            else if (Math.abs(diff - 18) < 1) lossLabel = '-H2O (18)';
                                            else if (Math.abs(diff - 28) < 1) lossLabel = '-CO/C2H4 (28)';
                                            else if (Math.abs(diff - 43) < 1) lossLabel = '-C3H7/CH3CO (43)';
                                        }

                                        return (
                                            <div key={badge.id} className="bg-white rounded p-2 text-sm border border-slate-100 shadow-sm flex flex-col gap-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-indigo-600">Fragment {idx + 1}</span>
                                                    <span className="font-mono text-slate-700">{badge.text}</span>
                                                </div>
                                                {lossLabel && (
                                                    <div className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-sm self-start">
                                                        Loss: {lossLabel}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={retrosynthesisMode}
                                    onChange={(e) => setRetrosynthesisMode(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                                />
                                <ArrowRightLeft size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">Retrosynthesis Mode</span>
                            </label>

                            <button
                                onClick={() => {
                                    alert('MS Fragmentation Report generated! (Check console for raw data output)');
                                    console.log('--- MS FRAGMENTATION REPORT ---');
                                    console.log('Parent MW:', stats.weight);
                                    console.log('Fragments:', (molecule as any).badges?.map((b: any) => b.text));
                                }}
                                className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                            >
                                <FileDown size={14} />
                                Export MS Report
                            </button>
                        </div>
                    </div>
                )}

                {!selection ? (
                    // Empty Selection - Document Properties
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center space-x-2 text-gray-700 mb-1">
                            <Settings size={18} className="text-gray-400" />
                            <span className="font-semibold text-sm">Document Settings</span>
                        </div>
                        <div className="text-sm space-y-3 pl-1">
                            {/* Toggles styled as modern switches could go here */}
                            <div className="flex justify-between items-center group">
                                <span className="text-gray-500 group-hover:text-gray-700 transition-colors">Grid</span>
                                <input type="checkbox" defaultChecked className="rounded text-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-gray-500 group-hover:text-gray-700 transition-colors">Snap to Grid</span>
                                <input type="checkbox" defaultChecked className="rounded text-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-gray-500 group-hover:text-gray-700 transition-colors">Show Rulers</span>
                                <input type="checkbox" defaultChecked className="rounded text-indigo-500 focus:ring-indigo-500" />
                            </div>
                        </div>
                    </div>
                ) : selection.type === 'atom' && selection.item ? (
                    // Atom Properties
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center space-x-2 text-gray-700 mb-1">
                            <Beaker size={18} className="text-gray-400" />
                            <span className="font-semibold text-sm">Atom Properties</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Element</label>
                                <input
                                    type="text"
                                    value={(selection.item as any).element}
                                    onChange={(e) => handleAtomChange('element', e.target.value, selection.item)}
                                    className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Charge</label>
                                <input
                                    type="number"
                                    value={(selection.item as any).charge}
                                    onChange={(e) => handleAtomChange('charge', parseInt(e.target.value) || 0, selection.item)}
                                    className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Coordinates</label>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 font-mono">
                                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-100">X: {(selection.item as any).pos.x.toFixed(1)}</div>
                                    <div className="bg-gray-50 px-2 py-1 rounded border border-gray-100">Y: {(selection.item as any).pos.y.toFixed(1)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : selection.type === 'bond' && selection.item ? (
                    // Bond Properties
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center space-x-2 text-gray-700 mb-1">
                            <Settings size={18} className="text-gray-400" />
                            <span className="font-semibold text-sm">Bond Properties</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Type</label>
                                <select
                                    value={(selection.item as any).type}
                                    onChange={(e) => handleBondChange('type', e.target.value, selection.item)}
                                    className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                >
                                    <option value="SINGLE">Single</option>
                                    <option value="DOUBLE">Double</option>
                                    <option value="TRIPLE">Triple</option>
                                    <option value="WEDGE_SOLID">Wedge (Solid)</option>
                                    <option value="WEDGE_HASH">Wedge (Hash)</option>
                                    <option value="DATIVE">Dative</option>
                                    <option value="WAVY">Wavy</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Multi
                    <div className="text-sm text-gray-500 flex flex-col items-center justify-center h-40 opacity-70">
                        <Info size={32} className="mb-3 text-gray-300" />
                        <p>Multiple items selected</p>
                    </div>
                )}
            </div>

            {/* Live Properties Footer */}
            <div className="bg-white/40 backdrop-blur-md border-t border-white/20 p-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 justify-between">
                    <div className="flex items-center gap-1.5">
                        <AtomIcon size={13} className="text-indigo-500" />
                        Live Properties
                    </div>
                    <button
                        onClick={() => setShowAI(!showAI)}
                        title="AI Intelligence"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '2px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: showAI ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(79,70,229,0.08)',
                            color: showAI ? 'white' : '#6366f1',
                            fontSize: '10px', fontWeight: 700, transition: 'all 200ms',
                        }}
                    >
                        <Brain size={10} />
                        AI
                    </button>
                </div>
                {showAI && <DeepChemPanel onClose={() => setShowAI(false)} />}

                {/* Formula row with copy */}
                <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2 mb-2 border border-indigo-100">
                    <div>
                        <div className="text-[10px] text-indigo-400 uppercase font-semibold tracking-wide">Formula</div>
                        <div className="font-mono text-sm font-bold text-indigo-800">{stats.formula || '—'}</div>
                    </div>
                    {stats.formula && (
                        <button
                            onClick={() => copyToClipboard(stats.formula, 'formula')}
                            className="p-1 rounded hover:bg-indigo-200/50 transition-colors text-indigo-400 hover:text-indigo-600"
                            title="Copy Formula"
                        >
                            {copiedField === 'formula' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                    )}
                </div>

                {/* MW + Exact Mass side by side */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                        <div className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wide">MW</div>
                        <div className="font-mono text-sm font-bold text-emerald-800">{stats.weight || '—'}</div>
                    </div>
                    <div className="bg-violet-50 rounded-lg px-3 py-2 border border-violet-100">
                        <div className="text-[10px] text-violet-400 uppercase font-semibold tracking-wide">Exact Mass</div>
                        <div className="font-mono text-sm font-bold text-violet-800">{exactMass || '—'}</div>
                    </div>
                </div>

                {/* Atom/Bond counts */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100 text-center">
                        <span className="text-xs text-gray-500 font-medium">Atoms: </span>
                        <span className="text-xs font-bold text-gray-700">{stats.atoms}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100 text-center">
                        <span className="text-xs text-gray-500 font-medium">Bonds: </span>
                        <span className="text-xs font-bold text-gray-700">{stats.bonds}</span>
                    </div>
                </div>

                {/* SMILES row with copy */}
                {smiles && (
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        <div className="min-w-0 flex-1 mr-2">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">SMILES</div>
                            <div className="font-mono text-xs text-slate-700 truncate" title={smiles}>{smiles}</div>
                        </div>
                        <button
                            onClick={() => copyToClipboard(smiles, 'smiles')}
                            className="p-1 rounded hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0"
                            title="Copy SMILES"
                        >
                            {copiedField === 'smiles' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
