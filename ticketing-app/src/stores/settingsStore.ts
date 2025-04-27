import { toast } from "sonner";
import { create } from "zustand";

import { statusesService } from "@/services/ticketsService";

import { persist } from "./middleware";

interface SettingsState {
  statusOptions: string[];
  statusesLoading: boolean;
  statusesError: Error | null;

  fetchStatusOptions: () => Promise<void>;
  setStatusOptions: (options: string[]) => void;
  addStatusOption: (option: string) => void;
  removeStatusOption: (option: string) => void;
  reorderStatusOptions: (fromIndex: number, toIndex: number) => void;
  resetStatusOptions: () => void;
}

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
      statusOptions: [],
      statusesLoading: false,
      statusesError: null,

      fetchStatusOptions: async () => {
        set({ statusesLoading: true, statusesError: null });

        try {
          const statuses = await statusesService.getAllStatuses();
          const statusLabels = statuses.map((status) => status.label);

          // Only update if there are statuses
          if (statusLabels.length > 0) {
            set({ statusOptions: statusLabels });
          } else {
            console.warn("No statuses found in the database.");
            set({ statusOptions: [] });
          }

          set({ statusesLoading: false });
        } catch (error) {
          console.error("Error fetching statuses:", error);
          set({
            statusesError:
              error instanceof Error ? error : new Error("Failed to fetch statuses"),
            statusesLoading: false,
            statusOptions: [], // no fallback defaults on error
          });
        }
      },

      setStatusOptions: (options) => set({ statusOptions: options }),

      addStatusOption: async (option) => {
        const { statusOptions } = get();
        if (!statusOptions.includes(option)) {
          set({ statusOptions: [...statusOptions, option] });

          try {
            await statusesService.createStatus({ label: option });
            toast.success(`Status "${option}" successfully added`);
          } catch (err) {
            console.error("Error adding status:", err);
            toast.error(
              `Failed to add status: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
          }
        } else {
          toast.warning(`Status "${option}" already exists`);
        }
      },

      removeStatusOption: async (option) => {
        const { statusOptions } = get();
        set({ statusOptions: statusOptions.filter((item) => item !== option) });

        try {
          const statuses = await statusesService.getAllStatuses();
          const statusToDelete = statuses.find((status) => status.label === option);

          if (statusToDelete) {
            const documentId = statusToDelete.$id || statusToDelete.id;
            if (!documentId) {
              console.error(`No ID found for status "${option}"`);
              return;
            }

            await statusesService.deleteStatus(documentId);
          } else {
            console.warn(`Status "${option}" not found in the database`);
          }
        } catch (err) {
          console.error("Error removing status:", err);
        }
      },

      reorderStatusOptions: (fromIndex, toIndex) => {
        const { statusOptions } = get();
        const newStatusOptions = [...statusOptions];
        const [movedItem] = newStatusOptions.splice(fromIndex, 1);
        newStatusOptions.splice(toIndex, 0, movedItem);
        set({ statusOptions: newStatusOptions });
      },

      resetStatusOptions: async () => {
        set({ statusOptions: DEFAULT_STATUS_OPTIONS });

        try {
          const existingStatuses = await statusesService.getAllStatuses();
          for (const status of existingStatuses) {
            const documentId = status.$id || status.id;
            if (documentId) {
              await statusesService.deleteStatus(documentId);
            }
          }

          for (const label of DEFAULT_STATUS_OPTIONS) {
            await statusesService.createStatus({ label });
          }

          toast.success("Status options have been reset to defaults");
        } catch (err) {
          console.error("Error resetting statuses:", err);
          toast.error(
            `Failed to reset statuses: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        }
      },
    }),
    {
      name: "settings-storage",
    },
  ),
);
