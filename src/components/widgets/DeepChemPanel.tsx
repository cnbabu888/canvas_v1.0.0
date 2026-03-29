// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { ChemUtils } from '../../chem/ChemUtils';
import { Brain, Zap, Shield, Droplets, FlaskConical, X, RefreshCw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// ── Local Heuristic Bio-Activity Predictions ──
// These are ML-inspired scoring heuristics based on structural features.
// A real DeepChem integration would POST to a Python/FastAPI backend.

interface Prediction {
    label: string;
    score: number; // 0–1
    level: 'low' | 'medium' | 'high';
    detail: string;
}

interface PredictionResult {
    toxicity: Prediction;
    druglikeness: Prediction;
    solubility: Prediction;
    bioavailability: Prediction;
    bindingAffinityHint: string;
    timestamp: number;
}

function computeLocalPredictions(molecule: any): PredictionResult | null {
    if (!molecule || molecule.atoms.size === 0) return null;

    const props = ChemUtils.calculateProperties(molecule);
    const stats = ChemUtils.calculateStats(molecule);
    const { logP, tpsa, hbd, hba } = props;
    const { atoms, bonds } = stats;

    // ── Toxicity heuristic (based on reactive groups, logP extremes) ──
    let toxScore = 0.15;
    if (logP > 5) toxScore += 0.25;
    if (logP < 0) toxScore += 0.10;
    if (tpsa > 140) toxScore += 0.15;
    if (hbd > 5) toxScore += 0.10;
    // Check for halogens (rough proxy for potential toxicity)
    molecule.atoms.forEach((a: any) => {
        if (['Cl', 'Br', 'I'].includes(a.element)) toxScore += 0.08;
        if (a.element === 'N' && a.charge === 1) toxScore += 0.05;
    });
    toxScore = Math.min(0.95, toxScore);

    // ── Drug-likeness: Lipinski + Veber + Ghose ──
    let lipinskiPass = logP <= 5 && stats.weight <= 500 && hbd <= 5 && hba <= 10;
    let veberPass = tpsa <= 140 && bonds <= 10;
    let dlScore = 0;
    if (lipinskiPass) dlScore += 0.5;
    if (veberPass) dlScore += 0.25;
    if (logP >= 0 && logP <= 3) dlScore += 0.15;
    if (atoms >= 6 && atoms <= 40) dlScore += 0.10;
    dlScore = Math.min(0.97, dlScore);

    // ── Aqueous Solubility (ESOL proxy) ──
    // ESOL: log S ≈ 0.16 - 0.63*cLogP - 0.0062*MW + 0.066*RB - 0.74*AP
    const mw = stats.weight;
    const logS = 0.16 - 0.63 * logP - 0.0062 * mw + 0.066 * (bonds * 0.5);
    const solScore = Math.max(0, Math.min(1, (logS + 6) / 8)); // Normalize

    // ── Bioavailability (F20 rule of 5 proxy) ──
    let bScore = dlScore * 0.8;
    if (tpsa < 90) bScore += 0.1;
    if (hbd < 3) bScore += 0.05;
    bScore = Math.min(0.95, bScore);

    // ── Binding Affinity Hint ──
    let hint = 'Moderate binding potential';
    if (dlScore > 0.75 && logP > 1 && logP < 4) hint = 'High binding potential — good cLogP & MW for protein binding';
    else if (logP > 5) hint = 'High lipophilicity — may bind non-selectively';
    else if (dlScore < 0.3) hint = 'Poor drug-likeness — limited binding applicability';
    else if (tpsa > 120) hint = 'High TPSA — may have low membrane permeability';

    const toLevel = (s: number): 'low' | 'medium' | 'high' =>
        s < 0.35 ? 'low' : s < 0.65 ? 'medium' : 'high';

    return {
        toxicity: {
            label: 'Toxicity Risk',
            score: toxScore,
            level: toLevel(toxScore),
            detail: toxScore < 0.3 ? 'Low predicted toxicity risk' : toxScore < 0.6 ? 'Moderate — check halogens/reactive groups' : 'High risk — multiple toxic pharmacophores',
        },
        druglikeness: {
            label: 'Drug-likeness',
            score: dlScore,
            level: toLevel(dlScore),
            detail: lipinskiPass ? 'Passes Lipinski Ro5' : 'Violates Lipinski Ro5',
        },
        solubility: {
            label: 'Aqueous Solubility',
            score: solScore,
            level: toLevel(solScore),
            detail: `ESOL log S ≈ ${logS.toFixed(2)} (${logS > -2 ? 'Highly soluble' : logS > -4 ? 'Moderately soluble' : 'Poorly soluble'})`,
        },
        bioavailability: {
            label: 'Oral Bioavailability',
            score: bScore,
            level: toLevel(bScore),
            detail: bScore > 0.65 ? 'Good predicted oral bioavailability' : bScore > 0.35 ? 'Moderate — may need formulation' : 'Low — likely poor oral absorption',
        },
        bindingAffinityHint: hint,
        timestamp: Date.now(),
    };
}

const ScoreBar = ({ score, level }: { score: number; level: 'low' | 'medium' | 'high' }) => {
    const colors: Record<string, string> = {
        low: '#22c55e',
        medium: '#f59e0b',
        high: '#ef4444',
    };
    return (
        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
                height: '100%',
                width: `${score * 100}%`,
                background: colors[level],
                borderRadius: '2px',
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }} />
        </div>
    );
};

