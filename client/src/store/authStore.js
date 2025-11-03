import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true });
    localStorage.setItem('streamly-auth', JSON.stringify({ state: { token, user } }));
  },
  
  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('streamly-auth');
  },
  
  updateUser: (user) => set({ user }),
  
  initialize: () => {
    const stored = localStorage.getItem('streamly-auth');
    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        if (state.token && state.user) {
          set({ user: state.user, token: state.token, isAuthenticated: true });
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      }
    }
  }
}));

useAuthStore.getState().initialize();
