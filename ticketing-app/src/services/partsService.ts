import { databases, ID, Query } from "@/lib/appwrite";

// Collection and database constants
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PARTS_COLLECTION = "parts";

// Define document metadata fields
interface DocumentMetadata {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $databaseId: string;
  $collectionId: string;
}

// Part interface for Appwrite
export interface Part extends DocumentMetadata {
  description: string;
  quantity: string;
  price: string;
  vendor: string;
}

// Type for creating/updating a part
export type PartInput = {
  description: string;
  quantity: string;
  price: string;
  vendor: string;
};

// Parts service object
export const partsService = {
  /**
   * Get all parts
   */
  getAllParts: async (): Promise<Part[]> => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, PARTS_COLLECTION, [
        Query.limit(100),
      ]);
      return response.documents as Part[];
    } catch (error) {
      console.error("Error fetching parts:", error);
      throw error;
    }
  },

  /**
   * Get a part by ID
   */
  getPart: async (id: string): Promise<Part> => {
    try {
      const part = await databases.getDocument(DATABASE_ID, PARTS_COLLECTION, id);
      return part as Part;
    } catch (error) {
      console.error(`Error fetching part ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new part
   */
  createPart: async (partData: PartInput): Promise<Part> => {
    try {
      const part = await databases.createDocument(
        DATABASE_ID,
        PARTS_COLLECTION,
        ID.unique(),
        partData
      );
      return part as Part;
    } catch (error) {
      console.error("Error creating part:", error);
      throw error;
    }
  },

  /**
   * Update a part
   */
  updatePart: async (id: string, partData: Partial<PartInput>): Promise<Part> => {
    try {
      const part = await databases.updateDocument(
        DATABASE_ID,
        PARTS_COLLECTION,
        id,
        partData
      );
      return part as Part;
    } catch (error) {
      console.error(`Error updating part ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a part
   */
  deletePart: async (id: string): Promise<void> => {
    try {
      await databases.deleteDocument(DATABASE_ID, PARTS_COLLECTION, id);
    } catch (error) {
      console.error(`Error deleting part ${id}:`, error);
      throw error;
    }
  },
};

export default partsService; 