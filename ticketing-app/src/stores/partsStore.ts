import { create } from "zustand";

import { Part, partsService, PartInput } from "@/services/partsService";
import { persist } from "./middleware";

// State interface
interface PartsState {
  parts: Part[];
  loading: boolean;
  error: Error | null;
  fetchParts: () => Promise<void>;
  addPart: (part: PartInput) => Promise<void>;
  updatePart: (id: string, part: Partial<PartInput>) => Promise<void>;
  deletePart: (id: string) => Promise<void>;
}

const usePartsStore = create<PartsState>()(
  persist(
    (set, get) => ({
      parts: [],
      loading: false,
      error: null,

      fetchParts: async () => {
        set({ loading: true, error: null });
        try {
          const parts = await partsService.getAllParts();
          set({ parts, loading: false });
        } catch (error) {
          console.error("Error fetching parts:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to fetch parts"),
            loading: false,
          });
        }
      },

      addPart: async (part) => {
        set({ loading: true, error: null });
        try {
          const newPart = await partsService.createPart(part);
          set((state) => ({
            parts: [...state.parts, newPart],
            loading: false,
          }));
        } catch (error) {
          console.error("Error adding part:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to add part"),
            loading: false,
          });
        }
      },

      updatePart: async (id, updatedPart) => {
        set({ loading: true, error: null });
        try {
          const updated = await partsService.updatePart(id, updatedPart);
          set((state) => ({
            parts: state.parts.map((part) => (part.$id === id ? updated : part)),
            loading: false,
          }));
        } catch (error) {
          console.error("Error updating part:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to update part"),
            loading: false,
          });
        }
      },

      deletePart: async (id) => {
        set({ loading: true, error: null });
        try {
          await partsService.deletePart(id);
          set((state) => ({
            parts: state.parts.filter((part) => part.$id !== id),
            loading: false,
          }));
        } catch (error) {
          console.error("Error deleting part:", error);
          set({
            error: error instanceof Error ? error : new Error("Failed to delete part"),
            loading: false,
          });
        }
      },
    }),
    {
      name: "parts-storage",
    },
  ),
);

export default usePartsStore;
export type { Part, PartInput }; 