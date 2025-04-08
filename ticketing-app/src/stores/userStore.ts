import { create } from "zustand";

import { persist } from "./middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: {
        id: "user-1",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "Engineer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      },
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: "user-storage",
    },
  ),
);

export default useUserStore;
