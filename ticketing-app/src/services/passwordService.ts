import { Client, Users } from 'node-appwrite';

// Environment variables
const API_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = import.meta.env.VITE_APPWRITE_API_KEY;

// Validate environment variables
if (!API_ENDPOINT || !PROJECT_ID || !API_KEY) {
  throw new Error(
    'Missing required environment variables: VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_API_KEY'
  );
}

// Initialize server-side Appwrite client
const serverClient = new Client();
serverClient
  .setEndpoint(API_ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

// Initialize Users service for server-side operations
const users = new Users(serverClient);

export const passwordService = {
  /**
   * Update user password using server-side admin privileges
   * @param userId - The auth user ID (auth_user_id from the user record)
   * @param newPassword - The new password (must be at least 8 characters)
   * @returns Promise<any> - The updated user object
   */
  async updateUserPassword(userId: string, newPassword: string): Promise<any> {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!newPassword || newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      console.log(`Updating password for user ID: ${userId}`);
      
      // Call Appwrite's server-side API to update user password
      const updatedUser = await users.updatePassword(userId, newPassword);
      
      console.log('Password updated successfully');
      return updatedUser;
      
    } catch (error: any) {
      console.error('Error updating user password:', error);
      
      // Handle specific Appwrite errors
      if (error.code === 404) {
        throw new Error('User not found');
      } else if (error.code === 400) {
        throw new Error('Invalid password format. Password must be at least 8 characters long.');
      } else if (error.code === 401) {
        throw new Error('Unauthorized. Admin privileges required.');
      } else {
        throw new Error(`Failed to update password: ${error.message}`);
      }
    }
  },

  /**
   * Validate if a user exists by their auth user ID
   * @param userId - The auth user ID to check
   * @returns Promise<boolean> - True if user exists, false otherwise
   */
  async validateUserExists(userId: string): Promise<boolean> {
    try {
      await users.get(userId);
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      // For other errors, assume user exists to be safe
      console.warn('Error checking user existence:', error);
      return true;
    }
  }
}; 