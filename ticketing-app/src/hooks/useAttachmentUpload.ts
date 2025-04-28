import { useState, useCallback } from "react";
import { uploadFile } from "@/services/storageService";
import { ticketsService } from "@/services/ticketsService";

/**
 * Hook for handling file uploads and updating ticket attachments
 */
export function useAttachmentUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload files and add them to a ticket's attachments
   */
  const uploadFilesAndUpdateTicket = useCallback(
    async (
      files: File[], 
      ticketId: string, 
      currentAttachments: string[] = []
    ): Promise<string[]> => {
      if (!files.length || !ticketId) {
        return currentAttachments;
      }

      try {
        setUploading(true);
        setError(null);
        setUploadProgress(0);

        const uploadedFileIds: string[] = [];
        
        // Upload each file sequentially
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const result = await uploadFile(file);
          
          if (result && result.$id) {
            uploadedFileIds.push(result.$id);
          }
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }
        
        // Combine new attachments with existing ones
        const allAttachments = [...currentAttachments, ...uploadedFileIds];
        
        // Update the ticket with the new attachments
        await ticketsService.updateTicket(ticketId, {
          attachments: allAttachments
        });
        
        return allAttachments;
      } catch (err) {
        console.error("Error uploading files:", err);
        setError(err instanceof Error ? err : new Error("Failed to upload files"));
        return currentAttachments;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return {
    uploadFilesAndUpdateTicket,
    uploading,
    error,
    uploadProgress
  };
} 