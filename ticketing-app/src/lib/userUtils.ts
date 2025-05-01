import { authService } from "./appwrite";
import { UserRole } from "@/types/auth";

/**
 * Gets the current logged in user and returns their role based on labels
 * @returns The current user's role or null if not logged in
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    // Get the current user from Appwrite auth
    const user = await authService.getCurrentUser();
    
    if (!user) {
      return null; // No logged in user
    }
    
    // Check if user has labels array
    if (user.labels && Array.isArray(user.labels)) {
      // Determine role based on labels
      // If "admin" is in labels, return "admin" role
      if (user.labels.includes("admin")) {
        return "admin";
      }
      
      // You can add more role checks here as needed
      // For example, if user.labels.includes("manager") return "manager"
      
      // Default to basic "user" role
      return "user";
    }
    
    // If no labels found, default to "user" role
    return "user";
  } catch (error) {
    console.error("Error getting current user role:", error);
    return null;
  }
}

/**
 * Test utility function to log the current user's role
 * Call this anywhere in the application to test role detection
 */
export async function testUserRole(): Promise<void> {
  try {
    const role = await getCurrentUserRole();
    console.log('Current user role:', role);
    
    // Also log the full user object for debugging
    const user = await authService.getCurrentUser();
    console.log('Full user object:', user);
    
    return;
  } catch (error) {
    console.error('Error testing user role:', error);
  }
} 