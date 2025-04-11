import { create } from "zustand";
import { persist } from "./middleware";
import { AuthUser, LoginCredentials, UserRole } from "@/types/auth";
import { authService } from "@/utils/auth";

interface UserState {
  currentUser: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setCurrentUser: (user: AuthUser | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  hasPermission: (requiredRole: UserRole) => boolean;
}

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLoading: false,
      error: null,
      
      setCurrentUser: (user) => set({ currentUser: user }),
      
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.login(credentials);
          // Store token and user in localStorage
          localStorage.setItem("auth-token", token);
          localStorage.setItem("auth-user", JSON.stringify(user));
          
          set({ currentUser: user, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },
      
      logout: () => {
        authService.logout();
        set({ currentUser: null });
      },
      
      checkAuth: () => {
        const user = authService.getCurrentUser();
        if (user) {
          set({ currentUser: user });
        }
      },
      
      hasPermission: (requiredRole) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        if (requiredRole === 'admin') {
          return currentUser.role === 'admin';
        }
        
        // All users (including admins) have basic user permissions
        return true;
      }
    }),
    {
      name: "user-storage",
      partialize: (state) => ({ currentUser: state.currentUser }),
    },
  ),
);

export default useUserStore;
