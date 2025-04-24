import { storage, ID, storageService as appwriteStorage } from "@/lib/appwrite";

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
    return await appwriteStorage.uploadFile(file, permissions);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Get a file preview URL
 */
export const getFilePreview = (fileId: string, width?: number, height?: number) => {
  try {
    return appwriteStorage.getFilePreview(fileId, width, height);
  } catch (error) {
    console.error('Error getting file preview:', error);
    throw error;
  }
};

/**
 * Get a file download URL
 */
export const getFileDownload = (fileId: string) => {
  try {
    return storage.getFileDownload(BUCKET_ID, fileId);
  } catch (error) {
    console.error('Error getting file download URL:', error);
    throw error;
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (fileId: string) => {
  try {
    await appwriteStorage.deleteFile(fileId);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Export as a service object
export const storageService = {
  uploadFile,
  getFilePreview,
  getFileDownload,
  deleteFile
}; 