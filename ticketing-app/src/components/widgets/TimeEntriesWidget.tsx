import React, { useState } from "react";
import { TimeEntry } from "../../types/tickets";
import { getFileDownload, getFilePreview, uploadFile, deleteFile } from "@/services/storageService";
import { Paperclip, Download, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface TimeEntriesWidgetProps {
  timeEntries: TimeEntry[];
  handleUpdateTimeEntry?: (id: string, field: string, value: string) => void;
  handleRemoveTimeEntry?: (id: string) => void;
}

const TimeEntriesWidget: React.FC<TimeEntriesWidgetProps> = ({
  timeEntries,
  handleUpdateTimeEntry,
  handleRemoveTimeEntry,
}) => {
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [deleting, setDeleting] = useState<{ [key: string]: boolean }>({});
  
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
      if (handleUpdateTimeEntry) {
        handleUpdateTimeEntry(entryId, "files", JSON.stringify(allFiles));
      }
      
      toast.success("Files uploaded successfully");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      // Reset uploading state
      setUploading(prev => ({ ...prev, [entryId]: false }));
    }
  };
  
  // Handle deleting all files for a time entry before removing it
  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!handleRemoveTimeEntry) return;
    
    try {
      // Find the time entry
      const entry = timeEntries.find(entry => entry.id === entryId);
      if (!entry) {
        // If entry not found, just proceed with regular removal
        handleRemoveTimeEntry(entryId);
        return;
      }
      
      // Get the files for this entry
      const files = entry.files || [];
      
      if (files.length > 0) {
        // Set deleting state
        setDeleting(prev => ({ ...prev, [entryId]: true }));
        
        // Delete each file from storage
        for (const fileId of files) {
          try {
            await deleteFile(fileId);
            console.log(`Deleted file ${fileId} from storage`);
          } catch (fileError) {
            console.error(`Error deleting file ${fileId}:`, fileError);
            // Continue with other files even if one fails
          }
        }
      }
      
      // Remove the time entry
      handleRemoveTimeEntry(entryId);
      toast.success("Time entry and associated files removed");
    } catch (error) {
      console.error(`Error removing time entry ${entryId}:`, error);
      toast.error("Failed to remove time entry");
    } finally {
      // Reset deleting state
      setDeleting(prev => ({ ...prev, [entryId]: false }));
    }
  };

  return (
    <div className="overflow-auto">
      {timeEntries?.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Stop Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Duration (hrs)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {timeEntries.map((entry, index) => (
                <tr key={`time-entry-${entry.id || index}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.assigneeName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="time"
                      value={entry.startTime}
                      onChange={(e) =>
                        handleUpdateTimeEntry &&
                        handleUpdateTimeEntry(
                          entry.id,
                          "startTime",
                          e.target.value,
                        )
                      }
                      className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="time"
                      value={entry.stopTime}
                      onChange={(e) =>
                        handleUpdateTimeEntry &&
                        handleUpdateTimeEntry(
                          entry.id,
                          "stopTime",
                          e.target.value,
                        )
                      }
                      className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="bg-neutral-100 px-2 py-1 rounded">{entry.duration} hours</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.dateCreated}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={entry.remarks}
                      onChange={(e) =>
                        handleUpdateTimeEntry &&
                        handleUpdateTimeEntry(
                          entry.id,
                          "remarks",
                          e.target.value,
                        )
                      }
                      className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`table-file-upload-${entry.id}`}
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFileUpload(entry.id, e.target.files);
                            }
                          }}
                        />
                        
                        {entry.files && entry.files.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                              {entry.files.length} {entry.files.length === 1 ? 'file' : 'files'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById(`table-file-upload-${entry.id}`)?.click();
                              }}
                              disabled={uploading[entry.id]}
                              className="inline-flex items-center justify-center p-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                              title="Add files"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-xs text-neutral-700"
                            onClick={() => {
                              document.getElementById(`table-file-upload-${entry.id}`)?.click();
                            }}
                            disabled={uploading[entry.id]}
                          >
                            {uploading[entry.id] ? (
                              <>
                                <Upload className="h-3 w-3 animate-pulse" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Paperclip className="h-3 w-3" />
                                <span>Attach files</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {uploading[entry.id] && (
                        <Progress 
                          value={uploadProgress[entry.id] || 0} 
                          className="w-full h-1" 
                        />
                      )}
                      
                      {entry.files && entry.files.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.files.map((fileId, index) => (
                            <div 
                              key={`${entry.id}-file-${index}-${fileId}`}
                              className="group relative inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                            >
                              <a 
                                href={getFileDownload(fileId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                                title="Download file"
                              >
                                <Download className="h-2.5 w-2.5" />
                                <span>{index + 1}</span>
                              </a>
                              {handleUpdateTimeEntry && (
                                <button
                                  onClick={() => {
                                    const newFiles = [...entry.files || []];
                                    newFiles.splice(index, 1);
                                    handleUpdateTimeEntry(
                                      entry.id,
                                      "files",
                                      JSON.stringify(newFiles)
                                    );
                                  }}
                                  className="opacity-0 group-hover:opacity-100 ml-0.5 text-neutral-500 hover:text-red-500 transition-opacity"
                                  title="Remove file"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteTimeEntry(entry.id)}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Remove Time Entry"
                      disabled={deleting[entry.id]}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-neutral-500 text-sm bg-neutral-50 rounded-md">
          No time entries recorded yet.
        </div>
      )}
    </div>
  );
};

export default TimeEntriesWidget; 