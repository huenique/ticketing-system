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
  customer_contact_ids?: Array<string | { $id: string } | CustomerContact>;
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
  getAllCustomers: async (options?: { limit?: number; offset?: number }): Promise<{ customers: Customer[], total: number }> => {
    try {
      const limit = options?.limit || 20; // Default to 20 items per page
      const offset = options?.offset || 0;

      // Use the provided pagination parameters
      const response = await databases.listDocuments(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        [Query.limit(limit), Query.offset(offset)]
      );

      console.log(`Fetched ${response.documents.length} customers (page ${Math.floor(offset/limit) + 1})`);
      
      return {
        customers: response.documents as Customer[],
        total: response.total // Appwrite provides the total count
      };
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
  },

  /**
   * Get all customers (fetches all pages)
   */
  getAllCustomersUnpaginated: async (): Promise<Customer[]> => {
    try {
      const allCustomers: Customer[] = [];
      const limit = 100; // Maximum allowed by Appwrite
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          CUSTOMERS_COLLECTION,
          [Query.limit(limit), Query.offset(offset)]
        );

        allCustomers.push(...response.documents as Customer[]);
        
        // Check if we've received fewer documents than requested, meaning we've reached the end
        if (response.documents.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      console.log(`Fetched ${allCustomers.length} customers in total`);
      return allCustomers;
    } catch (error) {
      console.error("Error fetching all customers:", error);
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
        id,
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
      console.log(
        "Creating customer with data:",
        JSON.stringify(customerData, null, 2),
      );

      const customer = await databases.createDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        ID.unique(),
        customerData,
      );

      console.log("Customer created successfully:", JSON.stringify(customer, null, 2));
      return customer as Customer;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  },

  /**
   * Update a customer
   */
  updateCustomer: async (
    id: string,
    customerData: Partial<NewCustomer>,
  ): Promise<Customer> => {
    try {
      const customer = await databases.updateDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        id,
        customerData,
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
      await databases.deleteDocument(DATABASE_ID, CUSTOMERS_COLLECTION, id);
    } catch (error) {
      console.error(`Error deleting customer ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get customer contacts
   * Note: This method is now simplified since contacts are included in the customer data
   */
  getCustomerContacts: async (customerId: string): Promise<CustomerContact[]> => {
    try {
      console.log(`Getting contacts for customer ID: ${customerId}`);
      
      // Get the customer document which now includes the full contact objects
      const customer = await databases.getDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        customerId
      );
      
      // Check if customer has the contact relationship field
      if (!customer.customer_contact_ids || !Array.isArray(customer.customer_contact_ids)) {
        console.log("No contacts found for this customer (relationship field empty)");
        return [];
      }
      
      console.log(`Found ${customer.customer_contact_ids.length} contacts in customer data`);
      
      // Return the contacts directly from the customer object
      return customer.customer_contact_ids as CustomerContact[];
    } catch (error) {
      console.error(`Error getting contacts for customer ${customerId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new customer contact
   */
  createCustomerContact: async (
    contactData: NewCustomerContact,
  ): Promise<CustomerContact> => {
    try {
      // Make a copy of the contactData to modify
      const dataToSend: any = { ...contactData };

      // For relationship fields, we need to provide an array of IDs
      // Handle different possible formats of customer_id
      if (contactData.customer_id) {
        if (typeof contactData.customer_id === "string") {
          // If it's a string ID, convert to array of IDs
          dataToSend.customer_id = [contactData.customer_id];
        } else if (
          typeof contactData.customer_id === "object" &&
          "$id" in contactData.customer_id
        ) {
          // If it's an object with $id, extract the ID and convert to array
          dataToSend.customer_id = [contactData.customer_id.$id];
        } else if (Array.isArray(contactData.customer_id)) {
          // If it's already an array, keep it as is
          // (but make sure it contains strings/IDs not objects)
          dataToSend.customer_id = (contactData.customer_id as any[]).map(
            (item: any) => (typeof item === "string" ? item : item.$id),
          );
        }
      }

      console.log(
        "Creating contact with formatted data:",
        JSON.stringify(dataToSend, null, 2),
      );

      // Create the contact document
      const contactId = ID.unique();
      const contact = await databases.createDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        contactId,
        dataToSend,
      );

      // Get the customer ID (ensuring it's a string)
      const customerId = typeof dataToSend.customer_id[0] === 'string' 
        ? dataToSend.customer_id[0] 
        : dataToSend.customer_id[0].$id;

      try {
        // Get current customer to access existing contact IDs
        const customer = await databases.getDocument(
          DATABASE_ID,
          CUSTOMERS_COLLECTION,
          customerId
        );

        // Prepare the updated customer_contact_ids array
        let customerContactIds = [];
        
        // If the customer already has contact IDs, add to them
        if (customer.customer_contact_ids && Array.isArray(customer.customer_contact_ids)) {
          // Extract existing IDs (they might be objects with $id or plain strings)
          const existingIds = customer.customer_contact_ids.map((item: any) => 
            typeof item === 'string' ? item : item.$id
          );
          
          // Add the new contact ID if it's not already in the array
          if (!existingIds.includes(contactId)) {
            customerContactIds = [...existingIds, contactId];
          } else {
            customerContactIds = existingIds;
          }
        } else {
          // If no existing contacts, start with just this one
          customerContactIds = [contactId];
        }

        // Update the customer document with the new contact ID in the relationship
        await databases.updateDocument(
          DATABASE_ID,
          CUSTOMERS_COLLECTION,
          customerId,
          { customer_contact_ids: customerContactIds }
        );

        console.log(`Updated customer ${customerId} with new contact ID ${contactId}`);
      } catch (updateError) {
        console.error("Error updating customer with new contact ID:", updateError);
        // Don't fail the whole operation if this part fails
      }

      return contact as CustomerContact;
    } catch (error) {
      console.error("Error creating customer contact:", error);
      throw error;
    }
  },

  /**
   * Update a customer contact
   */
  updateCustomerContact: async (
    id: string,
    contactData: Partial<NewCustomerContact>,
  ): Promise<CustomerContact> => {
    try {
      // Make a copy of the contactData to modify
      const dataToSend: any = { ...contactData };

      // Ensure customer_id is properly formatted if it's being updated
      if (contactData.customer_id) {
        if (typeof contactData.customer_id === "string") {
          // If it's a string ID, convert to array of IDs
          dataToSend.customer_id = [contactData.customer_id];
        } else if (
          typeof contactData.customer_id === "object" &&
          "$id" in contactData.customer_id
        ) {
          // If it's an object with $id, extract the ID and convert to array
          dataToSend.customer_id = [contactData.customer_id.$id];
        } else if (Array.isArray(contactData.customer_id)) {
          // If it's already an array, keep it as is
          // (but make sure it contains strings/IDs not objects)
          dataToSend.customer_id = (contactData.customer_id as any[]).map(
            (item: any) => (typeof item === "string" ? item : item.$id),
          );
        }
      }

      console.log(
        "Updating contact with formatted data:",
        JSON.stringify(dataToSend, null, 2),
      );

      const contact = await databases.updateDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        id,
        dataToSend,
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
  deleteCustomerContact: async (contactId: string): Promise<void> => {
    try {
      // First, get the contact to find its customer
      const contact = await databases.getDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        contactId
      );

      // Get the customer ID from the contact
      let customerId = null;
      if (contact.customer_id) {
        if (typeof contact.customer_id === 'string') {
          customerId = contact.customer_id;
        } else if (Array.isArray(contact.customer_id) && contact.customer_id.length > 0) {
          customerId = typeof contact.customer_id[0] === 'string' 
            ? contact.customer_id[0] 
            : contact.customer_id[0].$id;
        } else if (typeof contact.customer_id === 'object' && '$id' in contact.customer_id) {
          customerId = contact.customer_id.$id;
        }
      }

      if (customerId) {
        try {
          // Get the customer to update its contact IDs
          const customer = await databases.getDocument(
            DATABASE_ID,
            CUSTOMERS_COLLECTION,
            customerId
          );

          // If customer has contact IDs, remove this contact ID
          if (customer.customer_contact_ids && Array.isArray(customer.customer_contact_ids)) {
            // Extract existing contact IDs (they might be objects with $id or plain strings)
            const existingIds = customer.customer_contact_ids.map((item: any) => 
              typeof item === 'string' ? item : item.$id
            );
            
            // Remove the contact ID we're deleting
            const updatedIds = existingIds.filter(id => id !== contactId);
            
            // Update the customer document with the filtered contact IDs
            await databases.updateDocument(
              DATABASE_ID,
              CUSTOMERS_COLLECTION,
              customerId,
              { customer_contact_ids: updatedIds }
            );
            
            console.log(`Removed contact ID ${contactId} from customer ${customerId}`);
          }
        } catch (updateError) {
          console.error("Error updating customer when deleting contact:", updateError);
          // Continue with contact deletion even if this fails
        }
      }

      // Delete the contact document
      await databases.deleteDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        contactId
      );
      
      console.log(`Contact ${contactId} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting contact ${contactId}:`, error);
      throw error;
    }
  },
};

export default customersService;
