import React, { useState, useEffect } from "react";
import { Paperclip, X, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFilePreview, getFileDownload, getFileInfo } from "@/services/storageService";
import { Progress } from "@/components/ui/progress";

interface AttachmentsWidgetProps {
  attachments: string[];
  onAddAttachments?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment?: (id: string) => void;
  isReadOnly?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
}

// Type for file info
interface FileInfo {
  id: string;
  name: string | null;
  loading: boolean;
}

export default function AttachmentsWidget({
  attachments = [],
  onAddAttachments,
  onRemoveAttachment,
  isReadOnly = false,
  isUploading = false,
  uploadProgress = 0
}: AttachmentsWidgetProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [fileInfos, setFileInfos] = useState<Record<string, FileInfo>>({});

  // Fetch file info for each attachment
  useEffect(() => {
    const fetchFileInfos = async () => {
      // Only fetch for valid file IDs (not "uploading...")
      const validFileIds = attachments.filter(id => id !== "uploading...");
      
      // Initialize loading states for files we don't have info for yet
      validFileIds.forEach(fileId => {
        if (!fileInfos[fileId]) {
          setFileInfos(prev => ({
            ...prev,
            [fileId]: { id: fileId, name: null, loading: true }
          }));
        }
      });
      
      // Fetch file info for each attachment
      for (const fileId of validFileIds) {
        // Skip if we already have info for this file and it's not loading
        if (fileInfos[fileId] && !fileInfos[fileId].loading) continue;
        
        try {
          const info = await getFileInfo(fileId);
          setFileInfos(prev => ({
            ...prev,
            [fileId]: { 
              id: fileId, 
              name: info?.name || getDefaultFileName(fileId, attachments.indexOf(fileId)), 
              loading: false 
            }
          }));
        } catch (error) {
          console.error(`Error fetching file info for ${fileId}:`, error);
          setFileInfos(prev => ({
            ...prev,
            [fileId]: { 
              id: fileId, 
              name: getDefaultFileName(fileId, attachments.indexOf(fileId)), 
              loading: false 
            }
          }));
        }
      }
    };
    
    fetchFileInfos();
  }, [attachments]);

  // Helper function to generate a default file name if actual name can't be fetched
  const getDefaultFileName = (fileId: string, index: number): string => {
    // If fileId contains a recognizable pattern that might include the name, extract it
    if (fileId.includes("_") && fileId.length > 10) {
      const parts = fileId.split("_");
      if (parts.length > 1) {
        return parts[parts.length - 1]; // Get the last part
      }
    }
    
    // Default to "File" + index
    return `File ${index + 1}`;
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Helper to determine file type from attachment ID or URL
  const getFileType = (fileIdOrUrl: string): 'image' | 'document' | 'unknown' => {
    if (fileIdOrUrl === "uploading...") return 'unknown';
    
    // If it's a URL, try to determine type from extension
    if (fileIdOrUrl.startsWith('http')) {
      const ext = fileIdOrUrl.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
        return 'image';
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext || '')) {
        return 'document';
      }
      return 'unknown';
    }
    
    // Otherwise assume it's an Appwrite file ID - we can't know the type without metadata
    // For now, treat all Appwrite files as documents
    return 'document';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* File list */}
      <div className="flex-grow overflow-auto">
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-4">
            <Paperclip className="h-12 w-12 mb-2" />
            <p className="text-center">No attachments</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3">
            {attachments.map((fileId, index) => {
              // Skip rendering if it's the uploading placeholder
              if (fileId === "uploading...") {
                return (
                  <div key={`uploading-${index}-${new Date().getTime()}`} className="border rounded-md p-2 flex flex-col items-center">
                    <div className="animate-pulse flex space-x-2 items-center w-full mb-2">
                      <div className="rounded-md bg-slate-200 h-8 w-8"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 bg-slate-200 rounded"></div>
                        <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                      </div>
                    </div>
                    <Progress value={uploadProgress} className="w-full h-1" />
                    <p className="text-xs text-neutral-500 mt-1">Uploading...</p>
                  </div>
                );
              }
              
              const fileType = getFileType(fileId);
              const fileInfo = fileInfos[fileId] || { id: fileId, name: null, loading: true };
              const displayName = fileInfo.loading ? 
                "Loading..." : 
                (fileInfo.name || getDefaultFileName(fileId, index));
                
              return (
                <div 
                  key={`file-${fileId}-${index}`} 
                  className="border rounded-md p-2 flex flex-col justify-between transition-all hover:border-blue-300"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 flex items-center justify-center bg-neutral-100 rounded mr-2">
                      {fileType === 'image' ? (
                        <img 
                          src={getFilePreview(fileId, 100, 100)} 
                          alt="Preview" 
                          className="w-full h-full object-cover rounded" 
                        />
                      ) : (
                        <Paperclip className="h-5 w-5 text-neutral-500" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-neutral-500 truncate">{fileId.substring(0, 10)}...</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-1">
                    {!isReadOnly && onRemoveAttachment && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => onRemoveAttachment(fileId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => window.open(getFileDownload(fileId), '_blank')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Upload controls */}
      {!isReadOnly && onAddAttachments && (
        <div className="border-t p-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onAddAttachments}
            className="hidden"
            multiple
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center justify-center"
            onClick={handleTriggerFileInput}
            disabled={isUploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Add Attachment'}
          </Button>
          {isUploading && (
            <Progress value={uploadProgress} className="w-full h-1 mt-2" />
          )}
        </div>
      )}
    </div>
  );
} 