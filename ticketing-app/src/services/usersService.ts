import { databases, ID, Query } from "@/lib/appwrite";

// Collection and database constants
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const USERS_COLLECTION = "users";
const USER_TYPES_COLLECTION = "user_types";

// Define document metadata fields
interface DocumentMetadata {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $databaseId: string;
  $collectionId: string;
}

// User interface for Appwrite
export interface User extends DocumentMetadata {
  first_name: string;
  last_name: string;
  user_type_id: {
    $id: string;
    label: string;
  } & Partial<DocumentMetadata>;
  auth_user_id?: string;
}

// User type interface
export interface UserType extends DocumentMetadata {
  label: string;
  allowedStatuses?: string[];
}

// Type for creating a new user (without metadata fields)
export type NewUser = {
  first_name: string;
  last_name: string;
  user_type_id: string | { $id: string; label: string };
  auth_user_id?: string;
};

// Type for creating/updating a user type
export type UserTypeInput = {
  label: string;
  allowedStatuses?: string[];
};

// Users service object
export const usersService = {
  /**
   * Get all users
   */
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [
        Query.limit(100),
      ]);
      return response.documents as User[];
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  /**
   * Search users with pagination support
   * @param searchQuery The search term
   * @param searchField The field to search in (default: "first_name")
   * @param page The page number (starting at 1)
   * @param pageSize Number of items per page
   */
  searchUsers: async (
    searchQuery: string,
    searchField: string = "first_name",
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ users: User[]; total: number }> => {
    try {
      const offset = (page - 1) * pageSize;
      
      // Create an array of queries for pagination
      const queries = [
        Query.limit(pageSize),
        Query.offset(offset),
      ];
      
      // Add search filter if provided
      if (searchQuery.trim()) {
        queries.push(Query.search(searchField, searchQuery));
      }
      
      // Get the actual paginated data
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION,
        queries
      );
      
      // Return both the users and the total count
      return {
        users: response.documents as User[],
        total: response.total
      };
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  },

  /**
   * Get all user types
   */
  getAllUserTypes: async (): Promise<UserType[]> => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_TYPES_COLLECTION,
        [Query.limit(100)],
      );
      return response.documents as UserType[];
    } catch (error) {
      console.error("Error fetching user types:", error);
      throw error;
    }
  },

  /**
   * Create a new user type
   */
  createUserType: async (userTypeData: UserTypeInput): Promise<UserType> => {
    try {
      const userType = await databases.createDocument(
        DATABASE_ID,
        USER_TYPES_COLLECTION,
        ID.unique(),
        userTypeData
      );
      return userType as UserType;
    } catch (error) {
      console.error("Error creating user type:", error);
      throw error;
    }
  },

  /**
   * Update a user type
   */
  updateUserType: async (id: string, userTypeData: UserTypeInput): Promise<UserType> => {
    try {
      const userType = await databases.updateDocument(
        DATABASE_ID,
        USER_TYPES_COLLECTION,
        id,
        userTypeData
      );
      return userType as UserType;
    } catch (error) {
      console.error(`Error updating user type ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a user type
   */
  deleteUserType: async (id: string): Promise<void> => {
    try {
      await databases.deleteDocument(DATABASE_ID, USER_TYPES_COLLECTION, id);
    } catch (error) {
      console.error(`Error deleting user type ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get a user by ID
   */
  getUser: async (id: string): Promise<User> => {
    try {
      const user = await databases.getDocument(DATABASE_ID, USERS_COLLECTION, id);
      return user as User;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new user
   */
  createUser: async (userData: NewUser): Promise<User> => {
    try {
      console.log("Creating user with data:", JSON.stringify(userData, null, 2));

      // Make a copy of the userData to modify
      const dataToSend: any = { ...userData };

      // Ensure user_type_id is properly formatted
      if (userData.user_type_id && typeof userData.user_type_id === "object") {
        // Make sure we're only sending the $id for the relationship
        // This is critical for Appwrite to properly handle the relationship
        dataToSend.user_type_id = userData.user_type_id.$id;
      }

      // Keep the auth_user_id if provided
      if (userData.auth_user_id) {
        dataToSend.auth_user_id = userData.auth_user_id;
      }

      console.log(
        "Formatted user data for Appwrite:",
        JSON.stringify(dataToSend, null, 2),
      );

      const user = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        ID.unique(),
        dataToSend,
      );

      console.log("User created successfully:", JSON.stringify(user, null, 2));
      return user as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  /**
   * Update a user
   */
  updateUser: async (id: string, userData: Partial<NewUser>): Promise<User> => {
    try {
      const user = await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        id,
        userData,
      );
      return user as User;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a user
   */
  deleteUser: async (id: string): Promise<void> => {
    try {
      await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION, id);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get user's full name
   */
  getUserFullName: (user: User): string => {
    return `${user.first_name} ${user.last_name}`;
  },
};

export default usersService;
