import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TimeEntry } from "../../types/tickets";
import useUserStore from "../../stores/userStore";

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
            className="bg-blue-500 hover:bg-blue-600 text-white"
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
                        // Handle file upload logic here
                        const fileNames = Array.from(e.target.files).map(f => f.name);
                        
                        // Update the time entry with the new files
                        handleUpdateTimeEntry(
                          entry.id,
                          "files",
                          JSON.stringify(fileNames)
                        );
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
                  >
                    Upload Files
                  </Button>
                  
                  {entry.files && entry.files.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {entry.files.length} file(s) attached
                    </div>
                  )}
                </div>
                
                {entry.files && entry.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.files.map((file, index) => (
                      <span
                        key={`${entry.id}-file-${index}-${file}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {file.split("/").pop()}
                        <button
                          type="button"
                          className="ml-1 h-4 w-4 rounded-full hover:bg-blue-200 inline-flex items-center justify-center"
                          onClick={() => {
                            // Remove file logic
                            const newFiles = [...entry.files || []];
                            newFiles.splice(index, 1);
                            
                            handleUpdateTimeEntry(
                              entry.id,
                              "files",
                              JSON.stringify(newFiles)
                            );
                          }}
                        >
                          ×
                        </button>
                      </span>
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