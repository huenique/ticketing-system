import { create } from "zustand";

import { Part, partsService, PartInput } from "@/services/partsService";
import { persist } from "./middleware";

// State interface
interface PartsState {
  parts: Part[];
  loading: boolean;
  error: Error | null;
  page: number;
  limit: number;
  totalParts: number;
  totalPages: number;
  fetchParts: (page?: number) => Promise<void>;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
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
      page: 1,
      limit: 20,
      totalParts: 0,
      totalPages: 0,

      setPage: (page) => {
        set({ page });
        get().fetchParts(page);
      },

      setLimit: (limit) => {
        set({ limit, page: 1 });
        get().fetchParts(1);
      },

      fetchParts: async (newPage?: number) => {
        const { limit } = get();
        const currentPage = newPage || get().page;
        const offset = (currentPage - 1) * limit;
        
        set({ loading: true, error: null });
        try {
          const result = await partsService.getAllParts({ limit, offset });
          set({ 
            parts: result.parts, 
            totalParts: result.total,
            totalPages: Math.ceil(result.total / limit),
            loading: false,
            page: currentPage
          });
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
          // Refresh the current page to ensure consistent data
          await get().fetchParts();
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
          await partsService.updatePart(id, updatedPart);
          // Refresh the current page to ensure consistent data
          await get().fetchParts();
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
          // Refresh the current page to ensure consistent data
          await get().fetchParts();
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
      partialize: (state) => ({
        limit: state.limit,
      }),
    },
  ),
);

export default usePartsStore;
export type { Part, PartInput }; 