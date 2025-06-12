/**
 * Appwrite API Client
 * Provides modular functions to interact with Appwrite backend
 */

import { Account, Client, Databases, ID, Query, Storage } from "appwrite";
import * as sdk from "node-appwrite";

// Retrieve environment variables
const API_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;

// Initialize the Appwrite client
export const client = new Client();

// Configure the client with endpoint and project ID
client.setEndpoint(API_ENDPOINT).setProject(PROJECT_ID);

// Function to reset client completely
export const resetClient = () => {
  // Create a fresh client instance
  const freshClient = new Client();
  freshClient.setEndpoint(API_ENDPOINT).setProject(PROJECT_ID);
  return freshClient;
};

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query };

// Authentication functions
export const authService = {
  // Clear all sessions and active tokens before creating a new account
  async clearAllSessions() {
    try {
      // First check if we have an active session
      const currentUser = await account.get();
      if (currentUser) {
        console.log("Active session found, logging out...");
        await account.deleteSessions();
      }
    } catch (error) {
      // If error occurs, it likely means no active session
      console.log("No active session found or error clearing sessions");
    }
  },

  // Check if an email already exists in the system
  async emailExists(email: string): Promise<boolean> {
    try {
      // We'll use a workaround - attempt to create a recovery session for the email
      // If it succeeds or fails with certain error codes, we know the email exists
      await account.createRecovery(email, 'https://example.com');
      // If we reach here, it means the recovery was created successfully,
      // indicating the email exists
      return true;
    } catch (error: any) {
      // Error code 404 means user not found (email doesn't exist)
      if (error.code === 404) {
        return false;
      }
      
      // If we get a different error (like invalid email format), assume email exists
      // to be on the safe side
      return true;
    }
  },

  // Create a new user account
  async createAccount(email: string, password: string, name: string) {
    try {
      // Clear any existing sessions first
      await this.clearAllSessions();
      
      // Create a completely fresh client instance for this operation
      const freshClient = resetClient();
      const freshAccount = new Account(freshClient);
      
      // Generate a unique ID
      const uuid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      console.log(`Creating user with UUID: ${uuid} and email: ${email}`);
      
      // Alternative approach that should bypass the caching/conflict issues
      try {
        // First try a simple create operation with unique generated ID
        const user = await freshAccount.create(uuid, email, password, name);
        console.log("User created successfully with standard approach");
        return user;
      } catch (error: any) {
        // If this fails with a conflict error, log detailed information
        console.error("Standard account creation failed, error details:", error);
        
        if (error.code === 409) {
          // If the error is a conflict, there might be an issue with caching or session state
          // Try a complete reset of the environment
          console.log("Conflict detected. Attempting alternate creation method...");
          
          // Create a brand new client with a clean slate
          const cleanClient = new Client();
          cleanClient.setEndpoint(API_ENDPOINT).setProject(PROJECT_ID);
          const cleanAccount = new Account(cleanClient);
          
          // Generate an even more unique ID
          const backupUuid = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 20)}`;
          
          // Try creating the user with the clean client
          try {
            const backupUser = await cleanAccount.create(backupUuid, email, password, name);
            console.log("User created with backup method");
            return backupUser;
          } catch (backupError: any) {
            console.error("Backup account creation method also failed:", backupError);
            throw backupError;
          }
        } else {
          // Not a conflict error, just throw it
          throw error;
        }
      }
    } catch (error: any) {
      console.error("All methods of account creation failed:", error);
      
      // Log detailed error information if available
      if (error.code && error.message) {
        console.error(`Final Appwrite error details - Code: ${error.code}, Message: ${error.message}, Type: ${error.type || 'unknown'}`);
        
        // Log any additional Appwrite-specific information
        if (error.response) {
          console.error("Appwrite response:", error.response);
        }
      }
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
      return await account.deleteSessions();
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
      return await account.createRecovery(
        email,
        `${window.location.origin}/reset-password`,
      );
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

  // Update password for currently logged-in user
  async updatePassword(newPassword: string, oldPassword?: string) {
    try {
      return await account.updatePassword(newPassword, oldPassword);
    } catch (error) {
      console.error("Error updating password:", error);
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
  },

  // Get auth user by ID
  async getAuthUser(userId: string) {
    try {
      // Create a server client to make API call
      const serverClient = new sdk.Client();
      serverClient
        .setEndpoint(API_ENDPOINT)
        .setProject(PROJECT_ID)
        .setKey(import.meta.env.VITE_APPWRITE_API_KEY);
      
      // Create a Users service instance
      const users = new sdk.Users(serverClient);
      
      // Get user by ID
      const user = await users.get(userId);
      
      // Return the user's email
      return user.email;
    } catch (error) {
      console.error("Error fetching auth user:", error);
      throw error;
    }
  },
};

/**
 * Get all documents from a collection
 */
export async function getCollection<T>(
  collectionId: string,
  queries: string[] = [],
  searchQuery?: { field: string; value: string }
): Promise<{ documents: T[] }> {
  try {
    // Using the proper client-side queries from Appwrite SDK
    // Convert string queries to proper Query objects if provided
    let queryObjects = queries.length > 0 ? queries : [Query.limit(100)];
    
    // Add search filter if provided
    if (searchQuery && searchQuery.value.trim()) {
      queryObjects.push(Query.search(searchQuery.field, searchQuery.value));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      queryObjects,
    );

    return {
      documents: response.documents as unknown as T[],
    };
  } catch (error) {
    console.error(`Error fetching collection ${collectionId}:`, error);
    throw error;
  }
}

/**
 * Get a single document by ID
 */
export async function getDocument<T>(
  collectionId: string,
  documentId: string,
): Promise<T> {
  try {
    return (await databases.getDocument(DATABASE_ID, collectionId, documentId)) as T;
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
  documentId: string = ID.unique(),
): Promise<T> {
  try {
    return (await databases.createDocument(
      DATABASE_ID,
      collectionId,
      documentId,
      data,
    )) as T;
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
  data: object,
): Promise<T> {
  try {
    return (await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      documentId,
      data,
    )) as T;
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
  documentId: string,
): Promise<void> {
  try {
    await databases.deleteDocument(DATABASE_ID, collectionId, documentId);
  } catch (error) {
    console.error(`Error deleting document ${documentId} from ${collectionId}:`, error);
    throw error;
  }
}

// Add file storage methods using the Storage SDK
export const storageService = {
  /**
   * Upload a file to storage
   */
  async uploadFile(file: File, permissions: string[] = ["*"]) {
    try {
      return await storage.createFile(BUCKET_ID, ID.unique(), file, permissions);
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },

  /**
   * Get a file preview URL
   */
  getFilePreview(fileId: string, width?: number, height?: number) {
    try {
      return storage.getFilePreview(BUCKET_ID, fileId, width, height);
    } catch (error) {
      console.error("Error getting file preview:", error);
      throw error;
    }
  },

  /**
   * Delete a file
   */
  async deleteFile(fileId: string) {
    try {
      await storage.deleteFile(BUCKET_ID, fileId);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },
};
