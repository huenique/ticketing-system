import { AuthResponse, AuthUser, LoginCredentials } from "@/types/auth";

// Mock users - will be replaced with actual backend integration
const mockUsers = [
  {
    id: "admin-1",
    username: "admin",
    name: "Michael Johnson",
    email: "admin@example.com",
    role: "admin" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
  },
  {
    id: "user-1",
    username: "John Doe",
    name: "John Doe",
    email: "john.doe@example.com",
    role: "user" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  // Login function - returns a promise to simulate API call
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Simulate network delay
    await delay(500);

    const user = mockUsers.find((u) => {
      if (u.username === credentials.username) {
        // For admin, password is the same as username
        if (u.role === "admin") {
          return credentials.password === u.username;
        }
        // For John Doe, specific password
        if (u.username === "John Doe") {
          return credentials.password === "p@55w0rd";
        }
      }
      return false;
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Generate a fake token
    const token = `mock-jwt-token-${Math.random().toString(36).substring(2)}`;

    return {
      user,
      token,
    };
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("auth-token");
  },

  // Get current user data
  getCurrentUser: (): AuthUser | null => {
    const userJson = localStorage.getItem("auth-user");
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch (e) {
      console.error("Failed to parse user data from localStorage", e);

      return null;
    }
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-user");
  },
};
