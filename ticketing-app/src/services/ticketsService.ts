import { Customer, Ticket, User } from "@/types/tickets";
import { 
  getCollection, 
  getDocument, 
  createDocument, 
  updateDocument, 
  deleteDocument 
} from "@/lib/appwrite";

// Collection ID constants
const TICKETS_COLLECTION = "tickets";
const STATUSES_COLLECTION = "statuses";
const USERS_COLLECTION = "users";
const CUSTOMERS_COLLECTION = "customers";
const USER_TYPES_COLLECTION = "user_types";

// Status interface
export interface Status {
  id: string;
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
      const ticketsResponse = await getCollection<any>(TICKETS_COLLECTION);
      const tickets = ticketsResponse.documents;
      
      // Check if relationships are already expanded
      const hasExpandedRelationships = tickets.length > 0 && 
        (typeof tickets[0].status_id === 'object' || 
         typeof tickets[0].customer_id === 'object' ||
         (Array.isArray(tickets[0].assignee_ids) && 
          tickets[0].assignee_ids.length > 0 && 
          typeof tickets[0].assignee_ids[0] === 'object'));
      
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
        getCollection<User>(USERS_COLLECTION)
      ]);

      const statuses = statusesResponse.documents;
      const customers = customersResponse.documents;
      const users = usersResponse.documents;

      // Create lookup maps for quick reference
      const statusMap = new Map(statuses.map(status => [status.id, status]));
      const customerMap = new Map(customers.map(customer => [customer.id, customer]));
      const userMap = new Map(users.map(user => [user.id, user]));

      // Return enhanced ticket objects with all related data
      return tickets.map(ticket => ({
        ...ticket,
        // Add related data
        status: statusMap.get(ticket.status_id),
        customer: customerMap.get(ticket.customer_id),
        assignees: ticket.assignee_ids?.map((id: string) => userMap.get(id)).filter(Boolean) || []
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
      
      // Fetch related data in parallel
      const [status, customer, users] = await Promise.all([
        getDocument<Status>(STATUSES_COLLECTION, ticket.status_id),
        getDocument<Customer>(CUSTOMERS_COLLECTION, ticket.customer_id),
        Promise.all((ticket.assignee_ids || []).map(id => 
          getDocument<User>(USERS_COLLECTION, id)
        ))
      ]);

      return {
        ...ticket,
        status,
        customer,
        assignees: users
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
    return createDocument<Ticket>(TICKETS_COLLECTION, ticketData);
  },

  /**
   * Update an existing ticket
   */
  updateTicket: async (ticketId: string, ticketData: Partial<Ticket>): Promise<Ticket> => {
    return updateDocument<Ticket>(TICKETS_COLLECTION, ticketId, ticketData);
  },

  /**
   * Delete a ticket
   */
  deleteTicket: async (ticketId: string): Promise<void> => {
    return deleteDocument(TICKETS_COLLECTION, ticketId);
  }
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
  }
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
  }
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
  getAllUserTypes: async (): Promise<any[]> => {
    const response = await getCollection<any>(USER_TYPES_COLLECTION);
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
  }
}; 