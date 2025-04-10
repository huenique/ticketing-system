import { create } from "zustand";
import { persist } from "./middleware";

interface SettingsState {
  // Status widget configuration
  statusOptions: string[];
  
  // Actions
  setStatusOptions: (options: string[]) => void;
  addStatusOption: (option: string) => void;
  removeStatusOption: (option: string) => void;
  reorderStatusOptions: (fromIndex: number, toIndex: number) => void;
  resetStatusOptions: () => void;
}

// Default status options
const DEFAULT_STATUS_OPTIONS = ["New", "Awaiting Customer Response", "Awaiting Parts", "Open", "In Progress", "Completed", "Declined"];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // State
      statusOptions: DEFAULT_STATUS_OPTIONS,
      
      // Actions
      setStatusOptions: (options) => set({ statusOptions: options }),
      
      addStatusOption: (option) => {
        const { statusOptions } = get();
        // Prevent duplicates
        if (!statusOptions.includes(option)) {
          set({ statusOptions: [...statusOptions, option] });
        }
      },
      
      removeStatusOption: (option) => {
        const { statusOptions } = get();
        set({ 
          statusOptions: statusOptions.filter((item) => item !== option) 
        });
      },
      
      reorderStatusOptions: (fromIndex, toIndex) => {
        const { statusOptions } = get();
        const newStatusOptions = [...statusOptions];
        const [movedItem] = newStatusOptions.splice(fromIndex, 1);
        newStatusOptions.splice(toIndex, 0, movedItem);
        set({ statusOptions: newStatusOptions });
      },
      
      resetStatusOptions: () => set({ statusOptions: DEFAULT_STATUS_OPTIONS }),
    }),
    {
      name: "settings-storage",
    }
  )
); 