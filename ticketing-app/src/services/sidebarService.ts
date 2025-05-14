import {
  createDocument,
  getCollection,
  getDocument,
  ID,
  updateDocument,
} from "@/lib/appwrite";

// Collection ID constant
const SIDEBAR_COLLECTION = "sidebar";

// Interface for sidebar settings
export interface SidebarSettings {
  $id: string;
  title: string;
}

// Default title to use if none exists in database
const DEFAULT_TITLE = "Ticketing System";

export const sidebarService = {
  /**
   * Get the sidebar title from the settings
   */
  getSidebarTitle: async (): Promise<string> => {
    try {
      // Try to get the first document from the sidebar collection
      const response = await getCollection<SidebarSettings>(SIDEBAR_COLLECTION);
      
      // If there's at least one document, return its title
      if (response.documents.length > 0) {
        return response.documents[0].title;
      }
      
      // If no document exists, create one with the default title
      await createDocument(SIDEBAR_COLLECTION, { title: DEFAULT_TITLE });
      
      return DEFAULT_TITLE;
    } catch (error) {
      console.error("Error fetching sidebar title:", error);
      // Return default title in case of error
      return DEFAULT_TITLE;
    }
  },

  /**
   * Update the sidebar title
   */
  updateSidebarTitle: async (documentId: string, title: string): Promise<void> => {
    try {
      await updateDocument(SIDEBAR_COLLECTION, documentId, { title });
    } catch (error) {
      console.error("Error updating sidebar title:", error);
      throw error;
    }
  },

  /**
   * Get the sidebar settings document
   */
  getSidebarSettings: async (): Promise<SidebarSettings | null> => {
    try {
      const response = await getCollection<SidebarSettings>(SIDEBAR_COLLECTION);
      
      if (response.documents.length > 0) {
        return response.documents[0];
      }
      
      // Create a new document if none exists
      const newSettings = await createDocument<SidebarSettings>(
        SIDEBAR_COLLECTION, 
        { title: DEFAULT_TITLE },
        ID.unique()
      );
      
      return newSettings;
    } catch (error) {
      console.error("Error fetching sidebar settings:", error);
      return null;
    }
  },
}; 