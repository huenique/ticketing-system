import { create } from "zustand";

import { User, usersService, UserType, UserTypeInput } from "@/services/usersService";

import { persist } from "./middleware";

// Define type for relationship fields
type RelationshipInput = string | { $id: string; label: string };

// Define input type for user creation
interface UserInput {
  first_name: string;
  last_name: string;
  user_type_id: RelationshipInput;
  auth_user_id?: string; // Optional as it will be automatically set in some cases
}

// State interface
interface UsersState {
  users: User[];
  userTypes: UserType[];
  loading: boolean;
  error: Error | null;
  fetchUsers: () => Promise<void>;
  fetchUserTypes: () => Promise<void>;
  addUser: (user: UserInput) => Promise<void>;
  updateUser: (id: string, user: Partial<UserInput>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  // User types management
  addUserType: (userType: UserTypeInput) => Promise<void>;
  updateUserType: (id: string, userType: UserTypeInput) => Promise<void>;
  deleteUserType: (id: string) => Promise<void>;
}

const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: [],
      userTypes: [],
      loading: false,
      error: null,

      fetchUsers: async () => {
        set({ loading: true, error: null });
        try {
          const users = await usersService.getAllUsers();
          set({ users, loading: false });
        } catch (error) {
          console.error("Error fetching users:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to fetch users"),
            loading: false,
          });
        }
      },

      fetchUserTypes: async () => {
        set({ loading: true, error: null });
        try {
          const userTypes = await usersService.getAllUserTypes();
          set({ userTypes, loading: false });
        } catch (error) {
          console.error("Error fetching user types:", error);
          set({
            error:
              error instanceof Error ? error : new Error("Failed to fetch user types"),
            loading: false,
          });
        }
      },

      addUser: async (user) => {
        set({ loading: true, error: null });
        try {
          // Convert user input to format required by service
          const userData = {
            ...user,
            // Handle both string and object formats for relationship
            user_type_id:
              typeof user.user_type_id === "string"
                ? user.user_type_id
                : user.user_type_id.$id,
          };

          console.log("Creating user with auth_user_id:", user.auth_user_id);
          
          const newUser = await usersService.createUser(userData as any);
          set((state) => ({
            users: [...state.users, newUser],
            loading: false,
          }));
        } catch (error) {
          console.error("Error adding user:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to add user"),
            loading: false,
          });
        }
      },

      updateUser: async (id, updatedUser) => {
        set({ loading: true, error: null });
        try {
          // Convert user input to format required by service
          const userData = { ...updatedUser };

          // Handle user_type_id if it exists
          if (updatedUser.user_type_id !== undefined) {
            userData.user_type_id =
              typeof updatedUser.user_type_id === "string"
                ? updatedUser.user_type_id
                : updatedUser.user_type_id.$id;
          }

          const updated = await usersService.updateUser(id, userData as any);
          set((state) => ({
            users: state.users.map((user) => (user.$id === id ? updated : user)),
            loading: false,
          }));
        } catch (error) {
          console.error("Error updating user:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to update user"),
            loading: false,
          });
        }
      },

      deleteUser: async (id) => {
        set({ loading: true, error: null });
        try {
          await usersService.deleteUser(id);
          set((state) => ({
            users: state.users.filter((user) => user.$id !== id),
            loading: false,
          }));
        } catch (error) {
          console.error("Error deleting user:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to delete user"),
            loading: false,
          });
        }
      },

      // User types management
      addUserType: async (userType) => {
        set({ loading: true, error: null });
        try {
          const newUserType = await usersService.createUserType(userType);
          set((state) => ({
            userTypes: [...state.userTypes, newUserType],
            loading: false,
          }));
        } catch (error) {
          console.error("Error adding user type:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to add user type"),
            loading: false,
          });
        }
      },

      updateUserType: async (id, userType) => {
        set({ loading: true, error: null });
        try {
          const updatedUserType = await usersService.updateUserType(id, userType);
          set((state) => ({
            userTypes: state.userTypes.map((type) => 
              type.$id === id ? updatedUserType : type
            ),
            loading: false,
          }));
        } catch (error) {
          console.error("Error updating user type:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to update user type"),
            loading: false,
          });
        }
      },

      deleteUserType: async (id) => {
        set({ loading: true, error: null });
        try {
          await usersService.deleteUserType(id);
          set((state) => ({
            userTypes: state.userTypes.filter((type) => type.$id !== id),
            loading: false,
          }));
        } catch (error) {
          console.error("Error deleting user type:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to delete user type"),
            loading: false,
          });
        }
      },
    }),
    {
      name: "users-storage",
    },
  ),
);

export default useUsersStore;
export type { User, UserInput, UserType };
