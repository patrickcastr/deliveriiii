import { create } from 'zustand';

export interface ScannerConfig {
  supportedFormats: Array<'QR_CODE'|'CODE_128'|'CODE_39'|'EAN_13'|'UPC_A'>;
  camera: { facingMode: 'environment'|'user'; resolution: 'HD'|'FHD' };
  scanning: { continuous: boolean; timeout: number; beepOnSuccess: boolean };
}

interface ScannerState {
  active: boolean;
  lastResult?: string;
  batchMode: boolean;
  config: ScannerConfig;
  setActive(v: boolean): void;
  setLastResult(text?: string): void;
  toggleBatch(): void;
  setConfig(cfg: Partial<ScannerConfig>): void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  active: false,
  batchMode: false,
  config: {
    supportedFormats: ['QR_CODE','CODE_128','CODE_39','EAN_13','UPC_A'],
    camera: { facingMode: 'environment', resolution: 'HD' },
    scanning: { continuous: true, timeout: 0, beepOnSuccess: true },
  },
  setActive: (v) => set({ active: v }),
  setLastResult: (text) => set({ lastResult: text }),
  toggleBatch: () => set((s) => ({ batchMode: !s.batchMode })),
  setConfig: (cfg) => set((s) => ({ config: { ...s.config, ...cfg } as ScannerConfig })),
}));
