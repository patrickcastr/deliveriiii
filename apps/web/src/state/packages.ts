import { create } from 'zustand';

export interface PackageItem { id: string; barcode: string; status: string; driverId?: string | null }
interface PkgState {
  items: PackageItem[];
  setItems(items: PackageItem[]): void;
  updateOne(p: Partial<PackageItem> & { id: string }): void;
}
export const usePackagesStore = create<PkgState>((set)=> ({
  items: [],
  setItems: (items)=> set({ items }),
  updateOne: (p)=> set((s)=> ({ items: s.items.map((it)=> it.id === p.id ? { ...it, ...p } : it) })),
}));
