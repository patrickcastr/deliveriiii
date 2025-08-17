import { create } from 'zustand';

type Role = 'admin'|'manager'|'driver'|'viewer';
interface User { id: string; email: string; role: Role }
interface AuthState {
  user?: User;
  setUser(u?: User): void;
}
export const useAuthStore = create<AuthState>((set)=> ({ user: undefined, setUser: (u)=> set({ user: u }) }));
