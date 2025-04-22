import { create } from "zustand";

import { persist } from "./middleware";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  userTypeId: string;
  lastModified?: string;
}

interface UsersState {
  users: User[];
  addUser: (user: Omit<User, "id" | "lastModified">) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const useUsersStore = create<UsersState>()(
  persist(
    (set) => ({
      users: [
        {
          id: "usr-001",
          firstName: "John",
          lastName: "Doe",
          username: "johndoe",
          userTypeId: "admin",
          lastModified: new Date().toISOString(),
        },
        {
          id: "usr-002",
          firstName: "Jane",
          lastName: "Smith",
          username: "janesmith",
          userTypeId: "support",
          lastModified: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "usr-003",
          firstName: "Robert",
          lastName: "Johnson",
          username: "rjohnson",
          userTypeId: "developer",
          lastModified: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: "usr-004",
          firstName: "Emily",
          lastName: "Davis",
          username: "emilyd",
          userTypeId: "customer",
          lastModified: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: "usr-005",
          firstName: "Michael",
          lastName: "Wilson",
          username: "mwilson",
          userTypeId: "manager",
          lastModified: new Date(Date.now() - 345600000).toISOString(),
        },
      ],
      addUser: (user) =>
        set((state) => ({
          users: [
            ...state.users,
            {
              ...user,
              id: `usr-${String(state.users.length + 1).padStart(3, "0")}`,
              lastModified: new Date().toISOString(),
            },
          ],
        })),
      updateUser: (id, updatedUser) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id
              ? { ...user, ...updatedUser, lastModified: new Date().toISOString() }
              : user,
          ),
        })),
      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        })),
    }),
    {
      name: "users-storage",
    },
  ),
);

export default useUsersStore;
