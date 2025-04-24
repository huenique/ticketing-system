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
      console.log(`Fetching contacts for customer ID: ${customerId}`);
      
      // When querying on relationship fields in Appwrite, we should list all documents
      // and then filter client-side for contacts that belong to this customer
      const response = await databases.listDocuments(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        [Query.limit(100)]
      );
      
      console.log("Raw contacts response:", JSON.stringify(response, null, 2));
      
      // Filter documents to only include those belonging to the specified customer
      const customerContacts = response.documents.filter(doc => {
        const customerId_field = doc.customer_id;
        
        // Handle all possible representations of customer_id
        if (typeof customerId_field === 'string') {
          return customerId_field === customerId;
        } else if (Array.isArray(customerId_field)) {
          // When it's an array of customer objects
          return customerId_field.some(customer => customer.$id === customerId);
        } else if (customerId_field && typeof customerId_field === 'object' && '$id' in customerId_field) {
          return customerId_field.$id === customerId;
        }
        return false;
      });
      
      console.log(`Retrieved ${customerContacts.length} contacts:`, customerContacts);
      return customerContacts as CustomerContact[];
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
      
      // For relationship fields, we need to provide an array of IDs
      // Handle different possible formats of customer_id
      if (contactData.customer_id) {
        if (typeof contactData.customer_id === 'string') {
          // If it's a string ID, convert to array of IDs
          dataToSend.customer_id = [contactData.customer_id];
        } else if (typeof contactData.customer_id === 'object' && '$id' in contactData.customer_id) {
          // If it's an object with $id, extract the ID and convert to array
          dataToSend.customer_id = [contactData.customer_id.$id];
        } else if (Array.isArray(contactData.customer_id)) {
          // If it's already an array, keep it as is
          // (but make sure it contains strings/IDs not objects)
          dataToSend.customer_id = (contactData.customer_id as any[]).map((item: any) => 
            typeof item === 'string' ? item : item.$id
          );
        }
      }
      
      console.log('Creating contact with formatted data:', JSON.stringify(dataToSend, null, 2));
      
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
      if (contactData.customer_id) {
        if (typeof contactData.customer_id === 'string') {
          // If it's a string ID, convert to array of IDs
          dataToSend.customer_id = [contactData.customer_id];
        } else if (typeof contactData.customer_id === 'object' && '$id' in contactData.customer_id) {
          // If it's an object with $id, extract the ID and convert to array
          dataToSend.customer_id = [contactData.customer_id.$id];
        } else if (Array.isArray(contactData.customer_id)) {
          // If it's already an array, keep it as is
          // (but make sure it contains strings/IDs not objects)
          dataToSend.customer_id = (contactData.customer_id as any[]).map((item: any) => 
            typeof item === 'string' ? item : item.$id
          );
        }
      }
      
      console.log('Updating contact with formatted data:', JSON.stringify(dataToSend, null, 2));
      
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