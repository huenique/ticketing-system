import { getCollection, getDocument, createDocument, updateDocument, deleteDocument, Query } from "@/lib/appwrite";
import { CustomerContact as CommonCustomerContact } from "@/types/common";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CONTACTS_COLLECTION = "customer_contacts";

/**
 * Interface for customer contact data from Appwrite
 */
export interface AppwriteContact {
  $id: string;
  customer_id: Array<{
    $id: string;
    name: string;
    address: string;
    primary_contact_name: string;
    primary_contact_number: string;
    primary_email: string;
    abn?: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
    $databaseId: string;
    $collectionId: string;
  }> | string; // Can be either an array of customer objects or a string ID
  first_name: string;
  last_name: string;
  position?: string;
  contact_number: string;
  email: string;
  $createdAt?: string;
  $updatedAt?: string;
}

// Helper function to convert Appwrite contact to common type
const mapToCommonContact = (contact: AppwriteContact): CommonCustomerContact => {
  // Extract customerId from the relationship structure
  let customerId = "";
  if (Array.isArray(contact.customer_id) && contact.customer_id.length > 0) {
    customerId = contact.customer_id[0].$id;
  } else if (typeof contact.customer_id === 'string') {
    customerId = contact.customer_id;
  }

  return {
    id: contact.$id,
    customerId: customerId,
    first_name: contact.first_name,
    last_name: contact.last_name,
    position: contact.position,
    contact_number: contact.contact_number,
    email: contact.email,
    createdAt: contact.$createdAt || new Date().toISOString(),
    updatedAt: contact.$updatedAt || new Date().toISOString()
  };
};

/**
 * Get all contacts
 */
export const getAllContacts = async (): Promise<CommonCustomerContact[]> => {
  try {
    // Request contacts with expanded relationships
    const response = await getCollection<AppwriteContact>(CONTACTS_COLLECTION, [
      Query.limit(100)
    ]);
    return response.documents.map(mapToCommonContact);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw error;
  }
};

/**
 * Get contacts by customer ID
 */
export const getContactsByCustomerId = async (customerId: string): Promise<CommonCustomerContact[]> => {
  try {
    // Using the Appwrite Query SDK to filter by customer relationship
    const response = await getCollection<AppwriteContact>(CONTACTS_COLLECTION, [
      Query.equal("customer_id", customerId),
      Query.limit(100)
    ]);
    
    return response.documents.map(mapToCommonContact);
  } catch (error) {
    console.error(`Error fetching contacts for customer ${customerId}:`, error);
    throw error;
  }
};

/**
 * Get a contact by ID
 */
export const getContactById = async (contactId: string): Promise<CommonCustomerContact> => {
  try {
    const contact = await getDocument<AppwriteContact>(CONTACTS_COLLECTION, contactId);
    return mapToCommonContact(contact);
  } catch (error) {
    console.error(`Error fetching contact ${contactId}:`, error);
    throw error;
  }
};

/**
 * Create a new contact
 */
export const createContact = async (contactData: Omit<CommonCustomerContact, "id" | "createdAt" | "updatedAt">): Promise<CommonCustomerContact> => {
  try {
    // For relationships in client-side SDK, just use the ID as a string
    // Appwrite will handle the relationship mapping internally
    const appwriteData = {
      customer_id: contactData.customerId,
      first_name: contactData.first_name,
      last_name: contactData.last_name,
      position: contactData.position || "",
      contact_number: contactData.contact_number,
      email: contactData.email
    };
    
    const newContact = await createDocument<AppwriteContact>(CONTACTS_COLLECTION, appwriteData);
    return mapToCommonContact(newContact);
  } catch (error) {
    console.error("Error creating contact:", error);
    throw error;
  }
};

/**
 * Update a contact
 */
export const updateContact = async (contactId: string, contactData: Partial<CommonCustomerContact>): Promise<CommonCustomerContact> => {
  try {
    // For updates, only include fields that are actually changing
    const appwriteData: Partial<AppwriteContact> = {};
    
    // Handle relationship field properly
    if (contactData.customerId) appwriteData.customer_id = contactData.customerId;
    if (contactData.first_name) appwriteData.first_name = contactData.first_name;
    if (contactData.last_name) appwriteData.last_name = contactData.last_name;
    if (contactData.position !== undefined) appwriteData.position = contactData.position;
    if (contactData.contact_number) appwriteData.contact_number = contactData.contact_number;
    if (contactData.email) appwriteData.email = contactData.email;
    
    const updatedContact = await updateDocument<AppwriteContact>(CONTACTS_COLLECTION, contactId, appwriteData);
    return mapToCommonContact(updatedContact);
  } catch (error) {
    console.error(`Error updating contact ${contactId}:`, error);
    throw error;
  }
};

/**
 * Delete a contact
 */
export const deleteContact = async (contactId: string): Promise<void> => {
  try {
    await deleteDocument(CONTACTS_COLLECTION, contactId);
  } catch (error) {
    console.error(`Error deleting contact ${contactId}:`, error);
    throw error;
  }
};

// Export as a service object
export const contactsService = {
  getAllContacts,
  getContactsByCustomerId,
  getContactById,
  createContact,
  updateContact,
  deleteContact
}; 