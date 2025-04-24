import { UserType } from "@/types/auth";
import { CustomerContact } from "@/types/common";
import { 
  getCollection, 
  getDocument, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  Query
} from "@/lib/appwrite";

// Collection ID constants
const USER_TYPES_COLLECTION = "user_types";
const CUSTOMER_CONTACTS_COLLECTION = "customer_contacts";

// User types service
export const userTypesService = {
  /**
   * Get all user types
   */
  getAllUserTypes: async (): Promise<UserType[]> => {
    const response = await getCollection<UserType>(USER_TYPES_COLLECTION, [
      Query.limit(100)
    ]);
    return response.documents;
  },

  /**
   * Get a single user type by ID
   */
  getUserType: async (userTypeId: string): Promise<UserType> => {
    return getDocument<UserType>(USER_TYPES_COLLECTION, userTypeId);
  },

  /**
   * Create a new user type
   */
  createUserType: async (userTypeData: Omit<UserType, "id">): Promise<UserType> => {
    return createDocument<UserType>(USER_TYPES_COLLECTION, userTypeData);
  },

  /**
   * Update an existing user type
   */
  updateUserType: async (userTypeId: string, userTypeData: Partial<UserType>): Promise<UserType> => {
    return updateDocument<UserType>(USER_TYPES_COLLECTION, userTypeId, userTypeData);
  },

  /**
   * Delete a user type
   */
  deleteUserType: async (userTypeId: string): Promise<void> => {
    return deleteDocument(USER_TYPES_COLLECTION, userTypeId);
  }
};

// Customer contacts service
export const customerContactsService = {
  /**
   * Get all customer contacts
   */
  getAllCustomerContacts: async (): Promise<CustomerContact[]> => {
    const response = await getCollection<CustomerContact>(CUSTOMER_CONTACTS_COLLECTION, [
      Query.limit(100)
    ]);
    return response.documents;
  },

  /**
   * Get customer contacts by customer ID
   */
  getContactsByCustomerId: async (customerId: string): Promise<CustomerContact[]> => {
    // Use proper Query filtering instead of client-side filtering
    const response = await getCollection<CustomerContact>(CUSTOMER_CONTACTS_COLLECTION, [
      Query.equal("customerId", customerId),
      Query.limit(100)
    ]);
    return response.documents;
  },

  /**
   * Get a single customer contact by ID
   */
  getCustomerContact: async (contactId: string): Promise<CustomerContact> => {
    return getDocument<CustomerContact>(CUSTOMER_CONTACTS_COLLECTION, contactId);
  },

  /**
   * Create a new customer contact
   */
  createCustomerContact: async (contactData: Omit<CustomerContact, "id">): Promise<CustomerContact> => {
    return createDocument<CustomerContact>(CUSTOMER_CONTACTS_COLLECTION, contactData);
  },

  /**
   * Update an existing customer contact
   */
  updateCustomerContact: async (contactId: string, contactData: Partial<CustomerContact>): Promise<CustomerContact> => {
    return updateDocument<CustomerContact>(CUSTOMER_CONTACTS_COLLECTION, contactId, contactData);
  },

  /**
   * Delete a customer contact
   */
  deleteCustomerContact: async (contactId: string): Promise<void> => {
    return deleteDocument(CUSTOMER_CONTACTS_COLLECTION, contactId);
  }
}; 