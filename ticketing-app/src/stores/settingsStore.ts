import { create } from "zustand";
import { persist } from "./middleware";
import { Status, statusesService } from "@/services/ticketsService";

interface SettingsState {
  // Status widget configuration
  statusOptions: string[];
  statusesLoading: boolean;
  statusesError: Error | null;

  // Actions
  fetchStatusOptions: () => Promise<void>;
  setStatusOptions: (options: string[]) => void;
  addStatusOption: (option: string) => void;
  removeStatusOption: (option: string) => void;
  reorderStatusOptions: (fromIndex: number, toIndex: number) => void;
  resetStatusOptions: () => void;
}

// Fallback default status options (only used if API fetch fails)
const DEFAULT_STATUS_OPTIONS = [
  "New",
  "Awaiting Customer Response",
  "Awaiting Parts",
  "Open",
  "In Progress",
  "Completed",
  "Declined",
];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // State
      statusOptions: [],
      statusesLoading: false,
      statusesError: null,

      // Actions
      fetchStatusOptions: async () => {
        set({ statusesLoading: true, statusesError: null });
        
        try {
          const statuses = await statusesService.getAllStatuses();
          // Extract the labels from the statuses objects
          const statusLabels = statuses.map(status => status.label);
          
          // Only update if we got results
          if (statusLabels.length > 0) {
            set({ statusOptions: statusLabels });
          } else {
            console.warn("No statuses found in the database. Using default values.");
            set({ statusOptions: DEFAULT_STATUS_OPTIONS });
          }
          
          set({ statusesLoading: false });
        } catch (error) {
          console.error("Error fetching statuses:", error);
          set({ 
            statusesError: error instanceof Error ? error : new Error("Failed to fetch statuses"),
            statusesLoading: false,
            // Fall back to defaults if API fails
            statusOptions: DEFAULT_STATUS_OPTIONS
          });
        }
      },

      setStatusOptions: (options) => set({ statusOptions: options }),

      addStatusOption: async (option) => {
        const { statusOptions } = get();
        // Prevent duplicates
        if (!statusOptions.includes(option)) {
          // First update local state for immediate UI feedback
          set({ statusOptions: [...statusOptions, option] });
          
          // Then try to add to the backend
          try {
            await statusesService.createStatus({ label: option });
          } catch (err) {
            console.error("Error adding status to backend:", err);
            // Consider if you want to revert the local state on error
          }
        }
      },

      removeStatusOption: async (option) => {
        const { statusOptions } = get();
        
        // First update local state for immediate UI feedback
        set({
          statusOptions: statusOptions.filter((item) => item !== option),
        });
        
        // Then try to delete from backend
        try {
          // Need to find the ID for the status with this label
          const statuses = await statusesService.getAllStatuses();
          const statusToDelete = statuses.find(status => status.label === option);
          
          if (statusToDelete) {
            await statusesService.deleteStatus(statusToDelete.id);
          }
        } catch (err) {
          console.error("Error removing status from backend:", err);
          // Consider if you want to revert the local state on error
        }
      },

      reorderStatusOptions: (fromIndex, toIndex) => {
        const { statusOptions } = get();
        const newStatusOptions = [...statusOptions];
        const [movedItem] = newStatusOptions.splice(fromIndex, 1);
        newStatusOptions.splice(toIndex, 0, movedItem);
        set({ statusOptions: newStatusOptions });
        
        // Note: Backend doesn't currently support order, so we're not syncing this
      },

      resetStatusOptions: async () => {
        // First update local state for immediate UI feedback
        set({ statusOptions: DEFAULT_STATUS_OPTIONS });
        
        // This is a more complex operation for the backend
        // You might want to delete all existing statuses and recreate them
        // Or implement a different strategy based on your requirements
        try {
          // Get all existing statuses
          const existingStatuses = await statusesService.getAllStatuses();
          
          // Delete all existing statuses
          for (const status of existingStatuses) {
            await statusesService.deleteStatus(status.id);
          }
          
          // Create default statuses
          for (const label of DEFAULT_STATUS_OPTIONS) {
            await statusesService.createStatus({ label });
          }
        } catch (err) {
          console.error("Error resetting statuses in backend:", err);
        }
      },
    }),
    {
      name: "settings-storage",
    },
  ),
);
