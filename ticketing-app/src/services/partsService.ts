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
   * Search parts with pagination support
   * @param searchQuery The search term
   * @param searchField The field to search in (default: "description"), or "all" for all fields
   * @param page The page number (starting at 1)
   * @param pageSize Number of items per page
   */
  searchParts: async (
    searchQuery: string,
    searchField: string = "description",
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ parts: Part[]; total: number }> => {
    try {
      const offset = (page - 1) * pageSize;
      const trimmedQuery = searchQuery.trim();
      
      // Create an array of queries for pagination
      const queries = [
        Query.limit(pageSize),
        Query.offset(offset),
      ];
      
      // For special character searches (like those with hyphens), 
      // it's better to fall back to manual filtering since fulltext might not work well
      const hasSpecialChars = /[-]/.test(trimmedQuery);
      
      // Add search filter if provided
      if (trimmedQuery) {
        // If the query has special characters or is very short, use manual filtering
        if (hasSpecialChars || trimmedQuery.length <= 3) {
          console.log(`Using manual filtering for "${trimmedQuery}" (contains special chars or is short)`);
          // Get more documents for manual filtering
          const response = await databases.listDocuments(
            DATABASE_ID,
            PARTS_COLLECTION,
            [Query.limit(200)] // Get more records to ensure we don't miss anything
          );
          
          // Lower case for case-insensitive comparison
          const searchLower = trimmedQuery.toLowerCase();
          let filteredParts: Part[] = [];
          
          if (searchField === "all") {
            // Filter across all relevant fields
            filteredParts = response.documents.filter((part: any) => {
              const description = String(part.description || "").toLowerCase();
              const vendor = String(part.vendor || "").toLowerCase();
              
              // Check if any field contains the search term
              return description.includes(searchLower) || 
                     vendor.includes(searchLower);
            }) as Part[];
          } else {
            // Filter on the specific field
            filteredParts = response.documents.filter((part: any) => {
              const fieldValue = String(part[searchField] || "").toLowerCase();
              return fieldValue.includes(searchLower);
            }) as Part[];
          }
          
          // Apply pagination manually
          const paginatedParts = filteredParts.slice(offset, offset + pageSize);
          
          return {
            parts: paginatedParts,
            total: filteredParts.length
          };
        }
        
        // Handle normal searches without special characters
        if (searchField === "all") {
          try {
            // Get documents matching description
            const descriptionResponse = await databases.listDocuments(
              DATABASE_ID,
              PARTS_COLLECTION,
              [Query.limit(100), Query.search("description", trimmedQuery)]
            );
            
            // Get documents matching vendor
            const vendorResponse = await databases.listDocuments(
              DATABASE_ID,
              PARTS_COLLECTION,
              [Query.limit(100), Query.search("vendor", trimmedQuery)]
            );
            
            // Combine and deduplicate results
            const descriptionParts = descriptionResponse.documents as Part[];
            const vendorParts = vendorResponse.documents as Part[];
            
            // Combine results without duplicates
            let allParts: Part[] = [...descriptionParts];
            vendorParts.forEach(vendorPart => {
              if (!allParts.some(part => part.$id === vendorPart.$id)) {
                allParts.push(vendorPart);
              }
            });
            
            // Apply pagination manually
            const paginatedParts = allParts.slice(offset, offset + pageSize);
            
            return {
              parts: paginatedParts,
              total: allParts.length
            };
          } catch (error) {
            console.log("Combined search failed, falling back to basic filter:", error);
            
            // Fall back to manual filtering
            const response = await databases.listDocuments(
              DATABASE_ID,
              PARTS_COLLECTION,
              [Query.limit(100)]
            );
            
            // Manual filtering for both fields
            const searchLower = trimmedQuery.toLowerCase();
            const filteredParts = response.documents.filter((part: any) => {
              const description = String(part.description || "").toLowerCase();
              const vendor = String(part.vendor || "").toLowerCase();
              
              return description.includes(searchLower) || vendor.includes(searchLower);
            }) as Part[];
            
            // Apply pagination manually
            const paginatedParts = filteredParts.slice(offset, offset + pageSize);
            
            return {
              parts: paginatedParts,
              total: filteredParts.length
            };
          }
        } else {
          // For specific field search without special characters
          console.log(`Searching in field: "${searchField}" with query: "${trimmedQuery}"`);
          
          try {
            // Add the search query for the specific field
            queries.push(Query.search(searchField, trimmedQuery));
            
            // Execute the search
            const response = await databases.listDocuments(
              DATABASE_ID,
              PARTS_COLLECTION,
              queries
            );
            
            return {
              parts: response.documents as Part[],
              total: response.total
            };
          } catch (fieldSearchError) {
            console.log(`Search in field "${searchField}" failed:`, fieldSearchError);
            console.log("Falling back to manual string filtering");
            
            // Fallback: Manual string filtering 
            const response = await databases.listDocuments(
              DATABASE_ID,
              PARTS_COLLECTION,
              [Query.limit(100)]
            );
            
            // Manually filter the results
            const searchLower = trimmedQuery.toLowerCase();
            const filteredParts = response.documents.filter((part: any) => {
              // Only check the requested field
              const fieldValue = String(part[searchField] || "").toLowerCase();
              return fieldValue.includes(searchLower);
            }) as Part[];
            
            // Apply pagination manually
            const paginatedParts = filteredParts.slice(offset, offset + pageSize);
            
            return {
              parts: paginatedParts,
              total: filteredParts.length
            };
          }
        }
      } else {
        // No search term, just get paginated results
        const response = await databases.listDocuments(
          DATABASE_ID,
          PARTS_COLLECTION,
          queries
        );
        
        return {
          parts: response.documents as Part[],
          total: response.total
        };
      }
    } catch (error) {
      console.error("Error searching parts:", error);
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