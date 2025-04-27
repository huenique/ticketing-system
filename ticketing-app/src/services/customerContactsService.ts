import { CustomerContact, customersService } from "@/services/customersService";
import { CustomerContact as CommonCustomerContact } from "@/types/common";

// Helper function to convert Appwrite contact to common type
const mapToCommonContact = (contact: CustomerContact): CommonCustomerContact => {
  // Extract customerId from the relationship structure
  let customerId = "";
  if (typeof contact.customer_id === "object" && contact.customer_id) {
    customerId = contact.customer_id.$id;
  } else if (typeof contact.customer_id === "string") {
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
    updatedAt: contact.$updatedAt || new Date().toISOString(),
  };
};

/**
 * Get all contacts
 */
export const getAllContacts = async (): Promise<CommonCustomerContact[]> => {
  try {
    // We'll need to fetch contacts for all customers
    // This is not optimal but will work for now
    const customers = await customersService.getAllCustomers();
    const allContacts: CustomerContact[] = [];

    // Fetch contacts for each customer
    for (const customer of customers) {
      const customerContacts = await customersService.getCustomerContacts(customer.$id);
      allContacts.push(...customerContacts);
    }

    return allContacts.map(mapToCommonContact);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw error;
  }
};

/**
 * Get contacts by customer ID
 */
export const getContactsByCustomerId = async (
  customerId: string,
): Promise<CommonCustomerContact[]> => {
  try {
    const contacts = await customersService.getCustomerContacts(customerId);
    return contacts.map(mapToCommonContact);
  } catch (error) {
    console.error(`Error fetching contacts for customer ${customerId}:`, error);
    throw error;
  }
};

/**
 * Get a contact by ID
 */
export const getContactById = async (
  contactId: string,
): Promise<CommonCustomerContact | null> => {
  try {
    // Since we don't have a direct method to get a contact by ID,
    // we need to fetch all contacts and find the one we need
    const customers = await customersService.getAllCustomers();

    for (const customer of customers) {
      const contacts = await customersService.getCustomerContacts(customer.$id);
      const contact = contacts.find((c) => c.$id === contactId);
      if (contact) {
        return mapToCommonContact(contact);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching contact ${contactId}:`, error);
    throw error;
  }
};

/**
 * Create a new contact
 */
export const createContact = async (
  contactData: Omit<CommonCustomerContact, "id" | "createdAt" | "updatedAt">,
): Promise<CommonCustomerContact> => {
  try {
    // Convert from common format to Appwrite format
    const appwriteData = {
      customer_id: contactData.customerId,
      first_name: contactData.first_name,
      last_name: contactData.last_name,
      position: contactData.position || "",
      contact_number: contactData.contact_number,
      email: contactData.email,
    };

    const newContact = await customersService.createCustomerContact(appwriteData);
    return mapToCommonContact(newContact);
  } catch (error) {
    console.error("Error creating contact:", error);
    throw error;
  }
};

/**
 * Update a contact
 */
export const updateContact = async (
  contactId: string,
  contactData: Partial<CommonCustomerContact>,
): Promise<CommonCustomerContact> => {
  try {
    // For updates, only include fields that are actually changing
    const appwriteData: any = {};

    // Handle relationship field properly
    if (contactData.customerId) appwriteData.customer_id = contactData.customerId;
    if (contactData.first_name) appwriteData.first_name = contactData.first_name;
    if (contactData.last_name) appwriteData.last_name = contactData.last_name;
    if (contactData.position !== undefined)
      appwriteData.position = contactData.position;
    if (contactData.contact_number)
      appwriteData.contact_number = contactData.contact_number;
    if (contactData.email) appwriteData.email = contactData.email;

    const updatedContact = await customersService.updateCustomerContact(
      contactId,
      appwriteData,
    );
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
    await customersService.deleteCustomerContact(contactId);
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
  deleteContact,
};
