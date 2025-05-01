import { databases, ID, Query } from "@/lib/appwrite";
import { TimeEntry } from "@/types/tickets";

// Collection ID constants
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TIME_ENTRIES_COLLECTION = "time_entries";

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
   */
  getTimeEntriesForTicket: async (ticketId: string): Promise<TimeEntry[]> => {
    try {
      console.log(`Fetching time entries for ticket: ${ticketId}`);
      const response = await databases.listDocuments(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION,
        [Query.equal("ticket_id", ticketId), Query.limit(100)]
      );
      console.log(`Found ${response.documents.length} time entries for ticket ${ticketId}`);
      return response.documents.map(mapToTimeEntry);
    } catch (error) {
      console.error(`Error fetching time entries for ticket ${ticketId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new time entry
   */
  createTimeEntry: async (timeEntryData: Omit<TimeEntry, "id">): Promise<TimeEntry> => {
    try {
      console.log("Creating new time entry:", timeEntryData);
      // Transform from frontend TimeEntry format to database format
      const dataToSave = {
        start_time: timeEntryData.startTime,
        stop_time: timeEntryData.stopTime,
        total_duration: timeEntryData.duration,
        remarks: timeEntryData.remarks,
        files: timeEntryData.files || [],
        ticket_id: timeEntryData.ticket_id,
        user_id: timeEntryData.user_id
      };
      
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
  updateTimeEntry: async (timeEntryId: string, timeEntryData: Partial<TimeEntry>): Promise<TimeEntry> => {
    try {
      console.log(`Updating time entry ${timeEntryId}:`, timeEntryData);
      
      // Transform from frontend TimeEntry format to database format
      const dataToUpdate: Record<string, any> = {};
      
      if (timeEntryData.startTime !== undefined) dataToUpdate.start_time = timeEntryData.startTime;
      if (timeEntryData.stopTime !== undefined) dataToUpdate.stop_time = timeEntryData.stopTime;
      if (timeEntryData.duration !== undefined) dataToUpdate.total_duration = timeEntryData.duration;
      if (timeEntryData.remarks !== undefined) dataToUpdate.remarks = timeEntryData.remarks;
      if (timeEntryData.files !== undefined) dataToUpdate.files = timeEntryData.files;
      if (timeEntryData.ticket_id !== undefined) dataToUpdate.ticket_id = timeEntryData.ticket_id;
      if (timeEntryData.user_id !== undefined) dataToUpdate.user_id = timeEntryData.user_id;
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION,
        timeEntryId,
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