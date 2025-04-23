/**
 * Appwrite API Client
 * Provides modular functions to interact with Appwrite backend
 */

import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

// Retrieve environment variables
const API_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const API_KEY = import.meta.env.VITE_APPWRITE_API_KEY;

// Initialize the Appwrite client
export const client = new Client();

client
  .setEndpoint(API_ENDPOINT)
  .setProject(PROJECT_ID);

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query };

// Authentication functions
export const authService = {
  // Create a new user account
  async createAccount(email: string, password: string, name: string) {
    try {
      return await account.create(ID.unique(), email, password, name);
    } catch (error) {
      console.error("Error creating account:", error);
      throw error;
    }
  },

  // Login with email and password
  async login(email: string, password: string) {
    try {
      return await account.createEmailPasswordSession(email, password);
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  },

  // Logout (delete current session)
  async logout() {
    try {
      return await account.deleteSession('current');
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  },

  // Get current user information
  async getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  // Check if user is logged in
  async isLoggedIn() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  },

  // Send password reset email
  async sendPasswordRecovery(email: string) {
    try {
      return await account.createRecovery(email, `${window.location.origin}/reset-password`);
    } catch (error) {
      console.error("Error sending password recovery:", error);
      throw error;
    }
  },

  // Confirm password reset
  async confirmPasswordRecovery(userId: string, secret: string, password: string) {
    try {
      return await account.updateRecovery(userId, secret, password);
    } catch (error) {
      console.error("Error confirming password recovery:", error);
      throw error;
    }
  },

  // Send verification email
  async sendVerificationEmail(url: string) {
    try {
      return await account.createVerification(url);
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  },

  // Confirm email verification
  async confirmVerification(userId: string, secret: string) {
    try {
      return await account.updateVerification(userId, secret);
    } catch (error) {
      console.error("Error confirming verification:", error);
      throw error;
    }
  }
};

// Default headers
const getHeaders = () => ({
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
  'Content-Type': 'application/json',
});

/**
 * Generic fetch function for Appwrite API
 */
export async function appwriteFetch<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object
): Promise<T> {
  const url = `${API_ENDPOINT}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: getHeaders(),
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error('Appwrite API request failed:', error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 */
export async function getCollection<T>(collectionId: string, queries: string[] = []): Promise<{ documents: T[] }> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      queries
    );
    
    // Convert the response to match the expected return type
    return {
      documents: response.documents as unknown as T[]
    };
  } catch (error) {
    console.error(`Error fetching collection ${collectionId}:`, error);
    throw error;
  }
}

/**
 * Get a single document by ID
 */
export async function getDocument<T>(collectionId: string, documentId: string): Promise<T> {
  try {
    return await databases.getDocument(
      DATABASE_ID,
      collectionId,
      documentId
    ) as T;
  } catch (error) {
    console.error(`Error fetching document ${documentId} from ${collectionId}:`, error);
    throw error;
  }
}

/**
 * Create a new document
 */
export async function createDocument<T>(
  collectionId: string, 
  data: object,
  documentId: string = ID.unique()
): Promise<T> {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      collectionId,
      documentId,
      data
    ) as T;
  } catch (error) {
    console.error(`Error creating document in ${collectionId}:`, error);
    throw error;
  }
}

/**
 * Update an existing document
 */
export async function updateDocument<T>(
  collectionId: string,
  documentId: string,
  data: object
): Promise<T> {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      documentId,
      data
    ) as T;
  } catch (error) {
    console.error(`Error updating document ${documentId} in ${collectionId}:`, error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      collectionId,
      documentId
    );
  } catch (error) {
    console.error(`Error deleting document ${documentId} from ${collectionId}:`, error);
    throw error;
  }
} 