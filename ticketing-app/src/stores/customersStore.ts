import { create } from "zustand";
import { getCollection, getDocument, createDocument, updateDocument, deleteDocument } from "@/lib/appwrite";

// Collection ID constants
const CUSTOMERS_COLLECTION = "customers";

export interface Contact {
  $id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  position: string;
  contact_number: string;
  email: string;
  $updatedAt?: string;
  $createdAt?: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}

export interface Customer {
  $id: string;
  name: string;
  address: string;
  primary_contact_name: string;
  primary_contact_number: string;
  primary_email: string;
  abn: string;
  $updatedAt?: string;
  $createdAt?: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
  // Store contacts as a property of customer if available from Appwrite
  contacts?: Contact[];
}

interface CustomersState {
  customers: Customer[];
  loading: boolean;
  error: Error | null;
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, "$id" | "$updatedAt" | "$createdAt" | "$permissions" | "$databaseId" | "$collectionId" | "contacts">) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addContact: (customerId: string, contact: Omit<Contact, "$id" | "$updatedAt" | "$createdAt" | "$permissions" | "$databaseId" | "$collectionId">) => Promise<void>;
  updateContact: (customerId: string, contactId: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (customerId: string, contactId: string) => Promise<void>;
  getCustomerContacts: (customerId: string) => Contact[];
}

const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await getCollection<Customer>(CUSTOMERS_COLLECTION);
      
      // Process contacts if they exist in the response
      const processedCustomers = response.documents.map(customer => {
        // Ensure contacts is always an array
        return {
          ...customer,
          contacts: customer.contacts || []
        };
      });
      
      set({ customers: processedCustomers, loading: false });
    } catch (error) {
      console.error("Error fetching customers:", error);
      set({ 
        error: error instanceof Error ? error : new Error("Failed to fetch customers"),
        loading: false 
      });
    }
  },

  addCustomer: async (customerData) => {
    set({ loading: true, error: null });
    try {
      // Initialize empty contacts array
      const customerWithContacts = { ...customerData, contacts: [] };
      const newCustomer = await createDocument<Customer>(CUSTOMERS_COLLECTION, customerWithContacts);
      
      set((state) => ({
        customers: [...state.customers, newCustomer],
        loading: false
      }));
      return newCustomer;
    } catch (error) {
      console.error("Error adding customer:", error);
      set({ 
        error: error instanceof Error ? error : new Error("Failed to add customer"),
        loading: false 
      });
      throw error;
    }
  },

  updateCustomer: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      // Ensure we don't overwrite contacts if not included in updates
      const customer = get().customers.find(c => c.$id === id);
      const contacts = customer?.contacts || [];
      
      // Only include contacts in the update if it's explicitly provided
      const updatesWithContacts = 'contacts' in updates 
        ? updates 
        : { ...updates, contacts };
        
      const updatedCustomer = await updateDocument<Customer>(CUSTOMERS_COLLECTION, id, updatesWithContacts);
      
      set((state) => ({
        customers: state.customers.map((customer) => customer.$id === id ? updatedCustomer : customer),
        loading: false
      }));
    } catch (error) {
      console.error("Error updating customer:", error);
      set({ 
        error: error instanceof Error ? error : new Error("Failed to update customer"),
        loading: false 
      });
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteDocument(CUSTOMERS_COLLECTION, id);
      set((state) => ({
        customers: state.customers.filter((customer) => customer.$id !== id),
        loading: false
      }));
    } catch (error) {
      console.error("Error deleting customer:", error);
      set({ 
        error: error instanceof Error ? error : new Error("Failed to delete customer"),
        loading: false 
      });
      throw error;
    }
  },

  addContact: async (customerId, contactData) => {
    set({ loading: true, error: null });
    try {
      // Find the customer
      const customer = get().customers.find(c => c.$id === customerId);
      if (!customer) throw new Error(`Customer with ID ${customerId} not found`);
      
      // Add the new contact to the existing contacts
      const updatedContacts = [...(customer.contacts || []), { 
        ...contactData,
        $id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate a temporary ID
        customer_id: customerId
      }];
      
      // Update the customer with the new contacts array
      const updatedCustomer = await updateDocument<Customer>(
        CUSTOMERS_COLLECTION, 
        customerId, 
        { contacts: updatedContacts }
      );
      
      // Update the local state
      set((state) => ({
        customers: state.customers.map(c => c.$id === customerId ? updatedCustomer : c),
        loading: false
      }));
    } catch (error) {
      console.error("Error adding contact:", error);
      set({ 
        error: error instanceof Error ? error : new Error("Failed to add contact"),
        loading: false 
      });
      throw error;
    }
  },

  updateContact: async (customerId, contactId, updates) => {
    set({ loading: true, error: null });
    try {
      // Find the customer
      const customer = get().customers.find(c => c.$id === customerId);
      if (!customer) throw new Error(`Customer with ID ${customerId} not found`);
      if (!customer.contacts) throw new Error(`No contacts found for customer ${customerId}`);
      
      // Update the specific contact
      const updatedContacts = customer.contacts.map(contact => 
        contact.$id === contactId ? { ...contact, ...updates } : contact
      );
      
      // Update the customer with the modified contacts array
      const updatedCustomer = await updateDocument<Customer>(
        CUSTOMERS_COLLECTION, 
        customerId, 
        { contacts: updatedContacts }
      );
      
      // Update the local state
      set((state) => ({
        customers: state.customers.map(c => c.$id === customerId ? updatedCustomer : c),
        loading: false
      }));
    } catch (error) {
      console.error("Error updating contact:", error);
      set({ 
        error: error instanceof Error ? error : new Error("Failed to update contact"),
        loading: false 
      });
      throw error;
    }
  },

  deleteContact: async (customerId, contactId) => {
    set({ loading: true, error: null });
    try {
      // Find the customer
      const customer = get().customers.find(c => c.$id === customerId);
      if (!customer) throw new Error(`Customer with ID ${customerId} not found`);
      if (!customer.contacts) throw new Error(`No contacts found for customer ${customerId}`);
      
      // Filter out the contact to delete
      const updatedContacts = customer.contacts.filter(contact => contact.$id !== contactId);
      
      // Update the customer with the filtered contacts array
      const updatedCustomer = await updateDocument<Customer>(
        CUSTOMERS_COLLECTION, 
        customerId, 
        { contacts: updatedContacts }
      );
      
      // Update the local state
      set((state) => ({
        customers: state.customers.map(c => c.$id === customerId ? updatedCustomer : c),
        loading: false
      }));
    } catch (error) {
      console.error("Error deleting contact:", error);
      set({ 
        error: error instanceof Error ? error : new Error("Failed to delete contact"),
        loading: false 
      });
      throw error;
    }
  },

  getCustomerContacts: (customerId) => {
    const { customers } = get();
    const customer = customers.find(c => c.$id === customerId);
    return customer?.contacts || [];
  }
}));

export default useCustomersStore;
