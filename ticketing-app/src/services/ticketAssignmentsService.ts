import { ID } from "appwrite";

import {
  createDocument,
  deleteDocument,
  getCollection,
  getDocument,
  Query,
  updateDocument,
  databases,
} from "@/lib/appwrite";
import { getCurrentUserRole } from "@/lib/userUtils";
import { authService } from "@/lib/appwrite";
import { Assignee, TicketAssignment, Ticket } from "@/types/tickets";
import { User } from "@/types/tickets";

// Collection ID constants
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TICKET_ASSIGNMENTS_COLLECTION = "ticket_assignments";
const USERS_COLLECTION = "users";
const TICKETS_COLLECTION = "tickets";

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

// Ticket assignments service
export const ticketAssignmentsService = {
  /**
   * Get all ticket assignments
   */
  getAllTicketAssignments: async (): Promise<TicketAssignment[]> => {
    const response = await getCollection<TicketAssignment>(TICKET_ASSIGNMENTS_COLLECTION, [
      Query.limit(100),
    ]);
    return response.documents;
  },

  /**
   * Get ticket assignments by ticket ID
   * If user is admin, return all assignments for the ticket
   * If user is not admin, return only assignments for the current user
   * Filtering is done client-side after fetching all data for the ticket
   * @param ticketId - The ticket ID to get assignments for
   * @param showAllForPipeline - If true, shows all assignments regardless of user role (for Pipeline tab)
   */
  getAssignmentsByTicketId: async (ticketId: string, showAllForPipeline: boolean = false): Promise<TicketAssignment[]> => {
    try {
      console.log(`Fetching assignments for ticket: ${ticketId}`);
      
      // Fetch all assignments for this ticket
      const response = await getCollection<TicketAssignment>(TICKET_ASSIGNMENTS_COLLECTION, [
        Query.equal("ticket_id", ticketId),
        Query.limit(100),
      ]);
      
      console.log(`Found ${response.documents.length} assignments for ticket ${ticketId}`);
      
      // Get all assignments
      const allAssignments = response.documents;
      
      // Check user role
      const userRole = await getCurrentUserRole();
      console.log(`Current user role: ${userRole}`);
      
      // If admin or showAllForPipeline is true, return all assignments
      if (userRole === "admin" || showAllForPipeline) {
        console.log(showAllForPipeline ? "Pipeline tab requested, showing all assignments for ticket" : "User is admin, showing all assignments for ticket");
        return allAssignments;
      }
      
      // Otherwise filter by current user's database ID
      // First get the auth user
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser && currentUser.$id) {
        // Convert auth user ID to database user ID
        const dbUserId = await getDatabaseUserIdFromAuthId(currentUser.$id);
        
        if (dbUserId) {
          console.log(`Filtering assignments for database user ID: ${dbUserId}`);
          
          // Filter assignments to only include those assigned to the current user's database ID
          const filteredAssignments = allAssignments.filter(assignment => {
            // Get the user_id from the assignment
            const assignmentUserId = typeof assignment.user_id === 'object'
              ? (assignment.user_id as any).$id || (assignment.user_id as any).id
              : assignment.user_id;
            
            // Match against the database user ID
            return assignmentUserId === dbUserId;
          });
          
          console.log(`Filtered to ${filteredAssignments.length} assignments for database user ID: ${dbUserId}`);
          return filteredAssignments;
        }
      }
      
      // If we can't get the database user ID, return all assignments instead of an empty array
      console.warn("Could not get database user ID for filtering assignments, showing all assignments");
      return allAssignments;
    } catch (error) {
      console.error(`Error fetching assignments for ticket ${ticketId}:`, error);
      throw error;
    }
  },

  /**
   * Get a single ticket assignment by ID
   */
  getTicketAssignment: async (assignmentId: string): Promise<TicketAssignment> => {
    // Extract the ID from an object if assignmentId is an object
    const id = typeof assignmentId === 'object' 
      ? (assignmentId as any).$id || (assignmentId as any).id 
      : assignmentId;
      
    return getDocument<TicketAssignment>(TICKET_ASSIGNMENTS_COLLECTION, id);
  },

  /**
   * Create a new ticket assignment
   */
  createTicketAssignment: async (
    assignmentData: Omit<TicketAssignment, "id">
  ): Promise<TicketAssignment> => {
    try {
      // Generate a unique ID for the document
      const documentId = ID.unique();

      // Create the document with the generated ID
      const createdAssignment = await createDocument<TicketAssignment>(
        TICKET_ASSIGNMENTS_COLLECTION,
        assignmentData,
        documentId
      );
      
      return createdAssignment;
    } catch (error) {
      console.error("Error creating ticket assignment:", error);
      throw error;
    }
  },

  /**
   * Create a ticket assignment from an Assignee object
   */
  createAssignmentFromAssignee: async (
    assignee: Assignee,
    ticketId: string
  ): Promise<TicketAssignment> => {
    try {
      // Map the Assignee properties to TicketAssignment properties
      const assignmentData: Omit<TicketAssignment, "id"> = {
        work_description: assignee.workDescription || "",
        estimated_time: assignee.estTime,
        actual_time: assignee.totalHours,
        user_id: assignee.user_id || "",
        ticket_id: ticketId,
        is_done: assignee.is_done || false,
        priority: assignee.priority || "5"
      };

      // Create the ticket assignment
      const createdAssignment = await ticketAssignmentsService.createTicketAssignment(assignmentData);

      // Get the current ticket to update its assignee_ids
      const ticket = await getDocument<Ticket>(TICKETS_COLLECTION, ticketId);
      
      // Ensure assignee_ids is an array
      const currentAssigneeIds = Array.isArray(ticket.assignee_ids) ? ticket.assignee_ids : [];
      
      // Add the new user_id if it's not already in the array
      if (assignee.user_id && !currentAssigneeIds.includes(assignee.user_id)) {
        const updatedAssigneeIds = [...currentAssigneeIds, assignee.user_id];
        
        // Update the ticket with the new assignee_ids
        await updateDocument<Ticket>(
          TICKETS_COLLECTION,
          ticketId,
          { assignee_ids: updatedAssigneeIds }
        );
      }

      return createdAssignment;
    } catch (error) {
      console.error("Error creating ticket assignment from assignee:", error);
      throw error;
    }
  },

  /**
   * Update an existing ticket assignment
   */
  updateTicketAssignment: async (
    assignmentId: string,
    assignmentData: Partial<TicketAssignment>
  ): Promise<TicketAssignment> => {
    return updateDocument<TicketAssignment>(
      TICKET_ASSIGNMENTS_COLLECTION,
      assignmentId,
      assignmentData
    );
  },

  /**
   * Delete a ticket assignment
   */
  deleteTicketAssignment: async (assignmentId: string): Promise<void> => {
    return deleteDocument(TICKET_ASSIGNMENTS_COLLECTION, assignmentId);
  },

  /**
   * Convert a TicketAssignment to an Assignee object
   */
  assignmentToAssignee: async (assignment: TicketAssignment): Promise<Assignee> => {
    try {
      let userName = "Unknown User";
      
      // Make sure we have a valid ID
      // Handle both standard Appwrite response format ($id) and our own model (id)
      const assignmentId = (assignment as any).$id || assignment.id || `temp-${Date.now()}`;
      
      if (assignment.user_id) {
        try {
          // Ensure user_id is a string, not an object
          const userId = typeof assignment.user_id === 'object' 
            ? (assignment.user_id as any).$id || (assignment.user_id as any).id || String(assignment.user_id)
            : assignment.user_id;
            
          const user = await getDocument<User>(USERS_COLLECTION, userId);
          if (user) {
            userName = `${user.first_name} ${user.last_name}`;
          }
        } catch (error) {
          console.warn(`Could not fetch user with ID ${assignment.user_id}`, error);
        }
      }
      
      return {
        id: assignmentId,
        name: userName,
        workDescription: assignment.work_description || "",
        totalHours: assignment.actual_time || "0",
        estTime: assignment.estimated_time || "0",
        priority: assignment.priority || "5",
        user_id: assignment.user_id,
        ticket_id: assignment.ticket_id,
        is_done: assignment.is_done || false
      };
    } catch (error) {
      console.error("Error converting assignment to assignee:", error);
      throw error;
    }
  },

  /**
   * Get all assignments for a ticket and convert them to Assignee objects
   * Respects role-based access control - regular users only see their own assignments
   * @param ticketId - The ticket ID to get assignees for
   * @param showAllForPipeline - If true, shows all assignees regardless of user role (for Pipeline tab)
   */
  getAssigneesForTicket: async (ticketId: string, showAllForPipeline: boolean = false): Promise<Assignee[]> => {
    try {
      // This will apply the role-based filtering internally
      const assignments = await ticketAssignmentsService.getAssignmentsByTicketId(ticketId, showAllForPipeline);
      
      // Convert each assignment to an assignee
      const assignees = await Promise.all(
        assignments.map(assignment => ticketAssignmentsService.assignmentToAssignee(assignment))
      );
      
      console.log(`Converted ${assignees.length} assignments to assignees for ticket ${ticketId}`);
      return assignees;
    } catch (error) {
      console.error(`Error getting assignees for ticket ${ticketId}:`, error);
      throw error;
    }
  }
}; 