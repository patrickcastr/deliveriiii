import { create } from 'zustand';
export { shallow } from 'zustand/shallow';

export interface PackageItem { id: string; barcode: string; status: string; driverId?: string | null }
interface PkgState {
  items: PackageItem[];
  setItems(items: PackageItem[]): void;
  updateOne(p: Partial<PackageItem> & { id: string }): void;
  addPackage(p: any): void;
  removePackage(id: string): void;
  replacePackage(tempId: string, real: any): void;
}
export const usePackagesStore = create<PkgState>((set)=> ({
  items: [],
  setItems: (items)=> set({ items }),
  updateOne: (p)=> set((s)=> ({ items: s.items.map((it)=> it.id === p.id ? { ...it, ...p } : it) })),
  addPackage: (p)=> set((s)=> ({ items: [p as any, ...s.items] })),
  removePackage: (id)=> set((s)=> ({ items: s.items.filter((it)=> it.id !== id) })),
  replacePackage: (tempId, real)=> set((s)=> ({ items: s.items.map((it)=> it.id === tempId ? { ...it, ...real } as any : it) })),
}));
