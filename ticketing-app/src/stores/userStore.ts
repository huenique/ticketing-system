import { create } from "zustand";

import { AuthUser, LoginCredentials, UserRole } from "@/types/auth";
import { authService } from "@/lib/appwrite";

import { persist } from "./middleware";

interface UserState {
  currentUser: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setCurrentUser: (user: AuthUser | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: LoginCredentials & { name: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
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
          // Use Appwrite authentication
          await authService.login(credentials.email, credentials.password);
          const user = await authService.getCurrentUser();
          
          if (!user) {
            throw new Error("Failed to get user data after login");
          }
          
          // Convert Appwrite user to AuthUser format
          const authUser: AuthUser = {
            id: user.$id,
            name: user.name,
            email: user.email,
            username: user.email.split('@')[0], // Default username based on email
            role: "admin", // Set role to admin instead of user
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`, // Generate avatar
          };
          
          set({ currentUser: authUser, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      register: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          // Register new user with Appwrite
          await authService.createAccount(credentials.email, credentials.password, credentials.name);
          
          // Login after registration
          await get().login({ 
            email: credentials.email, 
            password: credentials.password,
            username: credentials.email // Keep username for compatibility
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
          set({ currentUser: null });
        } catch (error) {
          console.error("Logout error:", error);
          // Still clear local state even if logout fails
          set({ currentUser: null });
        }
      },

      checkAuth: async () => {
        try {
          const user = await authService.getCurrentUser();
          if (user) {
            // Convert Appwrite user to AuthUser format
            const authUser: AuthUser = {
              id: user.$id,
              name: user.name,
              email: user.email,
              username: user.email.split('@')[0],
              role: "admin", // Set role to admin instead of user
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
            };
            set({ currentUser: authUser });
          }
        } catch (error) {
          console.error("Auth check error:", error);
        }
      },

      hasPermission: (requiredRole) => {
        const { currentUser } = get();
        if (!currentUser) return false;

        if (requiredRole === "admin") {
          return currentUser.role === "admin";
        }

        // All users (including admins) have basic user permissions
        return true;
      },
    }),
    {
      name: "user-storage",
      partialize: (state) => ({ currentUser: state.currentUser }),
    },
  ),
);

export default useUserStore;
