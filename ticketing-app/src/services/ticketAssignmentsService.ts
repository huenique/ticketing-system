import { ID } from "appwrite";

import {
  createDocument,
  deleteDocument,
  getCollection,
  getDocument,
  Query,
  updateDocument,
} from "@/lib/appwrite";
import { Assignee, TicketAssignment } from "@/types/tickets";
import { User } from "@/types/tickets";

// Collection ID constants
const TICKET_ASSIGNMENTS_COLLECTION = "ticket_assignments";
const USERS_COLLECTION = "users";

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
   */
  getAssignmentsByTicketId: async (ticketId: string): Promise<TicketAssignment[]> => {
    const response = await getCollection<TicketAssignment>(TICKET_ASSIGNMENTS_COLLECTION, [
      Query.equal("ticket_id", ticketId),
      Query.limit(100),
    ]);
    return response.documents;
  },

  /**
   * Get a single ticket assignment by ID
   */
  getTicketAssignment: async (assignmentId: string): Promise<TicketAssignment> => {
    return getDocument<TicketAssignment>(TICKET_ASSIGNMENTS_COLLECTION, assignmentId);
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
        work_description: assignee.workDescription,
        estimated_time: assignee.estTime,
        actual_time: assignee.totalHours,
        user_id: assignee.user_id || "",
        ticket_id: ticketId
      };

      return await ticketAssignmentsService.createTicketAssignment(assignmentData);
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
        id: assignment.id,
        name: userName,
        workDescription: assignment.work_description,
        totalHours: assignment.actual_time,
        estTime: assignment.estimated_time,
        priority: "1", // Default priority
        user_id: assignment.user_id,
        ticket_id: assignment.ticket_id
      };
    } catch (error) {
      console.error("Error converting assignment to assignee:", error);
      throw error;
    }
  },

  /**
   * Get all assignments for a ticket and convert them to Assignee objects
   */
  getAssigneesForTicket: async (ticketId: string): Promise<Assignee[]> => {
    try {
      const assignments = await ticketAssignmentsService.getAssignmentsByTicketId(ticketId);
      
      // Convert each assignment to an assignee
      const assignees = await Promise.all(
        assignments.map(assignment => ticketAssignmentsService.assignmentToAssignee(assignment))
      );
      
      return assignees;
    } catch (error) {
      console.error(`Error getting assignees for ticket ${ticketId}:`, error);
      throw error;
    }
  }
}; 