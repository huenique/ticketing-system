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
  abn?: string;
  customer_contact_ids?: Array<string | { $id: string } | CustomerContact>;
}

// Customer contact interface
export interface CustomerContact extends DocumentMetadata {
  customer_ids: string | { $id: string } | string[] | { $id: string }[];
  first_name: string;
  last_name: string;
  position?: string;
  contact_number: string;
  email: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Type for creating a new customer (without metadata fields)
export type NewCustomer = Omit<Customer, keyof DocumentMetadata>;

// Type for creating a new customer contact (without metadata fields)
export type NewCustomerContact = Omit<CustomerContact, keyof DocumentMetadata> & {
  // Override customer_ids to ensure it's required and correctly typed
  customer_ids: string | string[];
};

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
   * This function handles the many-to-many relationship between customers and contacts
   */
  getCustomerContacts: async (customerId: string): Promise<CustomerContact[]> => {
    try {
      console.log(`Getting contacts for customer ID: ${customerId}`);
      
      // First get the customer to access its customer_contact_ids
      const customer = await databases.getDocument(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        customerId
      );
      
      // If the customer document doesn't have contact IDs, return empty array
      if (!customer.customer_contact_ids || !Array.isArray(customer.customer_contact_ids) || customer.customer_contact_ids.length === 0) {
        console.log("No contact IDs found in customer document");
        return [];
      }
      
      // Extract just the ID values from the customer_contact_ids
      // (which may contain strings or objects with $id property)
      const contactIds = customer.customer_contact_ids.map((item: any) => 
        typeof item === 'string' ? item : item.$id
      );
      
      console.log(`Found ${contactIds.length} contact IDs in customer data: ${JSON.stringify(contactIds)}`);
      
      // Create an array to store the contacts
      const contacts: CustomerContact[] = [];
      
      // Fetch each contact document using its ID
      for (const contactId of contactIds) {
        try {
          const contact = await databases.getDocument(
            DATABASE_ID,
            CUSTOMER_CONTACTS_COLLECTION,
            contactId
          );
          contacts.push(contact as CustomerContact);
        } catch (contactError) {
          console.error(`Error fetching contact ${contactId}:`, contactError);
          // Continue with the next contact even if one fails
        }
      }
      
      console.log(`Successfully retrieved ${contacts.length} contacts for customer ${customerId}`);
      return contacts;
    } catch (error) {
      console.error(`Error getting contacts for customer ${customerId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new customer contact
   * Handles both sides of the many-to-many relationship
   */
  createCustomerContact: async (
    contactData: NewCustomerContact,
  ): Promise<CustomerContact> => {
    try {
      // Make a copy of the contactData to modify
      const dataToSend: any = { ...contactData };

      // Get the customer ID from the customer_ids field
      let customerId: string | null = null;
      if (Array.isArray(dataToSend.customer_ids) && dataToSend.customer_ids.length > 0) {
        customerId = dataToSend.customer_ids[0];
      } else if (typeof dataToSend.customer_ids === 'string') {
        customerId = dataToSend.customer_ids;
      } else if (typeof dataToSend.customer_ids === 'object' && '$id' in dataToSend.customer_ids) {
        customerId = dataToSend.customer_ids.$id;
      }

      // Ensure customer_ids is an array of strings for the relationship field
      if (!dataToSend.customer_ids) {
        dataToSend.customer_ids = [];
      } else if (!Array.isArray(dataToSend.customer_ids)) {
        dataToSend.customer_ids = [dataToSend.customer_ids];
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

      // Get the customer ID from the array - at this point we should have an array of strings
      if (!customerId) {
        console.error("No valid customer ID found in the data");
        throw new Error("No valid customer ID provided");
      }

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
   * Handles the many-to-many relationship, including changes to customer assignments
   */
  updateCustomerContact: async (
    id: string,
    contactData: Partial<NewCustomerContact>,
  ): Promise<CustomerContact> => {
    try {
      // Make a copy of the contactData to modify
      const dataToSend: any = { ...contactData };

      // First, get the contact to see if we're changing its customer assignment
      const existingContact = await databases.getDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        id
      );
      
      // Get current customer IDs (may be a string or an array)
      const currentCustomerIds: string[] = [];
      if (existingContact.customer_ids) {
        if (Array.isArray(existingContact.customer_ids)) {
          existingContact.customer_ids.forEach((item: any) => {
            currentCustomerIds.push(typeof item === 'string' ? item : item.$id);
          });
        } else if (typeof existingContact.customer_ids === 'string') {
          currentCustomerIds.push(existingContact.customer_ids);
        } else if (typeof existingContact.customer_ids === 'object' && '$id' in existingContact.customer_ids) {
          currentCustomerIds.push(existingContact.customer_ids.$id);
        }
      }
      
      // Get new customer IDs if provided in update
      let newCustomerIds: string[] = [];
      if (contactData.customer_ids) {
        // Convert to array if not already
        const customerIdsArray = Array.isArray(contactData.customer_ids) 
          ? contactData.customer_ids 
          : [contactData.customer_ids];
          
        // Extract string IDs from any objects
        customerIdsArray.forEach((item: any) => {
          newCustomerIds.push(typeof item === 'string' ? item : item.$id);
        });
        
        // Ensure customer_ids is stored as array in data to send
        dataToSend.customer_ids = newCustomerIds;
      } else {
        // If not changing customer assignment, use current values
        newCustomerIds = currentCustomerIds;
      }

      console.log(
        "Updating contact with formatted data:",
        JSON.stringify(dataToSend, null, 2),
      );

      // Update the contact document
      const contact = await databases.updateDocument(
        DATABASE_ID,
        CUSTOMER_CONTACTS_COLLECTION,
        id,
        dataToSend,
      );
      
      // Now handle the customer side of the relationship
      
      // For each customer that's no longer associated, remove this contact
      for (const oldCustomerId of currentCustomerIds) {
        if (!newCustomerIds.includes(oldCustomerId)) {
          try {
            // Need to remove this contact ID from the old customer
            const oldCustomer = await databases.getDocument(
              DATABASE_ID, 
              CUSTOMERS_COLLECTION, 
              oldCustomerId
            );
            
            if (oldCustomer.customer_contact_ids && Array.isArray(oldCustomer.customer_contact_ids)) {
              // Convert possible objects to string IDs
              const existingContactIds = oldCustomer.customer_contact_ids.map((item: any) => 
                typeof item === 'string' ? item : item.$id
              );
              
              // Remove the contact ID we're deleting
              const updatedContactIds = existingContactIds.filter((contactId: string) => contactId !== id);
              
              // Update the customer
              await databases.updateDocument(
                DATABASE_ID,
                CUSTOMERS_COLLECTION,
                oldCustomerId,
                { customer_contact_ids: updatedContactIds }
              );
              
              console.log(`Removed contact ${id} from customer ${oldCustomerId}`);
            }
          } catch (removeError) {
            console.error(`Error removing contact from old customer ${oldCustomerId}:`, removeError);
            // Continue even if this update fails
          }
        }
      }
      
      // For each new customer, add this contact ID
      for (const newCustomerId of newCustomerIds) {
        if (!currentCustomerIds.includes(newCustomerId)) {
          try {
            // Need to add this contact ID to the new customer
            const newCustomer = await databases.getDocument(
              DATABASE_ID,
              CUSTOMERS_COLLECTION,
              newCustomerId
            );
            
            // Initialize or update customer_contact_ids
            let customerContactIds = [];
            
            if (newCustomer.customer_contact_ids && Array.isArray(newCustomer.customer_contact_ids)) {
              // Convert possible objects to string IDs
              const existingContactIds = newCustomer.customer_contact_ids.map((item: any) => 
                typeof item === 'string' ? item : item.$id
              );
              
              // Add this contact ID if not already present
              if (!existingContactIds.includes(id)) {
                customerContactIds = [...existingContactIds, id];
              } else {
                customerContactIds = existingContactIds;
              }
            } else {
              // If no existing contacts, start with just this one
              customerContactIds = [id];
            }
            
            // Update the customer
            await databases.updateDocument(
              DATABASE_ID, 
              CUSTOMERS_COLLECTION,
              newCustomerId,
              { customer_contact_ids: customerContactIds }
            );
            
            console.log(`Added contact ${id} to customer ${newCustomerId}`);
          } catch (addError) {
            console.error(`Error adding contact to new customer ${newCustomerId}:`, addError);
            // Continue even if this update fails
          }
        }
      }

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
      if (contact.customer_ids) {
        if (typeof contact.customer_ids === 'string') {
          customerId = contact.customer_ids;
        } else if (Array.isArray(contact.customer_ids) && contact.customer_ids.length > 0) {
          customerId = typeof contact.customer_ids[0] === 'string' 
            ? contact.customer_ids[0] 
            : contact.customer_ids[0].$id;
        } else if (typeof contact.customer_ids === 'object' && '$id' in contact.customer_ids) {
          customerId = contact.customer_ids.$id;
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

  /**
   * Search customers with pagination support
   * @param searchQuery The search term
   * @param searchField The field to search in (default: "name") or "all" to search all fields
   * @param page The page number (starting at 1)
   * @param pageSize Number of items per page
   */
  searchCustomers: async (
    searchQuery: string,
    searchField: string = "name",
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ customers: Customer[]; total: number }> => {
    try {
      const offset = (page - 1) * pageSize;
      
      // Helper function for client-side search and filtering
      const performClientSideSearch = async (
        searchTermToUse: string,
        searchableFieldsToUse: string[],
        offsetToUse: number,
        pageSizeToUse: number
      ): Promise<{ customers: Customer[]; total: number }> => {
        // Get all customers and filter client-side
        // Note: This is less efficient but provides a fallback
        const allCustomersResponse = await databases.listDocuments(
          DATABASE_ID,
          CUSTOMERS_COLLECTION,
          [Query.limit(100)] // Set a reasonable limit to avoid loading too much data
        );
        
        // Perform case-insensitive search across the specified fields
        const searchTermLower = searchTermToUse.toLowerCase();
        const filteredCustomers = allCustomersResponse.documents.filter(customer => {
          // Check if any of the specified fields contain the search term
          return searchableFieldsToUse.some(field => {
            const fieldValue = (customer as any)[field];
            return fieldValue && 
                  typeof fieldValue === 'string' && 
                  fieldValue.toLowerCase().includes(searchTermLower);
          });
        });
        
        // Apply pagination manually
        const paginatedCustomers = filteredCustomers.slice(offsetToUse, offsetToUse + pageSizeToUse);
        
        return {
          customers: paginatedCustomers as Customer[],
          total: filteredCustomers.length
        };
      };
      
      // If there's no search query, just perform regular pagination
      if (!searchQuery.trim()) {
        // Create an array of queries for pagination only
        const queries = [
          Query.limit(pageSize),
          Query.offset(offset),
        ];
        
        // Get the paginated data
        const response = await databases.listDocuments(
          DATABASE_ID,
          CUSTOMERS_COLLECTION,
          queries
        );
        
        return {
          customers: response.documents as Customer[],
          total: response.total
        };
      }
      
      // Define which fields to search based on searchField
      const searchableFields = searchField === "all" 
        ? ["name", "address", "primary_contact_name", "primary_email", "abn"] 
        : [searchField];
      
      // For "all" fields search, we'll try each field one by one until we find results
      if (searchField === "all") {
        let combinedResults: Customer[] = [];
        let totalResults = 0;
        let foundResults = false;
        
        // Try server-side search on each field one by one
        for (const field of searchableFields) {
          try {
            const queries = [
              Query.limit(100), // Get more results to combine
              Query.search(field, searchQuery)
            ];
            
            const response = await databases.listDocuments(
              DATABASE_ID,
              CUSTOMERS_COLLECTION,
              queries
            );
            
            if (response.documents.length > 0) {
              // Add these results to our combined results, avoiding duplicates
              response.documents.forEach((doc) => {
                if (!combinedResults.some(existingDoc => existingDoc.$id === doc.$id)) {
                  combinedResults.push(doc as Customer);
                }
              });
              foundResults = true;
            }
          } catch (error) {
            // Continue to the next field if this one fails
            console.warn(`Search on field "${field}" failed, trying other fields:`, error);
          }
        }
        
        // If we found any results through server-side search
        if (foundResults) {
          // Sort results - you can customize this based on relevance criteria
          combinedResults.sort((a, b) => a.name.localeCompare(b.name));
          
          // Apply pagination manually
          totalResults = combinedResults.length;
          const paginatedResults = combinedResults.slice(offset, offset + pageSize);
          
          return {
            customers: paginatedResults,
            total: totalResults
          };
        }
        
        // If no server-side search worked, fall back to client-side filtering
        console.warn("All server-side searches failed, falling back to client-side filtering");
        return await performClientSideSearch(searchQuery, searchableFields, offset, pageSize);
      }
      
      // For single field search
      try {
        const queries = [
          Query.limit(pageSize),
          Query.offset(offset),
          Query.search(searchField, searchQuery)
        ];
        
        const response = await databases.listDocuments(
          DATABASE_ID,
          CUSTOMERS_COLLECTION,
          queries
        );
        
        return {
          customers: response.documents as Customer[],
          total: response.total
        };
      } catch (searchError) {
        // If search fails (likely due to missing fulltext index), fall back to client-side filtering
        console.warn(`Server-side search failed for field "${searchField}", falling back to client-side filtering:`, searchError);
        return await performClientSideSearch(searchQuery, searchableFields, offset, pageSize);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
      throw error;
    }
  },
};

export default customersService;
