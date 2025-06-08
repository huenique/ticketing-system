import { databases, ID, Query } from "@/lib/appwrite";
import { getCurrentUserRole } from "@/lib/userUtils";
import { TimeEntry } from "@/types/tickets";
import { authService } from "@/lib/appwrite";

// Collection ID constants
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TIME_ENTRIES_COLLECTION = "time_entries";
const USERS_COLLECTION = "users";

// Helper function to map API response to TimeEntry
const mapToTimeEntry = (document: any): TimeEntry => {
  // Extract user information from user_id relationship
  const firstName = document.user_id?.first_name || "";
  const lastName = document.user_id?.last_name || "";
  const assigneeName = `${firstName} ${lastName}`.trim() || "Unknown";
  
  // Format date from createdAt
  const dateCreated = document.$createdAt 
    ? new Date(document.$createdAt).toLocaleDateString() 
    : "";

  // Use time fields directly from the document - they're already in HH:MM:SS format
  const startTime = document.start_time || "";
  const stopTime = document.stop_time || "";

  return {
    id: document.$id || "",
    assigneeId: document.user_id?.$id || "",
    assigneeName,
    startTime,
    stopTime,
    duration: document.total_duration || "0",
    dateCreated,
    remarks: document.remarks || "",
    files: document.files || [],
    ticket_id: document.ticket_id?.$id || document.ticket_id || "",
    user_id: document.user_id?.$id || document.user_id || ""
  };
};

// Helper function to get database user ID from auth user ID
const getDatabaseUserIdFromAuthId = async (authUserId: string): Promise<string | null> => {
  try {
    console.log(`Looking up database user for auth user ID: ${authUserId}`);
    // Query users collection to find the user with matching auth_user_id
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION,
      [Query.equal("auth_user_id", authUserId), Query.limit(1)]
    );

    if (response.documents.length > 0) {
      const dbUserId = response.documents[0].$id;
      console.log(`Found database user ID: ${dbUserId} for auth user ID: ${authUserId}`);
      return dbUserId;
    }
    
    console.warn(`No database user found for auth user ID: ${authUserId}`);
    return null;
  } catch (error) {
    console.error(`Error finding database user for auth user ID ${authUserId}:`, error);
    return null;
  }
};

