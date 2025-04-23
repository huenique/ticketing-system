import { create } from "zustand";
import { persist } from "./middleware";
import { getCollection, getDocument, createDocument, updateDocument, deleteDocument } from "@/lib/appwrite";

export interface User {
  $id: string;
  first_name: string;
  last_name: string;
  username: string;
  user_type_id: {
    $id: string;
    label: string;
    $createdAt?: string;
    $updatedAt?: string;
    $permissions?: string[];
    $databaseId?: string;
    $collectionId?: string;
  };
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}

interface UserType {
  $id: string;
  label: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}

const USERS_COLLECTION = "users";
const USER_TYPES_COLLECTION = "user_types";

interface UsersState {
  users: User[];
  userTypes: UserType[];
  loading: boolean;
  error: Error | null;
  fetchUsers: () => Promise<void>;
  fetchUserTypes: () => Promise<void>;
  addUser: (user: Omit<User, "$id" | "$createdAt" | "$updatedAt" | "$permissions" | "$databaseId" | "$collectionId">) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

interface AppwriteResponse<T> {
  documents: T[];
  total: number;
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
          const response = await getCollection<User>(USERS_COLLECTION);
          set({ users: response.documents, loading: false });
        } catch (error) {
          console.error("Error fetching users:", error);
          set({ 
            error: error instanceof Error ? error : new Error("Failed to fetch users"),
            loading: false 
          });
        }
      },
      
      fetchUserTypes: async () => {
        set({ loading: true, error: null });
        try {
          const response = await getCollection<UserType>(USER_TYPES_COLLECTION);
          set({ userTypes: response.documents, loading: false });
        } catch (error) {
          console.error("Error fetching user types:", error);
          set({ 
            error: error instanceof Error ? error : new Error("Failed to fetch user types"),
            loading: false 
          });
        }
      },
      
      addUser: async (user) => {
        set({ loading: true, error: null });
        try {
          const newUser = await createDocument<User>(USERS_COLLECTION, user);
          set((state) => ({
            users: [...state.users, newUser],
            loading: false
          }));
        } catch (error) {
          console.error("Error adding user:", error);
          set({ 
            error: error instanceof Error ? error : new Error("Failed to add user"),
            loading: false 
          });
        }
      },
      
      updateUser: async (id, updatedUser) => {
        set({ loading: true, error: null });
        try {
          const updated = await updateDocument<User>(USERS_COLLECTION, id, updatedUser);
          set((state) => ({
            users: state.users.map((user) => user.$id === id ? updated : user),
            loading: false
          }));
        } catch (error) {
          console.error("Error updating user:", error);
          set({ 
            error: error instanceof Error ? error : new Error("Failed to update user"),
            loading: false 
          });
        }
      },
      
      deleteUser: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteDocument(USERS_COLLECTION, id);
          set((state) => ({
            users: state.users.filter((user) => user.$id !== id),
            loading: false
          }));
        } catch (error) {
          console.error("Error deleting user:", error);
          set({ 
            error: error instanceof Error ? error : new Error("Failed to delete user"),
            loading: false 
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
