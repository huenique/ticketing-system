import React, { useState } from "react";
import { Paperclip, X, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFilePreview, getFileDownload } from "@/services/storageService";
import { Progress } from "@/components/ui/progress";

interface AttachmentsWidgetProps {
  attachments: string[];
  onAddAttachments?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment?: (id: string) => void;
  isReadOnly?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
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
                      <p className="text-sm font-medium truncate">File {index + 1}</p>
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