interface DeepChemPanelProps {
    onClose: () => void;
}

export const DeepChemPanel: React.FC<DeepChemPanelProps> = ({ onClose }) => {
    const molecule = useCanvasStore((state) => state.molecule);
    const version = useCanvasStore((state) => (state as any).version);
    const [predictions, setPredictions] = useState<PredictionResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    const runPrediction = useCallback(() => {
        if (!molecule || molecule.atoms.size === 0) {
            setPredictions(null);
            return;
        }
        setIsLoading(true);
        // Simulate async inference (1 second)
        setTimeout(() => {
            const result = computeLocalPredictions(molecule);
            setPredictions(result);
            setIsLoading(false);
        }, 800);
    }, [molecule]);

    // Auto-run on molecule change
    useEffect(() => {
        if (molecule && molecule.atoms.size > 1) {
            runPrediction();
        } else {
            setPredictions(null);
        }
    }, [molecule?.atoms?.size, version]);

    const levelColor = (level: 'low' | 'medium' | 'high', type: 'toxicity' | 'other') => {
        if (type === 'toxicity') {
            return { low: '#16a34a', medium: '#d97706', high: '#dc2626' }[level];
        }
        return { low: '#dc2626', medium: '#d97706', high: '#16a34a' }[level];
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '96px',
            right: '240px',
            width: '280px',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            zIndex: 60,
            overflow: 'hidden',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Brain size={16} style={{ color: 'white' }} />
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>AI Intelligence</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>DeepChem Heuristics</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={runPrediction}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'white', display: 'flex' }}
                        title="Re-run predictions"
                    >
                        {isLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                    </button>
                    <button
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'white', display: 'flex' }}
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            <div style={{ padding: '12px 14px', maxHeight: '420px', overflowY: 'auto' }}>
                {(!molecule || molecule.atoms.size < 2) ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '11px' }}>
                        <FlaskConical size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                        Draw a structure to run predictions
                    </div>
                ) : isLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5', margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Running DeepChem analysis…</div>
                    </div>
                ) : predictions ? (
                    <>
                        {/* Prediction Cards */}
                        {([
                            { key: 'toxicity', data: predictions.toxicity, icon: Shield, type: 'toxicity' as const },
                            { key: 'druglikeness', data: predictions.druglikeness, icon: Zap, type: 'other' as const },
                            { key: 'solubility', data: predictions.solubility, icon: Droplets, type: 'other' as const },
                            { key: 'bioavailability', data: predictions.bioavailability, icon: Brain, type: 'other' as const },
                        ]).map(({ key, data, icon: Icon, type }) => (
                            <div key={key} style={{ marginBottom: '8px' }}>
                                <button
                                    onClick={() => setExpandedKey(expandedKey === key ? null : key)}
                                    style={{
                                        width: '100%',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        textAlign: 'left',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Icon size={11} style={{ color: '#64748b' }} />
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>{data.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 700,
                                                color: levelColor(data.level, type),
                                                padding: '1px 6px',
                                                background: `${levelColor(data.level, type)}18`,
                                                borderRadius: '8px',
                                            }}>
                                                {Math.round(data.score * 100)}%
                                            </span>
                                            {expandedKey === key ? <ChevronUp size={10} style={{ color: '#94a3b8' }} /> : <ChevronDown size={10} style={{ color: '#94a3b8' }} />}
                                        </div>
                                    </div>
                                    <ScoreBar score={data.score} level={data.level} />
                                </button>
                                {expandedKey === key && (
                                    <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
                                        {data.detail}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Binding Affinity Hint */}
                        <div style={{
                            marginTop: '10px',
                            padding: '8px 10px',
                            background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
                            borderRadius: '8px',
                            border: '1px solid #c7d2fe',
                        }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#6366f1', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Binding Insight
                            </div>
                            <div style={{ fontSize: '10px', color: '#4338ca', lineHeight: 1.4 }}>
                                {predictions.bindingAffinityHint}
                            </div>
                        </div>

                        <div style={{ marginTop: '8px', fontSize: '9px', color: '#cbd5e1', textAlign: 'center' }}>
                            Local heuristics · Not for clinical use
                        </div>
                    </>
                ) : null}
            </div>

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};
