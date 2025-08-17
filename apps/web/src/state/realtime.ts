import { create } from 'zustand';

interface RtState { connected: boolean; lastPong: number; set(v: Partial<RtState>): void }
export const useRtStore = create<RtState>((set)=> ({ connected: false, lastPong: 0, set: (v)=> set(v) }));
