import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TimeEntry } from "../../types/tickets";
import useUserStore from "../../stores/userStore";
import { uploadFile } from "@/services/storageService";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Paperclip, X, Download } from "lucide-react";
import { getFilePreview, getFileDownload } from "@/services/storageService";

interface TimeEntriesCardWidgetProps {
  timeEntries: TimeEntry[];
  handleUpdateTimeEntry: (id: string, field: string, value: string) => void;
  handleRemoveTimeEntry: (id: string) => void;
  handleAddTimeEntry: (assigneeId: string, userId?: string) => void;
}

const TimeEntriesCardWidget: React.FC<TimeEntriesCardWidgetProps> = ({
  timeEntries,
  handleUpdateTimeEntry,
  handleRemoveTimeEntry,
  handleAddTimeEntry,
}) => {
  const { currentUser } = useUserStore();
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // Handle file upload
  const handleFileUpload = async (entryId: string, files: FileList) => {
    if (!files.length) return;
    
    try {
      // Set uploading state for this entry
      setUploading(prev => ({ ...prev, [entryId]: true }));
      setUploadProgress(prev => ({ ...prev, [entryId]: 0 }));
      
      // Get current files
      const currentEntry = timeEntries.find(entry => entry.id === entryId);
      const currentFiles = currentEntry?.files || [];
      
      // Upload each file
      const uploadedFileIds: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFile(file);
        
        if (result && result.$id) {
          uploadedFileIds.push(result.$id);
        }
        
        // Update progress
        setUploadProgress(prev => ({ 
          ...prev, 
          [entryId]: Math.round(((i + 1) / files.length) * 100) 
        }));
      }
      
      // Combine with existing files
      const allFiles = [...currentFiles, ...uploadedFileIds];
      
      // Update the time entry
      handleUpdateTimeEntry(entryId, "files", JSON.stringify(allFiles));
      
      toast.success("Files uploaded successfully");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      // Reset uploading state
      setUploading(prev => ({ ...prev, [entryId]: false }));
    }
  };
  
  return (
    <div className="mt-4">
      <div className="flex justify-between mb-4">
        <div className="text-gray-500 text-sm">
          Record time spent working on this ticket
        </div>
        {handleAddTimeEntry && (
          <Button
            onClick={() => {
              // Pass empty assigneeId but current user's ID (if available)
              handleAddTimeEntry("", currentUser?.id || "");
            }}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Add Time Entry
          </Button>
        )}
      </div>
      
      {timeEntries && timeEntries.length > 0 ? (
        <div className="space-y-6">
          {timeEntries.map((entry) => (
            <div
              key={`time-entry-${entry.id}`}
              className="bg-white border border-gray-200 rounded-md p-4 shadow-sm"
            >
              <div className="flex justify-between mb-2">
                <div className="text-sm font-medium">
                  {entry.assigneeName || "Unassigned"}
                </div>
                <div className="text-xs text-gray-500">
                  {entry.dateCreated}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={entry.startTime}
                    onChange={(e) =>
                      handleUpdateTimeEntry(
                        entry.id,
                        "startTime",
                        e.target.value
                      )
                    }
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Stop Time
                  </label>
                  <input
                    type="time"
                    value={entry.stopTime}
                    onChange={(e) =>
                      handleUpdateTimeEntry(
                        entry.id,
                        "stopTime",
                        e.target.value
                      )
                    }
                    className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Remarks
                </label>
                <Textarea
                  value={entry.remarks}
                  onChange={(e) =>
                    handleUpdateTimeEntry(
                      entry.id,
                      "remarks",
                      e.target.value
                    )
                  }
                  className="block w-full text-sm"
                  placeholder="Add your notes here..."
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Files
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    id={`file-upload-${entry.id}`}
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(entry.id, e.target.files);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      document.getElementById(`file-upload-${entry.id}`)?.click();
                    }}
                    disabled={uploading[entry.id]}
                  >
                    {uploading[entry.id] ? "Uploading..." : "Upload Files"}
                  </Button>
                  
                  {entry.files && entry.files.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {entry.files.length} file(s) attached
                    </div>
                  )}
                </div>
                
                {uploading[entry.id] && (
                  <Progress 
                    value={uploadProgress[entry.id] || 0} 
                    className="w-full h-1 mt-2" 
                  />
                )}
                
                {entry.files && entry.files.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {entry.files.map((fileId, index) => (
                      <div 
                        key={`${entry.id}-file-${index}-${fileId}`}
                        className="border rounded-md p-2 flex flex-col justify-between transition-all hover:border-blue-300"
                      >
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 flex items-center justify-center bg-neutral-100 rounded mr-2">
                            <Paperclip className="h-4 w-4 text-neutral-500" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-medium truncate">File {index + 1}</p>
                            <p className="text-xs text-neutral-500 truncate">{fileId.substring(0, 6)}...</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => {
                              // Remove file
                              const newFiles = [...entry.files || []];
                              newFiles.splice(index, 1);
                              handleUpdateTimeEntry(
                                entry.id,
                                "files",
                                JSON.stringify(newFiles)
                              );
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
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
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-medium">Duration: </span>
                  <span className="bg-neutral-100 px-2 py-1 rounded">{entry.duration} hours</span>
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveTimeEntry(entry.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No time entries recorded for this ticket yet.
        </div>
      )}
    </div>
  );
};

export default TimeEntriesCardWidget; 