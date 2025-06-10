import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimeEntry } from "@/types/tickets";
import { uploadFile } from "@/services/storageService";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (timeEntry: Partial<TimeEntry>) => void;
  assigneeName?: string;
}

const TimeEntryDialog: React.FC<TimeEntryDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  assigneeName = "Unassigned"
}) => {
  const [startTime, setStartTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [stopTime, setStopTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [duration, setDuration] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Calculate duration when start or stop time changes
  useEffect(() => {
    if (startTime && stopTime) {
      try {
        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const [stopHours, stopMinutes] = stopTime.split(":").map(Number);

        let durationHours = stopHours - startHours;
        let durationMinutes = stopMinutes - startMinutes;

        if (durationMinutes < 0) {
          durationHours -= 1;
          durationMinutes += 60;
        }

        if (durationHours < 0) {
          durationHours += 24;
        }

        const totalDuration = durationHours + durationMinutes / 60;
        setDuration(totalDuration.toFixed(1));
      } catch (error) {
        console.error("Error calculating duration:", error);
      }
    }
  }, [startTime, stopTime]);

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const uploadedFileIds: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFile(file);
        
        if (result && result.$id) {
          uploadedFileIds.push(result.$id);
        }
        
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      setFiles(prev => [...prev, ...uploadedFileIds]);
      toast.success("Files uploaded successfully");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!startTime || !stopTime) {
      toast.error("Please fill in both start and stop times");
      return;
    }

    // Format the time entry data
    const timeEntryData: Partial<TimeEntry> = {
      startTime: startTime + ":00", // Add seconds to match HH:MM:SS format
      stopTime: stopTime + ":00", // Add seconds to match HH:MM:SS format
      duration,
      dateCreated: date,
      remarks,
      files,
    };

    console.log("Submitting time entry data:", timeEntryData);
    onSubmit(timeEntryData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Time Entry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Time
              </label>
              <Input
                type="time"
                value={stopTime}
                onChange={(e) => setStopTime(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (hours)
            </label>
            <Input
              type="text"
              value={duration}
              disabled
              className="bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add your notes here..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Files
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  document.getElementById('file-upload')?.click();
                }}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Files"}
              </Button>
              
              {files.length > 0 && (
                <span className="text-sm text-gray-500">
                  {files.length} file(s) attached
                </span>
              )}
            </div>
            
            {uploading && (
              <Progress value={uploadProgress} className="mt-2" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Time Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimeEntryDialog; 