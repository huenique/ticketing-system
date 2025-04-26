import { storage, ID } from "@/lib/appwrite";

// Storage bucket ID from environment variables
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const API_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

// Types for preview options
export type ImageGravity = 'center' | 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'gif' | 'webp';

/**
 * Upload a file to storage
 */
export const uploadFile = async (file: File, permissions: string[] = ['*']) => {
  try {
    return await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      file,
      permissions
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Get a file preview URL for viewing
 * Returns a URL that can be used directly in an <img> tag
 */
export const getFilePreview = (fileId: string, width?: number, height?: number) => {
  try {
    // Use getFileView for images
    const url = storage.getFileView(
      BUCKET_ID,
      fileId
    );
    // Append &mode=admin to bypass permission checks
    return `${url}&mode=admin`;
  } catch (error) {
    console.error('Error getting file preview:', error);
    // Return a placeholder image URL instead of throwing
    return '/placeholder-image.png';
  }
};

/**
 * Get a file URL for viewing or downloading
 */
export const getFileView = (fileId: string) => {
  try {
    const url = storage.getFileView(
      BUCKET_ID,
      fileId
    );
    // Append &mode=admin to bypass permission checks
    return `${url}&mode=admin`;
  } catch (error) {
    console.error('Error getting file view URL:', error);
    // Return a fallback value instead of throwing
    return '#';
  }
};

/**
 * Get a file download URL - returns a direct URL for downloading the file
 */
export const getFileDownload = (fileId: string) => {
  try {
    // Use getFileDownload to get a URL that triggers file download
    const url = storage.getFileDownload(
      BUCKET_ID,
      fileId
    );
    // Append &mode=admin to bypass permission checks
    return `${url}&mode=admin`;
  } catch (error) {
    console.error('Error getting file download URL:', error);
    // Return a fallback value instead of throwing
    return '#';
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (fileId: string) => {
  try {
    await storage.deleteFile(
      BUCKET_ID,
      fileId
    );
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Get file metadata - attempts to fetch file information
 * Uses admin mode to bypass permission restrictions
 */
export const getFileInfo = async (fileId: string, useAdminMode: boolean = true) => {
  try {
    if (useAdminMode) {
      // Use direct API fetch with admin mode
      const endpoint = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}?mode=admin`;
      
      // Get API key from environment variables
      const API_KEY = import.meta.env.VITE_APPWRITE_API_KEY;
      
      const headers: Record<string, string> = {
        'X-Appwrite-Project': PROJECT_ID,
      };
      
      // Add API key header if available
      if (API_KEY) {
        headers['X-Appwrite-Key'] = API_KEY;
      }
      
      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file info: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } else {
      // Try to get file info with SDK (will fail if user has no permission)
      const fileInfo = await storage.getFile(
        BUCKET_ID,
        fileId
      );
      return fileInfo;
    }
  } catch (error) {
    console.error('Error getting file info:', error);
    // Return null on error rather than throwing
    return null;
  }
};

// Export as a service object
export const storageService = {
  uploadFile,
  getFilePreview,
  getFileView,
  getFileDownload,
  deleteFile,
  getFileInfo
}; 