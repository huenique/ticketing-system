import { getCollection, getDocument, createDocument, updateDocument, deleteDocument } from "@/lib/appwrite";
import { Customer as CommonCustomer } from "@/types/common";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CUSTOMERS_COLLECTION = "customers";

/**
 * Interface for customer data from Appwrite
 */
export interface AppwriteCustomer {
  $id: string;
  name: string;
  address: string;
  primary_contact_name: string;
  primary_contact_number: string;
  primary_email: string;
  abn?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}

// Helper function to convert Appwrite customer to common type
const mapToCommonCustomer = (customer: AppwriteCustomer): CommonCustomer => {
  return {
    id: customer.$id,
    name: customer.name,
    address: customer.address,
    primary_contact_name: customer.primary_contact_name,
    primary_contact_number: customer.primary_contact_number,
    primary_email: customer.primary_email,
    abn: customer.abn,
    createdAt: customer.$createdAt || new Date().toISOString(),
    updatedAt: customer.$updatedAt || new Date().toISOString()
  };
};

/**
 * Get all customers
 */
export const getAllCustomers = async (): Promise<CommonCustomer[]> => {
  try {
    const response = await getCollection<AppwriteCustomer>(CUSTOMERS_COLLECTION);
    return response.documents.map(mapToCommonCustomer);
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

/**
 * Get a customer by ID
 */
export const getCustomerById = async (customerId: string): Promise<CommonCustomer> => {
  try {
    const customer = await getDocument<AppwriteCustomer>(CUSTOMERS_COLLECTION, customerId);
    return mapToCommonCustomer(customer);
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:`, error);
    throw error;
  }
};

/**
 * Create a new customer
 */
export const createCustomer = async (customerData: Omit<CommonCustomer, "id" | "createdAt" | "updatedAt">): Promise<CommonCustomer> => {
  try {
    // Convert to Appwrite format
    const appwriteData = {
      name: customerData.name,
      address: customerData.address,
      primary_contact_name: customerData.primary_contact_name,
      primary_contact_number: customerData.primary_contact_number,
      primary_email: customerData.primary_email,
      abn: customerData.abn
    };
    
    const newCustomer = await createDocument<AppwriteCustomer>(CUSTOMERS_COLLECTION, appwriteData);
    return mapToCommonCustomer(newCustomer);
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
};

/**
 * Update a customer
 */
export const updateCustomer = async (customerId: string, customerData: Partial<CommonCustomer>): Promise<CommonCustomer> => {
  try {
    // Convert to Appwrite format
    const appwriteData: Partial<AppwriteCustomer> = {};
    
    if (customerData.name) appwriteData.name = customerData.name;
    if (customerData.address) appwriteData.address = customerData.address;
    if (customerData.primary_contact_name) appwriteData.primary_contact_name = customerData.primary_contact_name;
    if (customerData.primary_contact_number) appwriteData.primary_contact_number = customerData.primary_contact_number;
    if (customerData.primary_email) appwriteData.primary_email = customerData.primary_email;
    if (customerData.abn) appwriteData.abn = customerData.abn;
    
    const updatedCustomer = await updateDocument<AppwriteCustomer>(CUSTOMERS_COLLECTION, customerId, appwriteData);
    return mapToCommonCustomer(updatedCustomer);
  } catch (error) {
    console.error(`Error updating customer ${customerId}:`, error);
    throw error;
  }
};

/**
 * Delete a customer
 */
export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    await deleteDocument(CUSTOMERS_COLLECTION, customerId);
  } catch (error) {
    console.error(`Error deleting customer ${customerId}:`, error);
    throw error;
  }
};

// Export as a service object
export const appwriteCustomersService = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
}; 