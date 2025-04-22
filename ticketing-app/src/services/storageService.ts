import { appwriteFetch } from "@/lib/appwrite";

// Storage bucket ID from environment variables
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const API_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

// Types for preview options
export type ImageGravity = 'center' | 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'gif' | 'webp';

// Storage service
export const storageService = {
  /**
   * Get file download URL
   */
  getFileDownloadURL: (fileId: string): string => {
    return `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}&mode=admin`;
  },

  /**
   * Get file preview URL (for images)
   */
  getFilePreviewURL: (fileId: string, width?: number, height?: number): string => {
    let url = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}&mode=admin`;
    
    if (width) url += `&width=${width}`;
    if (height) url += `&height=${height}`;
    
    return url;
  },

  /**
   * Get file preview URL with advanced options
   * @param fileId File ID
   * @param width Resize preview image width (0-4000)
   * @param height Resize preview image height (0-4000)
   * @param gravity Image crop gravity
   * @param quality Preview image quality (0-100)
   * @param borderWidth Preview image border in pixels (0-100)
   * @param borderColor Border color (HEX without #)
   * @param borderRadius Border radius in pixels (0-4000)
   * @param opacity Image opacity (0-1)
   * @param rotation Image rotation in degrees (-360 to 360)
   * @param background Background color for transparent images (HEX without #)
   * @param output Output format (jpeg, jpg, png, gif, webp)
   */
  getFilePreview: (
    fileId: string, 
    width?: number, 
    height?: number,
    gravity?: ImageGravity,
    quality?: number,
    borderWidth?: number,
    borderColor?: string,
    borderRadius?: number,
    opacity?: number,
    rotation?: number,
    background?: string,
    output?: ImageFormat
  ): string => {
    let url = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/preview?project=${PROJECT_ID}&mode=admin`;
    
    if (width !== undefined) url += `&width=${width}`;
    if (height !== undefined) url += `&height=${height}`;
    if (gravity) url += `&gravity=${gravity}`;
    if (quality !== undefined) url += `&quality=${quality}`;
    if (borderWidth !== undefined) url += `&borderWidth=${borderWidth}`;
    if (borderColor) url += `&borderColor=${borderColor}`;
    if (borderRadius !== undefined) url += `&borderRadius=${borderRadius}`;
    if (opacity !== undefined) url += `&opacity=${opacity}`;
    if (rotation !== undefined) url += `&rotation=${rotation}`;
    if (background) url += `&background=${background}`;
    if (output) url += `&output=${output}`;
    
    return url;
  },

  /**
   * Get file details
   */
  getFileDetails: async (fileId: string): Promise<any> => {
    return appwriteFetch(`/storage/buckets/${BUCKET_ID}/files/${fileId}`);
  },

  /**
   * Check if file is an image
   */
  isImageFile: (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  }
}; 