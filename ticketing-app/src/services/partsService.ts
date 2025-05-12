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
  getAllParts: async (options?: { limit?: number; offset?: number }): Promise<{ parts: Part[], total: number }> => {
    try {
      const limit = options?.limit || 20; // Default to 20 items per page
      const offset = options?.offset || 0;

      // Use the provided pagination parameters
      const response = await databases.listDocuments(
        DATABASE_ID,
        PARTS_COLLECTION,
        [Query.limit(limit), Query.offset(offset)]
      );

      console.log(`Fetched ${response.documents.length} parts (page ${Math.floor(offset/limit) + 1})`);
      
      return {
        parts: response.documents as Part[],
        total: response.total // Appwrite provides the total count
      };
    } catch (error) {
      console.error("Error fetching parts:", error);
      throw error;
    }
  },

  /**
   * Get all parts (fetches all pages)
   */
  getAllPartsUnpaginated: async (): Promise<Part[]> => {
    try {
      const allParts: Part[] = [];
      const limit = 100; // Maximum allowed by Appwrite
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID, 
          PARTS_COLLECTION, 
          [Query.limit(limit), Query.offset(offset)]
        );

        allParts.push(...response.documents as Part[]);
        
        // Check if we've received fewer documents than requested, meaning we've reached the end
        if (response.documents.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      console.log(`Fetched ${allParts.length} parts in total`);
      return allParts;
    } catch (error) {
      console.error("Error fetching all parts:", error);
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