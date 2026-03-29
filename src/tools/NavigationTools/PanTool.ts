import { useCanvasStore } from '../../core/StateManager';

export const PanTool = {
  onMouseDown: (
    e: { clientX: number; clientY: number },
    startPan: (clientX: number, clientY: number, panX: number, panY: number) => void
  ) => {
    const store = useCanvasStore.getState();
    startPan(e.clientX, e.clientY, store.pan.x, store.pan.y);
  },

  onMouseMove: (
    e: { clientX: number; clientY: number },
    isPanning: boolean,
    panStartScreen: { x: number; y: number } | null,
    panStartValue: { x: number; y: number } | null
  ) => {
    if (isPanning && panStartScreen && panStartValue) {
      const store = useCanvasStore.getState();
      const dx = e.clientX - panStartScreen.x;
      const dy = e.clientY - panStartScreen.y;
      store.setPan({
        x: panStartValue.x + dx,
        y: panStartValue.y + dy,
      });
    }
  },

  onMouseUp: (endPan: () => void) => {
    endPan();
  }
};
