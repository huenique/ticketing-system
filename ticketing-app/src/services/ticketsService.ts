import { ID } from "appwrite";

import {
  createDocument,
  deleteDocument,
  getCollection,
  getDocument,
  updateDocument,
  databases,
} from "@/lib/appwrite";
import { Customer, Ticket, User } from "@/types/tickets";

// Collection ID constants
const TICKETS_COLLECTION = "tickets";
const STATUSES_COLLECTION = "statuses";
const USERS_COLLECTION = "users";
const CUSTOMERS_COLLECTION = "customers";
const USER_TYPES_COLLECTION = "user_types";

// Status interface
export interface Status {
  id: string;
  $id?: string; // Appwrite document ID
  label: string;
}

// Ticket service
export const ticketsService = {
  /**
   * Get all tickets with relationships populated
   */
  getAllTickets: async (): Promise<Ticket[]> => {
    const response = await getCollection<Ticket>(TICKETS_COLLECTION);
    return response.documents;
  },

  /**
   * Get tickets with additional data
   * This adapts to whether relationships are already expanded by Appwrite or need to be manually loaded
   */
  getTicketsWithRelationships: async () => {
    try {
      // Get tickets from collection
      const ticketsResponse = await getCollection<Ticket>(TICKETS_COLLECTION);
      const tickets = ticketsResponse.documents;

      // Check if relationships are already expanded
      const hasExpandedRelationships =
        tickets.length > 0 &&
        (typeof tickets[0].status_id === "object" ||
          typeof tickets[0].customer_id === "object" ||
          (Array.isArray(tickets[0].assignee_ids) &&
            tickets[0].assignee_ids.length > 0 &&
            typeof tickets[0].assignee_ids[0] === "object"));

      if (hasExpandedRelationships) {
        console.log("Using already expanded relationships from Appwrite");
        // Relationships are already expanded, just return the tickets as is
        return tickets;
      }

      // If relationships are not already expanded, load them manually
      console.log("Loading relationships manually");
      const [statusesResponse, customersResponse, usersResponse] = await Promise.all([
        getCollection<Status>(STATUSES_COLLECTION),
        getCollection<Customer>(CUSTOMERS_COLLECTION),
        getCollection<User>(USERS_COLLECTION),
      ]);

      const statuses = statusesResponse.documents;
      const customers = customersResponse.documents;
      const users = usersResponse.documents;

      // Create lookup maps for quick reference
      const statusMap = new Map(statuses.map((status) => [status.id, status]));
      const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
      const userMap = new Map(users.map((user) => [user.id, user]));

      // Return enhanced ticket objects with all related data
      return tickets.map((ticket) => ({
        ...ticket,
        // Add related data
        status: statusMap.get(ticket.status_id),
        customer: customerMap.get(ticket.customer_id),
        assignees:
          ticket.assignee_ids?.map((id: string) => userMap.get(id)).filter(Boolean) ||
          [],
      }));
    } catch (error) {
      console.error("Error fetching tickets with relationships:", error);
      throw error;
    }
  },

  /**
   * Get a single ticket by ID with relationships populated
   */
  getTicket: async (ticketId: string): Promise<Ticket> => {
    return getDocument<Ticket>(TICKETS_COLLECTION, ticketId);
  },

  /**
   * Get a single ticket with all relationships loaded
   */
  getTicketWithRelationships: async (ticketId: string) => {
    try {
      const ticket = await getDocument<Ticket>(TICKETS_COLLECTION, ticketId);

      // Check if we have valid IDs for the related entities
      if (!ticket.status_id && !ticket.customer_id) {
        console.warn(`Ticket ${ticketId} is missing required relationship IDs`, ticket);
      }

      const isObjectWithId = (value: unknown): value is Status => {
        return typeof value === "object" && value !== null && "$id" in value;
      };

      // Get the status_id as a string if possible
      let statusId = null;
      if (typeof ticket.status_id === "string") {
        statusId = ticket.status_id;
      } else if (isObjectWithId(ticket.status_id)) {
        statusId = (ticket.status_id as Status).$id;
      }

      // Get the customer_id as a string if possible
      let customerId = null;
      if (typeof ticket.customer_id === "string") {
        customerId = ticket.customer_id;
      } else if (isObjectWithId(ticket.customer_id)) {
        customerId = (ticket.customer_id as Status).$id;
      }

      // Process assignee IDs to ensure they're strings
      let assigneeIds: string[] = [];
      if (Array.isArray(ticket.assignee_ids)) {
        assigneeIds = ticket.assignee_ids
          .map((id) => {
            if (typeof id === "string") return id;
            if (isObjectWithId(id)) return (id as Status).$id;
            return null;
          })
          .filter((id) => id !== null) as string[];
      }

      // Fetch related data in parallel
      const [status, customer, users] = await Promise.all([
        statusId ? getDocument<Status>(STATUSES_COLLECTION, statusId) : null,
        customerId ? getDocument<Customer>(CUSTOMERS_COLLECTION, customerId) : null,
        Promise.all(
          assigneeIds.map((id) =>
            getDocument<User>(USERS_COLLECTION, id).catch((err) => {
              console.warn(`Failed to get user with ID ${id}`, err);
              return null;
            }),
          ),
        ),
      ]);

      return {
        ...ticket,
        status,
        customer,
        assignees: users.filter(Boolean), // Filter out any failed user fetches
      };
    } catch (error) {
      console.error(`Error fetching ticket ${ticketId} with relationships:`, error);
      throw error;
    }
  },

  /**
   * Create a new ticket
   */
  createTicket: async (ticketData: Omit<Ticket, "id">): Promise<Ticket> => {
    try {
      // Generate a unique ID for the document
      const documentId = ID.unique();

      // Create a copy of the ticketData to modify
      const formattedTicketData = { ...ticketData };

      // Process status_id (many-to-one relationship)
      if (formattedTicketData.status_id) {
        if (
          typeof formattedTicketData.status_id === "object" &&
          "$id" in formattedTicketData.status_id
        ) {
          // If it's an object with $id, extract the ID
          formattedTicketData.status_id = (
            formattedTicketData.status_id as {
              $id: string;
            }
          ).$id;
        }
        // If it's already a string, keep it as is
      }

      // Process customer_id (many-to-one relationship)
      if (formattedTicketData.customer_id) {
        if (
          typeof formattedTicketData.customer_id === "object" &&
          "$id" in formattedTicketData.customer_id
        ) {
          // If it's an object with $id, extract the ID
          formattedTicketData.customer_id = (
            formattedTicketData.customer_id as {
              $id: string;
            }
          ).$id;
        }
        // If it's already a string, keep it as is
      }

      // Process assignee_ids (many-to-many relationship)
      if (formattedTicketData.assignee_ids) {
        if (Array.isArray(formattedTicketData.assignee_ids)) {
          // Make sure all array elements are strings (not objects)
          formattedTicketData.assignee_ids = formattedTicketData.assignee_ids.map(
            (item: string | { $id: string }) =>
              typeof item === "string" ? item : item.$id || "",
          );
        } else if (typeof formattedTicketData.assignee_ids === "string") {
          // If it's a single string ID, convert to array
          formattedTicketData.assignee_ids = [formattedTicketData.assignee_ids];
        } else if (
          typeof formattedTicketData.assignee_ids === "object" &&
          "$id" in formattedTicketData.assignee_ids
        ) {
          // If it's an object with $id, extract the ID and convert to array
          formattedTicketData.assignee_ids = [
            (formattedTicketData.assignee_ids as { $id: string }).$id,
          ];
        }
      } else {
        // Ensure we have an empty array if no assignees
        formattedTicketData.assignee_ids = [];
      }

      // Process part_ids (many-to-many relationship)
      if (formattedTicketData.part_ids) {
        if (Array.isArray(formattedTicketData.part_ids)) {
          // Make sure all array elements are strings (not objects)
          formattedTicketData.part_ids = formattedTicketData.part_ids.map(
            (item: string | { $id: string }) =>
              typeof item === "string" ? item : item.$id || "",
          );
        } else if (typeof formattedTicketData.part_ids === "string") {
          // If it's a single string ID, convert to array
          formattedTicketData.part_ids = [formattedTicketData.part_ids];
        } else if (
          typeof formattedTicketData.part_ids === "object" &&
          "$id" in formattedTicketData.part_ids
        ) {
          // If it's an object with $id, extract the ID and convert to array
          formattedTicketData.part_ids = [
            (formattedTicketData.part_ids as { $id: string }).$id,
          ];
        }
      }

      console.log(
        "Creating ticket with formatted data:",
        JSON.stringify(formattedTicketData, null, 2),
      );

      // Create the document with the generated ID
      const createdTicket = await createDocument<Ticket>(
        TICKETS_COLLECTION,
        formattedTicketData,
        documentId,
      );

      // Ensure the returned document has an id property
      // Appwrite returns documents with $id property that we need to map to our id property
      const ticket = createdTicket as unknown as Ticket & { $id?: string };
      if (!ticket.id && ticket.$id) {
        ticket.id = ticket.$id;
      }

      console.log("Created ticket:", ticket);

      return ticket;
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }
  },

  /**
   * Update an existing ticket
   */
  updateTicket: async (
    ticketId: string,
    ticketData: Partial<Ticket>,
  ): Promise<Ticket> => {
    try {
      // Create a copy of the ticketData to modify
      const formattedTicketData = { ...ticketData };

      // Process status_id (many-to-one relationship) if included in the update
      if (formattedTicketData.status_id !== undefined) {
        if (
          typeof formattedTicketData.status_id === "object" &&
          "$id" in formattedTicketData.status_id
        ) {
          // If it's an object with $id, extract the ID safely
          formattedTicketData.status_id = (
            formattedTicketData.status_id as {
              $id: string;
            }
          ).$id;
        }
        // If it's already a string, keep it as is
      }

      // Process customer_id (many-to-one relationship) if included in the update
      if (formattedTicketData.customer_id !== undefined) {
        if (
          typeof formattedTicketData.customer_id === "object" &&
          "$id" in formattedTicketData.customer_id
        ) {
          // If it's an object with $id, extract the ID
          formattedTicketData.customer_id = (
            formattedTicketData.customer_id as {
              $id: string;
            }
          ).$id;
        }
        // If it's already a string, keep it as is
      }

      // Process assignee_ids (many-to-many relationship) if included in the update
      if (formattedTicketData.assignee_ids !== undefined) {
        if (Array.isArray(formattedTicketData.assignee_ids)) {
          // Make sure all array elements are strings (not objects)
          formattedTicketData.assignee_ids = formattedTicketData.assignee_ids.map(
            (item: string | { $id: string }) =>
              typeof item === "string" ? item : item.$id || "",
          );
        } else if (typeof formattedTicketData.assignee_ids === "string") {
          // If it's a single string ID, convert to array
          formattedTicketData.assignee_ids = [formattedTicketData.assignee_ids];
        } else if (
          typeof formattedTicketData.assignee_ids === "object" &&
          "$id" in formattedTicketData.assignee_ids
        ) {
          // If it's an object with $id, extract the ID and convert to array
          formattedTicketData.assignee_ids = [
            (formattedTicketData.assignee_ids as { $id: string }).$id,
          ];
        }
      }

      // Process part_ids (many-to-many relationship) if included in the update
      if (formattedTicketData.part_ids !== undefined) {
        if (Array.isArray(formattedTicketData.part_ids)) {
          // Make sure all array elements are strings (not objects)
          formattedTicketData.part_ids = formattedTicketData.part_ids.map(
            (item: string | { $id: string }) =>
              typeof item === "string" ? item : item.$id || "",
          );
        } else if (typeof formattedTicketData.part_ids === "string") {
          // If it's a single string ID, convert to array
          formattedTicketData.part_ids = [formattedTicketData.part_ids];
        } else if (
          typeof formattedTicketData.part_ids === "object" &&
          "$id" in formattedTicketData.part_ids
        ) {
          // If it's an object with $id, extract the ID and convert to array
          formattedTicketData.part_ids = [
            (formattedTicketData.part_ids as { $id: string }).$id,
          ];
        }
      }

      console.log(
        "Updating ticket with formatted data:",
        JSON.stringify(formattedTicketData, null, 2),
      );

      const updatedTicket = await updateDocument<Ticket>(
        TICKETS_COLLECTION,
        ticketId,
        formattedTicketData,
      );

      return updatedTicket;
    } catch (error) {
      console.error(`Error updating ticket ${ticketId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a ticket
   */
  deleteTicket: async (ticketId: string): Promise<void> => {
    return deleteDocument(TICKETS_COLLECTION, ticketId);
  },
};

// Status service
export const statusesService = {
  /**
   * Get all statuses
   */
  getAllStatuses: async (): Promise<Status[]> => {
    const response = await getCollection<Status>(STATUSES_COLLECTION);
    return response.documents;
  },

  /**
   * Get a single status by ID
   */
  getStatus: async (id: string): Promise<Status> => {
    return getDocument<Status>(STATUSES_COLLECTION, id);
  },

  /**
   * Create a new status
   */
  createStatus: async (data: Omit<Status, "id">): Promise<Status> => {
    return createDocument<Status>(STATUSES_COLLECTION, data);
  },

  /**
   * Update an existing status
   */
  updateStatus: async (id: string, data: Partial<Status>): Promise<Status> => {
    return updateDocument<Status>(STATUSES_COLLECTION, id, data);
  },

  /**
   * Delete a status
   */
  deleteStatus: async (id: string): Promise<void> => {
    return deleteDocument(STATUSES_COLLECTION, id);
  },
};

// Customer service
export const customersService = {
  /**
   * Get all customers
   */
  getAllCustomers: async (): Promise<Customer[]> => {
    const response = await getCollection<Customer>(CUSTOMERS_COLLECTION);
    return response.documents;
  },

  /**
   * Get a customer by ID
   */
  getCustomer: async (id: string): Promise<Customer> => {
    return getDocument<Customer>(CUSTOMERS_COLLECTION, id);
  },

  /**
   * Create a new customer
   */
  createCustomer: async (data: Omit<Customer, "id">): Promise<Customer> => {
    return createDocument<Customer>(CUSTOMERS_COLLECTION, data);
  },

  /**
   * Update a customer
   */
  updateCustomer: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    return updateDocument<Customer>(CUSTOMERS_COLLECTION, id, data);
  },

  /**
   * Delete a customer
   */
  deleteCustomer: async (id: string): Promise<void> => {
    return deleteDocument(CUSTOMERS_COLLECTION, id);
  },
};

// User service
export const usersService = {
  /**
   * Get all users
   */
  getAllUsers: async (): Promise<User[]> => {
    const response = await getCollection<User>(USERS_COLLECTION);
    return response.documents;
  },

  /**
   * Get all user types
   */
  getAllUserTypes: async (): Promise<never[]> => {
    const response = await getCollection<never>(USER_TYPES_COLLECTION);
    return response.documents;
  },

  /**
   * Get a user by ID
   */
  getUser: async (id: string): Promise<User> => {
    return getDocument<User>(USERS_COLLECTION, id);
  },

  /**
   * Create a new user
   */
  createUser: async (userData: Omit<User, "id">): Promise<User> => {
    return createDocument<User>(USERS_COLLECTION, userData);
  },

  /**
   * Update a user
   */
  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    return updateDocument<User>(USERS_COLLECTION, id, userData);
  },

  /**
   * Delete a user
   */
  deleteUser: async (id: string): Promise<void> => {
    return deleteDocument(USERS_COLLECTION, id);
  },

  /**
   * Get user's full name
   */
  getUserFullName: (user: User): string => {
    return `${user.first_name} ${user.last_name}`;
  },
};

// Ticket Assignments Service
export const ticketAssignmentsService = {
  // Create a ticket assignment
  createTicketAssignment: async (data: { 
    ticket_id: string; 
    user_id: string;
    work_description?: string;
    estimated_time?: string;
    actual_time?: string;
  }) => {
    try {
      const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const response = await databases.createDocument(
        DATABASE_ID,
        'ticket_assignments',
        ID.unique(),
        {
          ticket_id: data.ticket_id,
          user_id: data.user_id,
          work_description: data.work_description || '',
          estimated_time: data.estimated_time || '',
          actual_time: data.actual_time || ''
        }
      );
      
      return response;
    } catch (error) {
      console.error('Error creating ticket assignment:', error);
      throw error;
    }
  },
};
