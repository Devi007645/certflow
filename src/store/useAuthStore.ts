import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'user' | 'admin';
type Screen = 'landing' | 'login' | 'signup' | 'user' | 'admin';

interface Profile {
  id: string;
  email: string;
  role: Role;
  name: string;
  department: string;
}

interface AuthState {
  screen: Screen;
  activeUser: Profile | null;
  setScreen: (screen: Screen) => void;
  setActiveUser: (user: Profile | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      screen: 'landing',
      activeUser: null,
      setScreen: (screen) => set({ screen }),
      setActiveUser: (user) => set({ activeUser: user }),
      logout: () => set({ screen: 'landing', activeUser: null }),
    }),
    {
      name: 'proofly-auth-storage',
    }
  )
);
