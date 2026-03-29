import indigoKetcher from 'indigo-ketcher';
let _mod: any = null;
async function ig() {
  if (!_mod) _mod = await indigoKetcher();
  return _mod;
}
export async function smilesTo2D(smiles: string, scale = 40) {
  const m = await ig();
  const r = await m.convert(smiles, { outputFormat: 'molfile', options: { 'smart-layout': true } });
  const lines = (r.struct || r).split('\n');
  const nA = parseInt(lines[3]?.substring(0,3)) || 0;
  const nB = parseInt(lines[3]?.substring(3,6)) || 0;
  const atoms = [];
  for (let i = 0; i < nA; i++) {
    const l = lines[4+i] || '';
    atoms.push({ x: parseFloat(l.substring(0,10))*scale, y: parseFloat(l.substring(10,20))*-scale, element: l.substring(31,34).trim()||'C' });
  }
  const bonds = [];
  for (let i = 0; i < nB; i++) {
    const l = lines[4+nA+i] || '';
    bonds.push({ a: parseInt(l.substring(0,3))-1, b: parseInt(l.substring(3,6))-1, order: parseInt(l.substring(6,9)), stereo: parseInt(l.substring(9,12))||0 });
  }
  return { atoms, bonds };
}
export async function clean2D(mol: string) { const m = await ig(); return m.clean2d(mol, {}); }
export async function aromatize(mol: string) { const m = await ig(); return m.aromatize(mol, {}); }
export async function dearomatize(mol: string) { const m = await ig(); return m.dearomatize(mol, {}); }
