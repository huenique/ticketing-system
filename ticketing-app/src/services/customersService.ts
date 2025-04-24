import { databases, ID, Query } from "@/lib/appwrite";
import { Customer as CommonCustomer } from "@/types/common";

// Collection and database constants
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CUSTOMERS_COLLECTION = "customers";
const CUSTOMER_CONTACTS_COLLECTION = "customer_contacts";

// Define document metadata fields
interface DocumentMetadata {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $databaseId: string;
  $collectionId: string;
}

// Customer interface for Appwrite
export interface Customer extends DocumentMetadata {
  name: string;
  address: string;
  primary_contact_name: string;
  primary_contact_number: string;
  primary_email: string;
  abn?: string;
}

// Customer contact interface
export interface CustomerContact extends DocumentMetadata {
  customer_id: string | { $id: string };
  first_name: string;
  last_name: string;
  position?: string;
  contact_number: string;
  email: string;
}

// Type for creating a new customer (without metadata fields)
export type NewCustomer = Omit<Customer, keyof DocumentMetadata>;

// Type for creating a new customer contact (without metadata fields)
export type NewCustomerContact = Omit<CustomerContact, keyof DocumentMetadata>;

// Customers service object
export const customersService = {
  /**
   * Get all customers
   */
  getAllCustomers: async (): Promise<Customer[]> => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        [Query.limit(100)]
      );
      return response.documents as Customer[];
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
  },

  /**
   * Get a customer by ID
   */
  getCustomer: async (id: string): Promise<Customer> => {
    try {
      const customer = await databases.getDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        id
      );
      return customer as Customer;
    } catch (error) {
      console.error(`Error fetching customer ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new customer
   */
  createCustomer: async (customerData: NewCustomer): Promise<Customer> => {
    try {
      console.log('Creating customer with data:', JSON.stringify(customerData, null, 2));
      
      const customer = await databases.createDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        ID.unique(),
        customerData
      );
      
      console.log('Customer created successfully:', JSON.stringify(customer, null, 2));
      return customer as Customer;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  },

  /**
   * Update a customer
   */
  updateCustomer: async (id: string, customerData: Partial<NewCustomer>): Promise<Customer> => {
    try {
      const customer = await databases.updateDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        id,
        customerData
      );
      return customer as Customer;
    } catch (error) {
      console.error(`Error updating customer ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a customer
   */
  deleteCustomer: async (id: string): Promise<void> => {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        id
      );
    } catch (error) {
      console.error(`Error deleting customer ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get customer contacts
   */
  getCustomerContacts: async (customerId: string): Promise<CustomerContact[]> => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        [Query.equal("customer_id", customerId), Query.limit(100)]
      );
      return response.documents as CustomerContact[];
    } catch (error) {
      console.error(`Error fetching contacts for customer ${customerId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new customer contact
   */
  createCustomerContact: async (contactData: NewCustomerContact): Promise<CustomerContact> => {
    try {
      // Make a copy of the contactData to modify
      let dataToSend: any = { ...contactData };
      
      // Ensure customer_id is properly formatted
      if (contactData.customer_id && typeof contactData.customer_id === 'object') {
        // Make sure we're only sending the $id for the relationship
        dataToSend.customer_id = contactData.customer_id.$id;
      }
      
      const contact = await databases.createDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        ID.unique(),
        dataToSend
      );
      
      return contact as CustomerContact;
    } catch (error) {
      console.error("Error creating customer contact:", error);
      throw error;
    }
  },

  /**
   * Update a customer contact
   */
  updateCustomerContact: async (id: string, contactData: Partial<NewCustomerContact>): Promise<CustomerContact> => {
    try {
      // Make a copy of the contactData to modify
      let dataToSend: any = { ...contactData };
      
      // Ensure customer_id is properly formatted if it's being updated
      if (contactData.customer_id && typeof contactData.customer_id === 'object') {
        dataToSend.customer_id = contactData.customer_id.$id;
      }
      
      const contact = await databases.updateDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        id,
        dataToSend
      );
      
      return contact as CustomerContact;
    } catch (error) {
      console.error(`Error updating customer contact ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a customer contact
   */
  deleteCustomerContact: async (id: string): Promise<void> => {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        id
      );
    } catch (error) {
      console.error(`Error deleting customer contact ${id}:`, error);
      throw error;
    }
  }
};

export default customersService; 