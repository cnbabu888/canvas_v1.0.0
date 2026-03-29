import { useCanvasStore } from '../../core/StateManager';
import { ChangePropertyCommand } from '../../commands/ChangePropertyCommand';

export const ChargeTool = {
  handleAtomClick: (closestAtom: number | null) => {
    if (closestAtom === null) return;
    
    const store = useCanvasStore.getState();
    const atom = store.molecule.atoms.get(closestAtom);
    if (!atom) return;
    
    const subTool = store.activeSubTool ?? 'charge-plus';

    let newCharge = atom.charge;
    if (subTool === 'charge-plus')    newCharge = atom.charge + 1;
    if (subTool === 'charge-minus')   newCharge = atom.charge - 1;
    if (subTool === 'charge-radical') newCharge = 0; // radical reset

    const cmd = new ChangePropertyCommand(store.molecule, [{
      type: 'atom',
      id: closestAtom,
      property: 'charge',
      value: newCharge,
      oldValue: atom.charge,
    }]);
    
    store.executeCommand(cmd);
  }
};
