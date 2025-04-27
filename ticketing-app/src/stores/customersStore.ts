import { create } from "zustand";

import {
  Customer,
  CustomerContact,
  customersService,
} from "@/services/customersService";

// Input type for creating/updating a customer
export type CustomerInput = Omit<
  Customer,
  "$id" | "$createdAt" | "$updatedAt" | "$permissions" | "$databaseId" | "$collectionId"
>;

// Input type for creating/updating a customer contact
export type CustomerContactInput = Omit<
  CustomerContact,
  "$id" | "$createdAt" | "$updatedAt" | "$permissions" | "$databaseId" | "$collectionId"
>;

interface CustomersState {
  customers: Customer[];
  customerContacts: { [customerId: string]: CustomerContact[] };
  loading: boolean;
  error: Error | null;
  fetchCustomers: () => Promise<void>;
  fetchCustomerContacts: (customerId: string) => Promise<void>;
  addCustomer: (customer: CustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<CustomerInput>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addCustomerContact: (contact: CustomerContactInput) => Promise<void>;
  updateCustomerContact: (
    id: string,
    updates: Partial<CustomerContactInput>,
  ) => Promise<void>;
  deleteCustomerContact: (id: string) => Promise<void>;
  getCustomerContacts: (customerId: string) => CustomerContact[];
}

const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  customerContacts: {},
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      const customers = await customersService.getAllCustomers();
      set({ customers, loading: false });
    } catch (error) {
      console.error("Error fetching customers:", error);
      set({
        error: error instanceof Error ? error : new Error("Failed to fetch customers"),
        loading: false,
      });
    }
  },

  fetchCustomerContacts: async (customerId: string) => {
    set({ loading: true, error: null });
    try {
      const contacts = await customersService.getCustomerContacts(customerId);
      set((state) => ({
        customerContacts: {
          ...state.customerContacts,
          [customerId]: contacts,
        },
        loading: false,
      }));
    } catch (error) {
      console.error(`Error fetching contacts for customer ${customerId}:`, error);
      set({
        error:
          error instanceof Error
            ? error
            : new Error(`Failed to fetch contacts for customer ${customerId}`),
        loading: false,
      });
    }
  },

  addCustomer: async (customerData) => {
    set({ loading: true, error: null });
    try {
      const newCustomer = await customersService.createCustomer(customerData);
      set((state) => ({
        customers: [...state.customers, newCustomer],
        loading: false,
      }));
      return newCustomer;
    } catch (error) {
      console.error("Error adding customer:", error);
      set({
        error: error instanceof Error ? error : new Error("Failed to add customer"),
        loading: false,
      });
      throw error;
    }
  },

  updateCustomer: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updatedCustomer = await customersService.updateCustomer(id, updates);
      set((state) => ({
        customers: state.customers.map((customer) =>
          customer.$id === id ? updatedCustomer : customer,
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Error updating customer:", error);
      set({
        error: error instanceof Error ? error : new Error("Failed to update customer"),
        loading: false,
      });
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    set({ loading: true, error: null });
    try {
      await customersService.deleteCustomer(id);
      set((state) => ({
        customers: state.customers.filter((customer) => customer.$id !== id),
        loading: false,
      }));
    } catch (error) {
      console.error("Error deleting customer:", error);
      set({
        error: error instanceof Error ? error : new Error("Failed to delete customer"),
        loading: false,
      });
      throw error;
    }
  },

  addCustomerContact: async (contactData) => {
    set({ loading: true, error: null });
    try {
      const newContact = await customersService.createCustomerContact(contactData);

      // Get the customer ID from the contact data
      const customerId =
        typeof contactData.customer_id === "string"
          ? contactData.customer_id
          : contactData.customer_id.$id;

      set((state) => {
        // Get current contacts for this customer or initialize empty array
        const currentContacts = state.customerContacts[customerId] || [];

        return {
          customerContacts: {
            ...state.customerContacts,
            [customerId]: [...currentContacts, newContact],
          },
          loading: false,
        };
      });
    } catch (error) {
      console.error("Error adding customer contact:", error);
      set({
        error:
          error instanceof Error ? error : new Error("Failed to add customer contact"),
        loading: false,
      });
      throw error;
    }
  },

  updateCustomerContact: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updatedContact = await customersService.updateCustomerContact(id, updates);

      set((state) => {
        // We need to find which customer this contact belongs to
        const customerId =
          typeof updatedContact.customer_id === "string"
            ? updatedContact.customer_id
            : updatedContact.customer_id.$id;

        // Get current contacts for this customer
        const currentContacts = state.customerContacts[customerId] || [];

        return {
          customerContacts: {
            ...state.customerContacts,
            [customerId]: currentContacts.map((contact) =>
              contact.$id === id ? updatedContact : contact,
            ),
          },
          loading: false,
        };
      });
    } catch (error) {
      console.error("Error updating customer contact:", error);
      set({
        error:
          error instanceof Error
            ? error
            : new Error("Failed to update customer contact"),
        loading: false,
      });
      throw error;
    }
  },

  deleteCustomerContact: async (id) => {
    set({ loading: true, error: null });
    try {
      // We need to find which customer this contact belongs to before deleting
      // Find the contact in our store first
      let customerId = "";
      let contactToDelete = null;

      // Search through all customer contacts to find the one with matching ID
      Object.entries(get().customerContacts).forEach(([cId, contacts]) => {
        const contact = contacts.find((c) => c.$id === id);
        if (contact) {
          customerId = cId;
          contactToDelete = contact;
        }
      });

      if (!contactToDelete) {
        throw new Error(`Contact with ID ${id} not found in store`);
      }

      // Now delete the contact
      await customersService.deleteCustomerContact(id);

      // Update the store
      set((state) => {
        const currentContacts = state.customerContacts[customerId] || [];

        return {
          customerContacts: {
            ...state.customerContacts,
            [customerId]: currentContacts.filter((contact) => contact.$id !== id),
          },
          loading: false,
        };
      });
    } catch (error) {
      console.error("Error deleting customer contact:", error);
      set({
        error:
          error instanceof Error
            ? error
            : new Error("Failed to delete customer contact"),
        loading: false,
      });
      throw error;
    }
  },

  getCustomerContacts: (customerId) => {
    const { customerContacts } = get();
    return customerContacts[customerId] || [];
  },
}));

export default useCustomersStore;
export type { Customer, CustomerContact };