// Time entries service
export const timeEntriesService = {
  /**
   * Get all time entries
   */
  getAllTimeEntries: async (): Promise<TimeEntry[]> => {
    try {
      console.log("Fetching all time entries from collection:", TIME_ENTRIES_COLLECTION);
      const response = await databases.listDocuments(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION,
        [Query.limit(100)]
      );
      console.log("Time entries response:", response.documents);
      return response.documents.map(mapToTimeEntry);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      throw error;
    }
  },

  /**
   * Get time entries for a specific ticket
   * If user is admin, return all entries for the ticket
   * If user is not admin, return only entries created by the current user
   * Filtering is done client-side after fetching all data for the ticket
   */
  getTimeEntriesForTicket: async (ticketId: string): Promise<TimeEntry[]> => {
    try {
      console.log(`Fetching time entries for ticket: ${ticketId}`);
      
      // Fetch all time entries for this ticket
      const response = await databases.listDocuments(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION,
        [Query.equal("ticket_id", ticketId), Query.limit(100)]
      );
      
      console.log(`Found ${response.documents.length} time entries for ticket ${ticketId}`);
      
      // Map all entries to TimeEntry objects
      const allEntries = response.documents.map(mapToTimeEntry);
      
      // Check user role
      const userRole = await getCurrentUserRole();
      console.log(`Current user role: ${userRole}`);
      
      // If admin, return all entries
      if (userRole === "admin") {
        console.log("User is admin, showing all time entries for ticket");
        return allEntries;
      }
      
      // Otherwise filter by current user's database ID
      // First get the auth user
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser && currentUser.$id) {
        // Convert auth user ID to database user ID
        const dbUserId = await getDatabaseUserIdFromAuthId(currentUser.$id);
        
        if (dbUserId) {
          console.log(`Filtering time entries for database user ID: ${dbUserId}`);
          
          // Filter entries to only include those belonging to the current user's database ID
          const filteredEntries = allEntries.filter(entry => {
            // Match entry.user_id against the database user ID
            return entry.user_id === dbUserId;
          });
          
          console.log(`Filtered to ${filteredEntries.length} entries for database user ID: ${dbUserId}`);
          return filteredEntries;
        }
      }
      
      // If we can't get the database user ID, return all entries instead of an empty array
      console.warn("Could not get database user ID for filtering time entries, showing all entries");
      return allEntries;
    } catch (error) {
      console.error(`Error fetching time entries for ticket ${ticketId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new time entry
   */
  createTimeEntry: async (timeEntryData: Omit<TimeEntry, "id"> | Record<string, any>): Promise<TimeEntry> => {
    try {
      console.log("Creating new time entry:", timeEntryData);
      
      // Use type assertion to avoid TypeScript errors
      const data = timeEntryData as any;
      
      // Extract just the ID if user_id is an object
      const userId = typeof data.user_id === 'object' 
        ? (data.user_id as any).$id || (data.user_id as any).id 
        : data.user_id;
      
      // Extract just the ID if ticket_id is an object
      const ticketId = typeof data.ticket_id === 'object'
        ? (data.ticket_id as any).$id || (data.ticket_id as any).id
        : data.ticket_id;
      
      // Transform from frontend TimeEntry format to database format
      const dataToSave: Record<string, any> = {
        // Use default values for required fields if not provided
        start_time: data.startTime || data.start_time || new Date().toTimeString().split(' ')[0],
        stop_time: data.stopTime || data.stop_time || "",
        total_duration: data.duration || data.total_duration || "0",
        remarks: data.remarks || "",
        files: data.files || [],
        ticket_id: ticketId,
        user_id: userId
      };
      
      console.log("Saving time entry to Appwrite:", dataToSave);
      
      const response = await databases.createDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION,
        ID.unique(),
        dataToSave
      );
      console.log("Created time entry:", response);
      return mapToTimeEntry(response);
    } catch (error) {
      console.error("Error creating time entry:", error);
      throw error;
    }
  },

  /**
   * Update an existing time entry
   */
  updateTimeEntry: async (timeEntryId: string, timeEntryData: Partial<TimeEntry> | Record<string, any>): Promise<TimeEntry> => {
    try {
      console.log(`Updating time entry ${timeEntryId}:`, timeEntryData);
      
      // Extract the ID from an object if timeEntryId is an object
      const id = typeof timeEntryId === 'object' 
        ? (timeEntryId as any).$id || (timeEntryId as any).id 
        : timeEntryId;
      
      // Transform from frontend TimeEntry format to database format
      const dataToUpdate: Record<string, any> = {};
      
      // Handle both frontend field names and direct database field names
      // Use type assertion to avoid TypeScript errors
      const data = timeEntryData as any;
      
      // Start time - check both frontend and database field names
      if (data.startTime !== undefined) {
        dataToUpdate.start_time = data.startTime;
      } else if (data.start_time !== undefined) {
        dataToUpdate.start_time = data.start_time;
      }
      
      // Stop time - check both frontend and database field names
      if (data.stopTime !== undefined) {
        dataToUpdate.stop_time = data.stopTime;
      } else if (data.stop_time !== undefined) {
        dataToUpdate.stop_time = data.stop_time;
      }
      
      // Duration - check both frontend and database field names
      if (data.duration !== undefined) {
        dataToUpdate.total_duration = data.duration;
      } else if (data.total_duration !== undefined) {
        dataToUpdate.total_duration = data.total_duration;
      }
      
      // Remarks
      if (data.remarks !== undefined) {
        dataToUpdate.remarks = data.remarks;
      }
      
      // Files
      if (data.files !== undefined) {
        dataToUpdate.files = data.files;
      }
      
      // Handle user_id object if present
      if (data.user_id !== undefined) {
        const userId = typeof data.user_id === 'object'
          ? (data.user_id as any).$id || (data.user_id as any).id
          : data.user_id;
        dataToUpdate.user_id = userId;
      }
      
      // Handle ticket_id object if present
      if (data.ticket_id !== undefined) {
        const ticketId = typeof data.ticket_id === 'object'
          ? (data.ticket_id as any).$id || (data.ticket_id as any).id
          : data.ticket_id;
        dataToUpdate.ticket_id = ticketId;
      }
      
      // If this is a direct API call with a minimal payload and no time fields,
      // add default values for required fields if they're missing
      if (Object.keys(dataToUpdate).length > 0 && 
          !dataToUpdate.start_time && 
          !('start_time' in dataToUpdate)) {
        console.log("Adding default start_time to partial update");
        dataToUpdate.start_time = new Date().toTimeString().split(' ')[0];
      }
      
      if (Object.keys(dataToUpdate).length > 0 && 
          !dataToUpdate.total_duration && 
          !('total_duration' in dataToUpdate)) {
        console.log("Adding default total_duration to partial update");
        dataToUpdate.total_duration = "0";
      }
      
      console.log(`Sending Appwrite update for time entry ${id} with data:`, dataToUpdate);
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION,
        id,
        dataToUpdate
      );
      console.log("Updated time entry:", response);
      return mapToTimeEntry(response);
    } catch (error) {
      console.error(`Error updating time entry ${timeEntryId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a time entry
   */
  deleteTimeEntry: async (timeEntryId: string): Promise<void> => {
    try {
      console.log(`Deleting time entry ${timeEntryId}`);
      await databases.deleteDocument(
        DATABASE_ID, 
        TIME_ENTRIES_COLLECTION, 
        timeEntryId
      );
      console.log(`Time entry ${timeEntryId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting time entry ${timeEntryId}:`, error);
      throw error;
    }
  }
}; 