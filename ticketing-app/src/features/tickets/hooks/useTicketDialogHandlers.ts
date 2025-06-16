import { Layouts } from "react-grid-layout";
import { useState } from "react";
import { toast } from "sonner";
import { timeEntriesService } from "@/services/timeEntriesService";

import { PRESET_TABLES, WIDGET_TYPES } from "../../../constants/tickets";
import useTablesStore from "../../../stores/tablesStore";
import useUserStore from "../../../stores/userStore";
import type {
  Assignee,
  LayoutStorage,
  Row,
  Tab,
  Table,
  TicketForm,
  TimeEntry,
  Widget,
} from "../../../types/tickets";
import { convertTicketToRow, getFromLS, saveToLS } from "../../../utils/ticketUtils";
import { ticketsService } from "../../../services/ticketsService";
import { uploadFile } from "../../../services/storageService";
import { customersService, ticketAssignmentsService } from "../../../services";
import { statusesService } from "../../../services/ticketsService";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";

// Types for handler return values
interface TicketDialogState {
  viewDialogOpen: boolean;
  setViewDialogOpen: (open: boolean) => void;
  currentTicket: Row | null;
  setCurrentTicket: (ticket: Row | null) => void;
  currentTicketPreset: string | undefined;
  setCurrentTicketPreset: (preset: string | undefined) => void;
  ticketForm: TicketForm;
  setTicketForm: (form: TicketForm | ((prevForm: TicketForm) => TicketForm)) => void;
  uploadedImages: string[];
  setUploadedImages: (images: string[] | ((prevImages: string[]) => string[])) => void;
  assignees: Assignee[];
  setAssignees: (assignees: Assignee[] | ((prevAssignees: Assignee[]) => Assignee[])) => void;
  timeEntries: TimeEntry[];
  setTimeEntries: (entries: TimeEntry[] | ((prevEntries: TimeEntry[]) => TimeEntry[])) => void;
  isEditLayoutMode: boolean;
  setIsEditLayoutMode: (isEdit: boolean) => void;
  showAssigneeForm: boolean;
  setShowAssigneeForm: (show: boolean) => void;
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
  modifiedTimeEntries: Set<string>;
  setModifiedTimeEntries: (entries: Set<string> | ((prevEntries: Set<string>) => Set<string>)) => void;
}

interface TicketDialogHandlers {
  handleAddAssignee: () => void;
  handleRemoveAssignee: (id: string) => void;
  handleUpdateAssignee: (id: string, field: string, value: string) => void;
  handleAddTimeEntry: (assigneeId: string, directUserId?: string, timeEntryData?: Partial<TimeEntry>) => void;
  handleRemoveTimeEntry: (id: string) => void;
  handleUpdateTimeEntry: (id: string, field: string, value: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  markAssigneeCompleted: (id: string, completed: string | boolean) => void;
  handleInitializeTicketDialog: (ticket: Row) => void;
  handleSaveTicketChanges: () => Promise<boolean>;
  viewTicket: (ticket: Row, tabId: string) => Promise<void>;
}

// Base hook that manages ticket dialog state
function useTicketDialogState(): TicketDialogState {
  // Ticket Dialog State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Row | null>(null);
  const [currentTicketPreset, setCurrentTicketPreset] = useState<string | undefined>(undefined);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);

  // Ticket Form State
  const [ticketForm, setTicketForm] = useState<TicketForm>({
    status: "",
    customerId: "",
    description: "",
    billableHours: 0,
    totalHours: 0,
    assigneeIds: [],
    attachments: [], // Initialize attachments array
  });

  // Attachments State
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Assignee State
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [newAssignee, setNewAssignee] = useState<Assignee>({
    id: "",
    name: "",
    workDescription: "",
    totalHours: "0",
    estTime: "0",
    priority: "3",
    user_id: "",
  });
  const [showAssigneeForm, setShowAssigneeForm] = useState(false);

  // Time Entries State
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  // Track modified time entries
  const [modifiedTimeEntries, setModifiedTimeEntries] = useState<Set<string>>(new Set());

  return {
    viewDialogOpen,
    setViewDialogOpen,
    currentTicket,
    setCurrentTicket,
    currentTicketPreset,
    setCurrentTicketPreset,
    ticketForm,
    setTicketForm,
    uploadedImages,
    setUploadedImages,
    assignees,
    setAssignees,
    timeEntries,
    setTimeEntries,
    isEditLayoutMode,
    setIsEditLayoutMode,
    showAssigneeForm,
    setShowAssigneeForm,
    newAssignee,
    setNewAssignee,
    modifiedTimeEntries,
    setModifiedTimeEntries,
  };
}

// Re-implement the useImageHandlers function to use direct state updates
function useImageHandlers(state: TicketDialogState) {
  const { setUploadedImages, currentTicket, setTicketForm, uploadedImages } = state;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Add uploading placeholder directly
    const imagesWithPlaceholder = [...uploadedImages, "uploading..."];
    setUploadedImages(imagesWithPlaceholder);

    // Upload files to Appwrite storage
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        // Upload to Appwrite storage
        const uploadResult = await uploadFile(file);
        
        if (uploadResult && uploadResult.$id) {
          console.log(`File uploaded successfully with ID: ${uploadResult.$id}`);
          return uploadResult.$id;
        } else {
          console.error("File upload failed: No ID returned");
          return null;
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        return null;
      }
    });

    // Process all uploads
    Promise.all(uploadPromises).then((fileIds) => {
      // Filter out any failed uploads
      const successfulFileIds = fileIds.filter((id: string | null) => id !== null) as string[];
      
      // Get latest state for updates
      const currentImages = [...state.uploadedImages];
      
      // Remove the uploading placeholder
      const filteredImages = currentImages.filter(img => img !== "uploading...");
      
      // Add new file IDs
      const updatedImages = [...filteredImages, ...successfulFileIds];
      
      // Update state with the successful uploads
      setUploadedImages(updatedImages);
      
      // If we have a current ticket, update the attachments in the form
      if (currentTicket && successfulFileIds.length > 0) {
        const updatedAttachments = [...(state.ticketForm.attachments || []), ...successfulFileIds];
        const updatedForm = {
          ...state.ticketForm,
          attachments: updatedAttachments
        };
        setTicketForm(updatedForm);
        // PATCH the ticket record in the backend
        ticketsService.updateTicket(currentTicket.id, {
          attachments: updatedAttachments
        });
      }
    });
  };

  return { handleImageUpload };
}

// Hook for assignee operations with direct state updates
function useAssigneeHandlers(state: TicketDialogState) {
  const {
    currentTicket,
    assignees,
    setAssignees,
    timeEntries,
    setTimeEntries,
    ticketForm,
    setTicketForm,
    newAssignee,
    setNewAssignee,
    setShowAssigneeForm,
    setCurrentTicket
  } = state;
  
  const { currentUser } = useUserStore();

  const handleAddAssignee = async () => {
    if (state.newAssignee.name.trim() === "") return;

    // Compute the lowest available priority (starting from 1)
    const assignedPriorities = assignees
      .map(a => parseInt(a.priority || '0', 10))
      .filter(n => !isNaN(n));
    let nextPriority = 1;
    while (assignedPriorities.includes(nextPriority)) {
      nextPriority++;
    }

    // Always assign the lowest available priority to the new assignee
    const assigneeId = `a${Date.now()}`;
    const assigneeToAdd: Assignee = {
      ...state.newAssignee,
      id: assigneeId,
      priority: String(nextPriority),
    };

    // If the user_id isn't set but we have a current user, use the current user's ID
    if (!assigneeToAdd.user_id && currentUser && currentUser.id) {
      assigneeToAdd.user_id = currentUser.id;
      // Also update the name if it's empty
      if (!assigneeToAdd.name.trim() && currentUser.name) {
        assigneeToAdd.name = currentUser.name;
      }
    }

    try {
      // If we're in edit mode and have a current ticket, save to Appwrite
      if (currentTicket && currentTicket.id) {
        // Get the ticket ID from the current ticket
        const ticketId = currentTicket.id || currentTicket.cells["col-1"];
        // Create a ticket assignment in Appwrite
        const createdAssignment = await ticketAssignmentsService.createAssignmentFromAssignee(
          assigneeToAdd,
          ticketId
        );
        // Update the assignee with the real ID from Appwrite
        assigneeToAdd.id = createdAssignment.id;
        toast.success("Team member assigned successfully");
      }
      // Add to local state - use direct update
      const updatedAssignees = [...assignees, assigneeToAdd];
      setAssignees(updatedAssignees);
      // Reset the form
      setNewAssignee({
        id: "",
        name: "",
        workDescription: "",
        totalHours: "0",
        estTime: "0",
        priority: "",
        user_id: "",
      });
      setShowAssigneeForm(false);
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to assign team member", {
        description: "Please try again"
      });
    }
  };

  const handleRemoveAssignee = async (id: string) => {
    try {
      // If we're in edit mode and have a current ticket, delete from Appwrite
      if (currentTicket && currentTicket.id) {
        // Get the assignee being removed to get their user_id
        const assigneeToRemove = assignees.find(a => a.id === id);
        
        if (assigneeToRemove) {
          // Delete the ticket assignment
          await ticketAssignmentsService.deleteTicketAssignment(id);
          
          // Get the current ticket to update its assignee_ids
          const ticket = await ticketsService.getTicket(currentTicket.id);
          
          // Remove the user_id from assignee_ids array
          const updatedAssigneeIds = Array.isArray(ticket.assignee_ids) 
            ? ticket.assignee_ids.filter(assigneeId => {
                // Handle both string IDs and object IDs
                const idToCompare = typeof assigneeId === 'object' 
                  ? (assigneeId as any).$id || (assigneeId as any).id 
                  : assigneeId;
                
                // Get the user_id to compare, handling both string and object formats
                const userIdToRemove = typeof assigneeToRemove.user_id === 'object'
                  ? (assigneeToRemove.user_id as any).$id || (assigneeToRemove.user_id as any).id
                  : assigneeToRemove.user_id;
                
                return idToCompare !== userIdToRemove;
              })
            : [];
          
          // Update the ticket with the new assignee_ids
          await ticketsService.updateTicket(currentTicket.id, {
            assignee_ids: updatedAssigneeIds
          });
          
          // Update the Assign To column in the tickets table
          const tablesState = useTablesStore.getState();
          const updatedTables = { ...tablesState.tables };
          
          // Get the names of remaining assignees from the updated assignees array
          const remainingAssignees = assignees
            .filter(a => a.id !== id)
            .map(a => a.name)
            .join(", ");
          
          // Update all tabs that contain this ticket
          Object.keys(updatedTables).forEach(tabId => {
            const table = updatedTables[tabId];
            if (table) {
              const updatedRows = table.rows.map((row: Row) => {
                if (row.id === currentTicket.id) {
                  return {
                    ...row,
                    cells: {
                      ...row.cells,
                      "col-5": remainingAssignees || "Unassigned", // Update Assign To column
                      "assignee_ids": JSON.stringify(updatedAssigneeIds) // Update assignee_ids field
                    }
                  };
                }
                return row;
              });
              
              updatedTables[tabId] = {
                ...table,
                rows: updatedRows
              };
            }
          });
          
          // Update the global tables state
          useTablesStore.getState().setTables(updatedTables);
          
          // Also update the current ticket's cells to maintain consistency
          currentTicket.cells["col-5"] = remainingAssignees || "Unassigned";
          currentTicket.cells["assignee_ids"] = JSON.stringify(updatedAssigneeIds);
        }
        
        toast.success("Team member removed successfully");
      }
      
      // Remove from local state - use direct update
      const updatedAssignees = assignees.filter(a => a.id !== id);
      setAssignees(updatedAssignees);
      
      // Also remove related time entries - use direct update
      const updatedTimeEntries = timeEntries.filter(t => t.assigneeId !== id);
      setTimeEntries(updatedTimeEntries);
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member", {
        description: "Please try again"
      });
    }
  };

  const handleUpdateAssignee = async (id: string, field: string, value: string) => {
    // Map UI field names to database field names
    const fieldMappings: Record<string, string> = {
      workDescription: "work_description",
      totalHours: "actual_time",
      estTime: "estimated_time",
      priority: "priority" // Add priority to field mappings
    };
    
    try {
      let updatedAssignees: Assignee[] = [...assignees];
      
      // Special handling for priority field to prevent duplicates
      if (field === "priority") {
        // Find the assignee we're updating
        const currentAssigneeIndex = assignees.findIndex((a, index) => 
          (a.id === id) || (id.startsWith('index-') && id === `index-${index}`)
        );
        
        if (currentAssigneeIndex !== -1) {
          const currentAssignee = assignees[currentAssigneeIndex];
          
          // Find any existing assignee with the same priority value
          const existingWithSamePriorityIndex = assignees.findIndex(a => 
            a.id !== currentAssignee.id && a.priority === value
          );
          
          // If there's already an assignee with this priority, swap their priorities
          if (existingWithSamePriorityIndex !== -1) {
            const existingWithSamePriority = assignees[existingWithSamePriorityIndex];
            const oldPriority = currentAssignee.priority;
            
            // Update both assignees in a single state update
            updatedAssignees = assignees.map((a, index) => {
              if (index === currentAssigneeIndex) {
                // Update the current assignee with the new priority
                return { ...a, priority: value };
              } else if (index === existingWithSamePriorityIndex) {
                // Update the other assignee with the current assignee's old priority
                return { ...a, priority: oldPriority };
              }
              return a;
            });

            // Update both assignees in the backend
            if (currentTicket && currentTicket.id) {
              if (currentAssignee.id && !currentAssignee.id.startsWith('index-')) {
                await ticketAssignmentsService.updateTicketAssignment(currentAssignee.id, {
                  priority: value
                });
              }
              if (existingWithSamePriority.id && !existingWithSamePriority.id.startsWith('index-')) {
                await ticketAssignmentsService.updateTicketAssignment(existingWithSamePriority.id, {
                  priority: oldPriority
                });
              }
            }
          } else {
            // No duplicate priority, just update the current assignee
            updatedAssignees = assignees.map((a, index) => {
              const idMatches = (a.id === id) || 
                              (id && id.startsWith('index-') && id === `index-${index}`);
              
              if (idMatches) {
                return { ...a, priority: value };
              }
              return a;
            });

            // Update the assignee in the backend
            if (currentTicket && currentTicket.id && id && !id.startsWith('index-')) {
              await ticketAssignmentsService.updateTicketAssignment(id, {
                priority: value
              });
            }
          }
        }
      } else {
        // For non-priority fields, just update the field normally
        updatedAssignees = assignees.map((a, index) => {
          const idMatches = (a.id === id) || 
                          (id && id.startsWith('index-') && id === `index-${index}`);
          
          if (idMatches) {
            return { ...a, [field]: value };
          }
          return a;
        });
      }
      
      // Update state with all changes in a single call
      setAssignees(updatedAssignees);
      
      // If we're in edit mode and have a current ticket, update in Appwrite
      if (currentTicket && currentTicket.id && id && !id.startsWith('index-')) {
        const updates: Partial<Record<string, string>> = {
          [fieldMappings[field]]: value
        };
        
        try {
          await ticketAssignmentsService.updateTicketAssignment(id, updates);
        } catch (error) {
          console.error("Error updating assignment in Appwrite:", error);
          toast.error("Failed to update team member", {
            description: "Please try again"
          });
        }
      }
    } catch (error) {
      console.error(`Error updating team member field '${field}':`, error);
      toast.error("Failed to update team member", {
        description: "Please try again"
      });
    }
  };

  // Handle task/assignee completion status
  const markAssigneeCompleted = async (id: string, completed: string | boolean) => {
    try {
      // Convert string to boolean if needed
      const isCompleted = typeof completed === 'string' ? completed === 'true' : completed;
      
      console.log(`Marking assignee ${id} as ${isCompleted ? 'completed' : 'incomplete'}`);
      
      // Find the assignee
      const assignee = assignees.find(a => a.id === id);
      if (!assignee) {
        console.error(`Assignee ${id} not found`);
        return;
      }

      // Get all time entries for this assignee's user_id
      const assigneeTimeEntries = timeEntries.filter(entry => {
        // Handle both object and string user_id
        const entryUserId = typeof entry.user_id === 'object' 
          ? (entry.user_id as any).$id || (entry.user_id as any).id 
          : entry.user_id;
        const assigneeUserId = typeof assignee.user_id === 'object'
          ? (assignee.user_id as any).$id || (assignee.user_id as any).id
          : assignee.user_id;
        return entryUserId === assigneeUserId;
      });

      console.log("Time entries for assignee:", assigneeTimeEntries);
      
      // Sum up all durations, properly parsing the duration strings
      const totalTimeSpent = assigneeTimeEntries.reduce((sum, entry) => {
        // Parse the duration string to a number, defaulting to 0 if parsing fails
        const duration = parseFloat(entry.duration) || 0;
        console.log(`Processing duration: ${entry.duration} (parsed as ${duration}) from entry ${entry.id}`);
        return sum + duration;
      }, 0);
      
      console.log("Total time spent:", totalTimeSpent);

      // Store the ticket ID at the start to ensure we have it throughout the function
      const ticketId = currentTicket?.id || currentTicket?.cells["col-1"];
      if (!ticketId) {
        throw new Error("No current ticket ID found");
      }

      // Fetch the current ticket data to get the most up-to-date total hours
      const currentTicketData = await ticketsService.getTicket(ticketId);
      if (!currentTicketData) {
        throw new Error("Failed to fetch current ticket data");
      }

      // Get the current total hours from the database
      const currentTotalHours = parseFloat(currentTicketData.total_hours?.toString() || "0");
      console.log("Current total hours from database:", currentTotalHours);
      
      // Calculate new total hours based on whether we're marking as completed or incomplete
      let newTotalHours: number;
      
      if (isCompleted) {
        // When marking as completed, add the time entries to the current total
        newTotalHours = currentTotalHours + totalTimeSpent;
        console.log(`Adding ${totalTimeSpent} hours to current total ${currentTotalHours}`);
      } else {
        // When marking as incomplete, subtract the time entries from the current total
        newTotalHours = currentTotalHours - totalTimeSpent;
        console.log(`Subtracting ${totalTimeSpent} hours from current total ${currentTotalHours}`);
      }
      
      // Ensure we don't go below 0
      newTotalHours = Math.max(0, newTotalHours);
      console.log("New total hours:", newTotalHours);

      // Update the UI immediately with the calculated value
      if (currentTicket) {
        const immediateUpdatedTicket = {
          ...currentTicket,
          id: ticketId,
          cells: {
            ...currentTicket.cells,
            "col-8": newTotalHours.toString()
          }
        };
        console.log("Immediate UI update with calculated total hours:", newTotalHours);
        setCurrentTicket(immediateUpdatedTicket);
      }
      
      // Update the ticket's total hours in the database - ONLY update total_hours
      await ticketsService.updateTicket(ticketId, {
        total_hours: newTotalHours
      });

      // Fetch the updated ticket data to ensure we have the latest values
      const updatedTicketData = await ticketsService.getTicket(ticketId);
      if (!updatedTicketData) {
        throw new Error("Failed to fetch updated ticket data");
      }

      // Get the final total hours from the database
      const finalTotalHours = parseFloat(updatedTicketData.total_hours?.toString() || "0");
      console.log("Final total hours from database:", finalTotalHours);
      console.log("Updated ticket data:", JSON.stringify(updatedTicketData, null, 2));
      
      // Update the ticket form state with the final value from the database
      setTicketForm(prev => ({
        ...prev,
        totalHours: finalTotalHours
      }));

      // Update the current ticket's cells with the final value from the database
      if (currentTicket) {
        const updatedTicket = {
          ...currentTicket,
          id: ticketId,
          cells: {
            ...currentTicket.cells,
            "col-8": finalTotalHours.toString()
          },
          // Preserve the rawData which contains parts and other important data
          rawData: {
            ...currentTicket.rawData,
            total_hours: finalTotalHours
          }
        };
        console.log("Updating current ticket with new total hours:", finalTotalHours);
        console.log("Updated ticket object:", JSON.stringify(updatedTicket, null, 2));
        setCurrentTicket(updatedTicket);
      }

      // Update the assignee's completion status in the database
      if (assignee.ticket_id) {
        await ticketAssignmentsService.updateTicketAssignment(id, {
          is_done: isCompleted
        });
      }

      // Update the local state
      setAssignees(prev => prev.map(a => 
        a.id === id ? { ...a, is_done: isCompleted } : a
      ));

      // Refresh assignees from the database
      const updatedAssignees = await ticketAssignmentsService.getAssignmentsByTicketId(ticketId);
      const mappedAssignees = await Promise.all(
        updatedAssignees.map(ticketAssignmentsService.assignmentToAssignee)
      );
      setAssignees(mappedAssignees);

      // Update the ticket's status in the active tab with the final value from the database
      const updatedRow: Row = {
        id: ticketId,
        cells: {
          // Preserve essential fields from the current ticket
          "col-1": currentTicket?.cells["col-1"] || ticketId,
          "col-2": currentTicket?.cells["col-2"] || "",
          "col-3": currentTicket?.cells["col-3"] || "",
          "col-4": currentTicket?.cells["col-4"] || "",
          "col-5": currentTicket?.cells["col-5"] || "",
          "col-6": currentTicket?.cells["col-6"] || "",
          "col-7": currentTicket?.cells["col-7"] || "",
          "col-8": finalTotalHours.toString(), // Always use the final database value
          "col-9": currentTicket?.cells["col-9"] || "",
          "col-10": currentTicket?.cells["col-10"] || "",
          "col-11": currentTicket?.cells["col-11"] || "",
          // Preserve any other fields that might exist
          ...Object.fromEntries(
            Object.entries(currentTicket?.cells || {}).filter(([key]) => 
              !key.startsWith('col-') && !key.startsWith('col_')
            )
          )
        },
        // Preserve the rawData which contains parts and other important data
        rawData: {
          ...currentTicket?.rawData,
          // Update with the latest data from the database
          ...updatedTicketData,
          total_hours: finalTotalHours
        }
      };
      console.log("Final updated row:", JSON.stringify(updatedRow, null, 2));
      setCurrentTicket(updatedRow);

      toast.success(`Team member marked as ${isCompleted ? 'completed' : 'incomplete'}`);
    } catch (error) {
      console.error("Error marking assignee as completed:", error);
      toast.error("Failed to update team member status");
    }
  };

  return {
    handleAddAssignee,
    handleRemoveAssignee,
    handleUpdateAssignee,
    markAssigneeCompleted,
  };
}

// Hook for time entry operations
function useTimeEntryHandlers(state: TicketDialogState) {
  const { timeEntries, setTimeEntries, currentTicket, assignees, modifiedTimeEntries, setModifiedTimeEntries } = state;

  // Helper to update modified time entries set
  const updateModifiedEntries = (id: string) => {
    if (!id.startsWith('temp_')) {
      // Use the setter function to update the Set
      setModifiedTimeEntries(prevSet => {
        const newSet = new Set(prevSet);
        newSet.add(id);
        console.log(`Marked time entry ${id} as modified`);
        return newSet;
      });
    }
  };

  const handleAddTimeEntry = async (assigneeId: string, directUserId?: string, timeEntryData?: Partial<TimeEntry>) => {
    try {
      console.log("============ ADD TIME ENTRY DEBUG ============");
      console.log("Adding new time entry for assignee ID:", assigneeId);
      console.log("Directly provided user ID:", directUserId);
      console.log("Time entry data from dialog:", timeEntryData);
      
      // Find the assignee by ID
      const assignee = assignees.find((a) => a.id === assigneeId);
      console.log("Found assignee:", assignee ? JSON.stringify(assignee, null, 2) : "Not found");
      
      // Get the user ID from either the direct parameter or the assignee
      let userId = directUserId;
      if (!userId && assignee) {
        userId = assignee.user_id;
      }

      // If userId is an object, extract the ID
      if (typeof userId === 'object' && userId !== null) {
        if ('$id' in userId) {
          userId = (userId as any).$id;
        } else if ('id' in userId) {
          userId = (userId as any).id;
        }
      }

      // Create the new time entry data with the correct field names
      const newTimeEntryData = {
        startTime: timeEntryData?.startTime || "",
        stopTime: timeEntryData?.stopTime || "",
        duration: timeEntryData?.duration || "0",
        dateCreated: timeEntryData?.dateCreated || new Date().toISOString().split('T')[0],
        remarks: timeEntryData?.remarks || "",
        files: timeEntryData?.files || [],
        ticket_id: currentTicket?.id || "",
        user_id: userId || "",
        assigneeId: assigneeId || "",
        assigneeName: assignee?.name || "Unassigned"
      };

      console.log("Time entry data being sent to Appwrite:", newTimeEntryData);

      // If we're in edit mode, save to Appwrite
      if (currentTicket && currentTicket.id) {
        // Save to Appwrite
        const savedTimeEntry = await timeEntriesService.createTimeEntry(newTimeEntryData);
        console.log("Successfully created time entry in Appwrite:", savedTimeEntry);
        
        // Update the UI with the saved entry - use direct state update
        const updatedTimeEntries = [...timeEntries, savedTimeEntry];
        setTimeEntries(updatedTimeEntries);
        
        toast.success("Time entry added successfully");
      } else {
        // If we're in create mode, just update the local state
        console.log("Adding time entry to local state only (no Appwrite save)");
        
        // Create a temporary time entry with generated ID
        const tempTimeEntry = {
          ...newTimeEntryData,
          id: `temp_${Date.now()}`
        };
        
        // Update state with direct update
        const updatedTimeEntries = [...timeEntries, tempTimeEntry];
        setTimeEntries(updatedTimeEntries);
      }
    } catch (error) {
      console.error("Error adding time entry:", error);
      toast.error("Failed to add time entry");
    }
  };

  const handleUpdateTimeEntry = async (id: string, field: string, value: string) => {
    try {
      // Don't allow direct editing of duration field
      if (field === "duration") return;
      
      // Create an array of updated time entries
      const updatedTimeEntries = timeEntries.map(entry => {
        if (entry.id === id) {
          const updatedEntry = { ...entry };
          
          // Handle fields in a type-safe way
          switch (field) {
            case "startTime":
              updatedEntry.startTime = value;
              break;
            case "stopTime":
              updatedEntry.stopTime = value;
              break;
            case "remarks":
              updatedEntry.remarks = value;
              break;
            case "files":
              try {
                updatedEntry.files = JSON.parse(value);
              } catch (e) {
                console.error("Error parsing files JSON:", e);
                updatedEntry.files = [];
              }
              break;
            default:
              // For other fields, safely assign using type assertion
              (updatedEntry as any)[field] = value;
          }

          // Recalculate duration if start or stop time changes
          if (field === "startTime" || field === "stopTime") {
            if (updatedEntry.startTime && updatedEntry.stopTime) {
              try {
                // Parse times in HH:MM format from time input
                const [startHours, startMinutes] = updatedEntry.startTime
                  .split(":")
                  .map(Number);
                const [stopHours, stopMinutes] = updatedEntry.stopTime
                  .split(":")
                  .map(Number);

                // Calculate duration in hours
                let durationHours = stopHours - startHours;
                let durationMinutes = stopMinutes - startMinutes;

                if (durationMinutes < 0) {
                  durationHours -= 1;
                  durationMinutes += 60;
                }

                if (durationHours < 0) {
                  // Assuming stop time is next day if it's earlier than start time
                  durationHours += 24;
                }

                const totalDuration = durationHours + durationMinutes / 60;
                updatedEntry.duration = totalDuration.toFixed(1);
              } catch (error) {
                console.error("Error calculating duration:", error);
                // Keep the previous duration if calculation fails
              }
            }
          }

          return updatedEntry;
        }
        return entry;
      });
      
      // Update the time entries state
      setTimeEntries(updatedTimeEntries);

      // Mark this time entry as modified (if it's a real entry, not a temp one)
      updateModifiedEntries(id);
    } catch (error) {
      console.error(`Error updating time entry field '${field}':`, error);
      toast.error("Failed to update time entry");
    }
  };

  const handleRemoveTimeEntry = async (id: string) => {
    try {
      // Remove from local state first for immediate UI feedback
      const filteredTimeEntries = timeEntries.filter(entry => entry.id !== id);
      setTimeEntries(filteredTimeEntries);
      
      // Only attempt to delete from Appwrite if this is a real entry (not a temp one)
      if (!id.startsWith('temp_') && currentTicket?.id) {
        await timeEntriesService.deleteTimeEntry(id);
      }
    } catch (error) {
      console.error(`Error removing time entry ${id}:`, error);
      toast.error("Failed to remove time entry");
      
      // Add the entry back to the local state since deletion failed
      const entryToRestore = timeEntries.find(entry => entry.id === id);
      if (entryToRestore) {
        const restoredTimeEntries = [...timeEntries, entryToRestore];
        setTimeEntries(restoredTimeEntries);
      }
    }
  };

  return {
    handleAddTimeEntry,
    handleUpdateTimeEntry,
    handleRemoveTimeEntry,
  };
}

// Main hook that composes all other hooks
export default function useTicketDialogHandlers(
  activeTab: string,
  tabs: Tab[],
  tables: Record<string, Table | null>,
  widgets: Widget[],
  setWidgets: (widgets: Widget[]) => void,
  setWidgetLayouts: (layouts: Layouts) => void,
  addWidget: (type: string, ticket: Row) => void,
  workflows: { $id: string; name: string }[],
): TicketDialogState & TicketDialogHandlers {
  // Get all the state
  const state = useTicketDialogState();
  
  // Get all the handlers
  const imageHandlers = useImageHandlers(state);
  const assigneeHandlers = useAssigneeHandlers(state);
  const timeEntryHandlers = useTimeEntryHandlers(state);

  // Extract setModifiedTimeEntries for use in handleSaveTicketChanges
  const { setModifiedTimeEntries } = state;

  // Function to refresh all status-based tabs based on updated All Tickets data
  const refreshStatusTabs = async (allTicketsRows: Row[]) => {
    try {
      // First, fetch the latest tickets from Appwrite to get up-to-date data
      console.log("Fetching latest tickets from Appwrite for tab refresh");
      const latestTickets = await ticketsService.getTicketsWithRelationships();
      console.log(`Retrieved ${latestTickets.length} tickets from Appwrite`);
      
      // Convert the Appwrite tickets to table rows
      const ticketsAsRows: Row[] = latestTickets.map(ticket => convertTicketToRow(ticket));
      console.log(`Converted ${ticketsAsRows.length} tickets to table rows`);
      
      // Get a reference to the tables store
      const tablesStore = useTablesStore.getState();
      const currentTables = tablesStore.tables;
      
      // Debug: List available tabs to help find the correct ID
      console.log("Available tabs:", Object.keys(currentTables));
      
      // Find the "All Tickets" tab - try different possible IDs
      const possibleAllTicketTabIds = ["tab-all-tickets", "all-tickets", "tab1", "tab-1"];
      let allTicketsTable = null;
      let allTicketsTabId = null;
      
      // Try each possible ID
      for (const tabId of possibleAllTicketTabIds) {
        if (currentTables[tabId]) {
          allTicketsTable = currentTables[tabId];
          allTicketsTabId = tabId;
          console.log(`Found All Tickets tab with ID: ${tabId}`);
          break;
        }
      }
      
      // If still not found, look for a tab with "all" in the name
      if (!allTicketsTable) {
        for (const tabId of Object.keys(currentTables)) {
          if (tabId.toLowerCase().includes('all')) {
            allTicketsTable = currentTables[tabId];
            allTicketsTabId = tabId;
            console.log(`Found possible All Tickets tab with ID: ${tabId}`);
            break;
          }
        }
      }
      
      // If still not found, just use the first available tab
      if (!allTicketsTable && Object.keys(currentTables).length > 0) {
        const firstTabId = Object.keys(currentTables)[0];
        allTicketsTable = currentTables[firstTabId];
        allTicketsTabId = firstTabId;
        console.log(`Using first available tab as fallback: ${firstTabId}`);
      }
      
      if (!allTicketsTable) {
        console.error("Cannot refresh status tabs: All Tickets tab not found");
        console.log("Available table IDs:", Object.keys(currentTables));
        return;
      }
      
      const updatedTables = { ...currentTables };
      
      // Update the All Tickets tab with the latest data
      if (allTicketsTabId) {
        updatedTables[allTicketsTabId] = {
          ...allTicketsTable,
          rows: ticketsAsRows,
        };
      }
      
      // Loop through all tabs
      tabs.forEach((tab) => {
        // Skip the All Tickets tab
        if (tab.id === allTicketsTabId || !tab.status) return;
        
        console.log(`Refreshing tab: ${tab.id} for status "${tab.status}"`);
        
        // Get the preset table structure or use the structure from the all tickets tab
        const presetTable = PRESET_TABLES["Engineering"] || { 
          columns: allTicketsTable.columns 
        };
        
        if (!presetTable) {
          console.warn(`Cannot find preset table for tab ${tab.id}`);
          return;
        }
        
        // Filter rows for this tab based on its status
        const filteredRows = ticketsAsRows.filter(
          (row) => row.cells["col-7"] === tab.status
        );
        
        console.log(`Found ${filteredRows.length} tickets with status "${tab.status}"`);
        
        // Update this tab's table with filtered rows
        if (currentTables[tab.id]) {
          updatedTables[tab.id] = {
            ...currentTables[tab.id],
            columns: currentTables[tab.id]?.columns || [...presetTable.columns],
            rows: filteredRows,
          };
        }
      });
      
      // Update all tables at once
      tablesStore.setTables(updatedTables);
      console.log("All status tabs have been refreshed");
    } catch (error) {
      console.error("Error refreshing status tabs:", error);
    }
  };

  // Initialize the ticket dialog with a ticket's data
  const handleInitializeTicketDialog = (ticket: Row) => {
    const { 
      setCurrentTicket, 
      setCurrentTicketPreset, 
      setTicketForm, 
      setUploadedImages,
      setAssignees,
      setTimeEntries,
      setIsEditLayoutMode
    } = state;

    // Find the current tab and store its preset
    const currentTabData = tabs.find((tab) => tab.id === activeTab);

    // Set the current ticket preset for use in rendering
    // Ensure we use the exact preset name to avoid case sensitivity issues
    setCurrentTicketPreset(currentTabData?.appliedPreset);

    // Set the current ticket
    setCurrentTicket(ticket);

    // Get the status ID and customer ID, prioritizing Appwrite relationship ID fields if available
    const statusId = ticket.cells["status_id"] || ticket.cells["col-7"] || "";
    const customerId = ticket.cells["customer_id"] || ticket.cells["col-3"] || "";

    // Reset form data based on ticket
    setTicketForm({
      // Use the proper status_id and customer_id for consistency
      status: statusId,
      customerId: customerId,
      description: ticket.cells["col-4"] || "",
      billableHours: parseFloat(ticket.cells["col-9"] || "0"),
      totalHours: parseFloat(ticket.cells["col-8"] || "0"),
      
      // Store the assignee IDs properly
      assigneeIds: ticket.cells["assignee_ids"]
        ? JSON.parse(ticket.cells["assignee_ids"])
        : [],

      // Appwrite relationship fields (store the same values as above for consistency)
      status_id: statusId,
      customer_id: customerId,
      assignee_ids: ticket.cells["assignee_ids"]
        ? JSON.parse(ticket.cells["assignee_ids"])
        : [],
        
      // Initialize attachments if available
      attachments: ticket.cells["attachments"] 
        ? (Array.isArray(ticket.cells["attachments"]) 
            ? ticket.cells["attachments"] 
            : JSON.parse(ticket.cells["attachments"]))
        : [],
    });

    // Reset uploaded images
    setUploadedImages([]);

    // Check if this tab has the Engineering preset applied
    const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

    // Create appropriate storage keys based on preset and tab ID
    const engineeringLayoutKey = "engineering-layouts";
    const ticketId = ticket.cells["col-1"];
    const tabSpecificLayoutKey = `tab-${activeTab}`;

    // Get saved layouts from appropriate storage location
    const savedEngineeringState = getFromLS(engineeringLayoutKey) as {
      widgets?: Widget[];
      layouts?: Layouts;
    };
    const savedTabSpecificState = getFromLS(tabSpecificLayoutKey) as {
      widgets?: Widget[];
      layouts?: Layouts;
    };

    console.log("Loading saved widget layout state");

    // Open dialog
    state.setViewDialogOpen(true);

    // Check if this ticket has a completed status stored in its data
    let assigneeCompletedStatus = false;
    if (ticket.completed !== undefined) {
      assigneeCompletedStatus = !!ticket.completed;
    } else if (ticket.cells["col-6"] === "Completed") {
      assigneeCompletedStatus = true;
    }

    // --- Added code to populate assignees from the ticket row ---
    // Assuming assignee data is in specific columns of the ticket row
    const assigneeFromRow: Assignee = {
      id: `assignee-${ticket.id}-${ticket.cells["col-5"] || "default"}`.replace(
        /\s+/g,
        "-",
      ), // Create a unique ID
      name: ticket.cells["col-5"] || "N/A", // Assignee Name from col-5
      workDescription: ticket.cells["col-4"] || "", // Work Description from col-4
      totalHours: ticket.cells["col-7"] || "0", // Total Hours from col-7
      estTime: ticket.cells["col-8"] || "0", // Est Time from col-8
      priority: "3", // Default to medium priority
      is_done: assigneeCompletedStatus, // Set is_done status based on the ticket's status
    };

    // Set the assignees state for the dialog with only the assignee from the row
    // If col-5 doesn't exist or is empty, set an empty array
    if (assigneeFromRow.name && assigneeFromRow.name !== "N/A") {
      setAssignees([assigneeFromRow]);
    } else {
      setAssignees([]); // Clear assignees if no name is found in col-5
    }

    // Clear time entries
    setTimeEntries([]);

    // Set edit layout mode to false when initially opening a ticket
    setIsEditLayoutMode(false);

    // Check if Engineering state has saved widgets and layouts
    const hasEngineeringSavedWidgets =
      savedEngineeringState &&
      Array.isArray(savedEngineeringState.widgets) &&
      savedEngineeringState.widgets.length > 0;

    const hasEngineeringSavedLayouts =
      savedEngineeringState &&
      savedEngineeringState.layouts &&
      Object.keys(savedEngineeringState.layouts).length > 0;

    // Check if tab-specific state has saved widgets and layouts
    const hasTabSpecificSavedWidgets =
      savedTabSpecificState &&
      Array.isArray(savedTabSpecificState.widgets) &&
      savedTabSpecificState.widgets.length > 0;

    const hasTabSpecificSavedLayouts =
      savedTabSpecificState &&
      savedTabSpecificState.layouts &&
      Object.keys(savedTabSpecificState.layouts).length > 0;

    // Handle different scenarios based on preset and saved state
    if (hasEngineeringPreset) {
      // For Engineering preset tabs, use Engineering-specific layouts or create defaults
      if (hasEngineeringSavedWidgets && hasEngineeringSavedLayouts) {
        // We have saved Engineering widgets and layouts
        console.log("Restoring Engineering widget layout state");

        // First set the widgets
        setWidgets(savedEngineeringState.widgets!);

        // Immediately set the layouts to ensure they're ready when the grid renders
        setWidgetLayouts(savedEngineeringState.layouts!);
      } else {
        // No saved state, create default widgets
        console.log(
          "Creating default widgets for Engineering preset - no saved state found",
        );

        // Reset widgets and layouts
        setWidgets([]);
        setWidgetLayouts({} as Layouts);

        // Add default widgets immediately instead of using setTimeout
        // Status field
        addWidget(WIDGET_TYPES.FIELD_STATUS, ticket);

        // Customer name field
        addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME, ticket);

        // Date fields
        addWidget(WIDGET_TYPES.FIELD_DATE_CREATED, ticket);
        addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED, ticket);

        // Hours fields
        addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS, ticket);
        addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS, ticket);

        // Description field
        addWidget(WIDGET_TYPES.FIELD_DESCRIPTION, ticket);

        // Add tables as individual widgets
        addWidget(WIDGET_TYPES.FIELD_ASSIGNEE_TABLE, ticket);
        addWidget(WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE, ticket);
        addWidget(WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY, ticket);
      }
    } else {
      // For non-Engineering preset tabs, check for tab-specific layouts
      if (hasTabSpecificSavedWidgets && hasTabSpecificSavedLayouts) {
        // We have tab-specific saved widgets and layouts
        console.log("Restoring tab-specific widget layout state");

        // First set the widgets
        setWidgets(savedTabSpecificState.widgets!);

        // Immediately set the layouts to ensure they're ready when the grid renders
        setWidgetLayouts(savedTabSpecificState.layouts!);
      } else {
        // Check if there's an old-format layout saved with ticket ID
        const oldFormatKey = `tab-${activeTab}-${ticketId}`;
        const oldSavedState = getFromLS(oldFormatKey) as {
          widgets?: Widget[];
          layouts?: Layouts;
        };
        const hasOldSavedWidgets =
          oldSavedState &&
          Array.isArray(oldSavedState.widgets) &&
          oldSavedState.widgets.length > 0;
        const hasOldSavedLayouts =
          oldSavedState &&
          oldSavedState.layouts &&
          Object.keys(oldSavedState.layouts).length > 0;

        if (hasOldSavedWidgets && hasOldSavedLayouts) {
          // We found a layout in the old format, use it and save it in the new format
          console.log("Found old format layout, migrating to new format");
          setWidgets(oldSavedState.widgets!);
          setWidgetLayouts(oldSavedState.layouts!);

          // Save in new format
          const completeState: LayoutStorage = {
            widgets: oldSavedState.widgets || [],
            layouts: oldSavedState.layouts || ({} as Layouts),
          };
          saveToLS<LayoutStorage>(tabSpecificLayoutKey, completeState);
        } else {
          // No saved ticket-specific state, show empty customize layout
          console.log("No saved tab-specific layout, showing empty customize view");
          setWidgets([]);
          setWidgetLayouts({});

          // NEW: Auto-generate default widgets if none exist (for non-Engineering tabs too)
          setTimeout(() => {
            if (ticket) {
              addWidget(WIDGET_TYPES.FIELD_STATUS, ticket);
              addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME, ticket);
              addWidget(WIDGET_TYPES.FIELD_DATE_CREATED, ticket);
              addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED, ticket);
              addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS, ticket);
              addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS, ticket);
              addWidget(WIDGET_TYPES.FIELD_DESCRIPTION, ticket);
              addWidget(WIDGET_TYPES.FIELD_ASSIGNEE_TABLE, ticket);
              addWidget(WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE, ticket);
              addWidget(WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY, ticket);
            }
          }, 100);
        }
      }
    }
  };

  // Save ticket changes function
  const handleSaveTicketChanges = async () => {
    const { 
      currentTicket, 
      ticketForm, 
      timeEntries, 
      modifiedTimeEntries 
    } = state;
    
    if (!currentTicket) return false;
    
    // Get current workflow from localStorage at the start
    const currentWorkflow = localStorage.getItem("current-workflow") || "engineering";
    console.log(`Saving ticket changes for workflow: ${currentWorkflow}`);

    try {
      // Show loading toast
      toast.loading("Saving ticket changes...");

      // Get the ticketId from the current ticket
      const ticketId = currentTicket.id;
      
      // Debug logging to see what values we're working with
      console.log("Current ticket data:", {
        ticket_id: ticketId,
        current_customer_id: currentTicket.cells["customer_id"],
        current_customer_col3: currentTicket.cells["col-3"],
        form_customer_id: ticketForm.customerId,
        current_status_id: currentTicket.cells["status_id"],
        current_status_col7: currentTicket.cells["col-7"],
        form_status: ticketForm.status
      });
      
      // Create an object to store only the fields that need to be updated
      const ticketUpdates: Partial<{
        status_id: string;
        customer_id: string;
        description: string;
        billable_hours: number;
        total_hours: number;
        attachments: string[];
      }> = {};

      // Only include fields that have been modified
      if (ticketForm.description !== currentTicket.cells["col-4"]) {
        ticketUpdates.description = ticketForm.description;
      }
      
      if (ticketForm.billableHours !== parseFloat(currentTicket.cells["col-9"] || "0")) {
        ticketUpdates.billable_hours = ticketForm.billableHours || 0;
      }
      
      if (ticketForm.totalHours !== parseFloat(currentTicket.cells["col-8"] || "0")) {
        ticketUpdates.total_hours = ticketForm.totalHours || 0;
      }
      
      // Handle status_id as a relationship field
      // Check if the status has been changed from what was loaded
      const statusChanged = ticketForm.status !== currentTicket.cells["status_id"] && 
                         ticketForm.status !== currentTicket.cells["col-7"];
                         
      console.log("Status comparison:", {
        statusChanged,
        condition1: ticketForm.status !== currentTicket.cells["status_id"],
        condition2: ticketForm.status !== currentTicket.cells["col-7"]
      });
      
      if (statusChanged) {
        try {
          // Get all statuses first
          const allStatuses = await statusesService.getAllStatuses();
          console.log("All available statuses:", allStatuses);
          
          // Try to find the status by exact label match
          let statusDocument = allStatuses.find((status: { label: string }) => 
            status.label === ticketForm.status
          );
          
          if (!statusDocument) {
            console.error("Cannot find status with exact label:", ticketForm.status);
            
            // Fallback: try case-insensitive match
            statusDocument = allStatuses.find((status: { label: string }) => 
              status.label.toLowerCase() === ticketForm.status.toLowerCase()
            );
            
            if (!statusDocument) {
              console.error("Cannot find status with case-insensitive label match either");
              toast.error(`Status "${ticketForm.status}" not found. Using default status.`);
              
              // Fallback to the first available status if no match is found
              if (allStatuses.length > 0) {
                statusDocument = allStatuses[0];
                console.log("Using first available status as fallback:", statusDocument);
              } else {
                throw new Error("No statuses available in the system");
              }
            }
          }
          
          // Get the proper Appwrite document ID (prefer $id which is the standard Appwrite format)
          const statusId = statusDocument.$id || statusDocument.id;
          console.log("Using status ID for update:", statusId);
          
          // Set the status_id field with the document ID (not the label)
          ticketUpdates.status_id = statusId;
          
          // Also update the status column in the currentTicket for immediate UI feedback
          if (currentTicket) {
            // Update the display column with the label
            currentTicket.cells["col-7"] = statusDocument.label;
            // If there's a status_id column, update it with the ID
            if ("status_id" in currentTicket.cells) {
              currentTicket.cells["status_id"] = statusId;
            }
          }
        } catch (error) {
          console.error("Error processing status update:", error);
          toast.error("Failed to update status. Using previous value.");
          // Don't proceed with the status update
        }
      } else {
        console.log("Not updating status_id as it hasn't changed");
      }
      
      // Only update customer_id if it's actually been changed from what was loaded
      // Check against both the relationship ID and the display column
      const customerChanged = ticketForm.customerId !== currentTicket.cells["customer_id"] && 
                           ticketForm.customerId !== currentTicket.cells["col-3"];
                           
      console.log("Customer comparison:", {
        customerChanged,
        condition1: ticketForm.customerId !== currentTicket.cells["customer_id"],
        condition2: ticketForm.customerId !== currentTicket.cells["col-3"]
      });
      
      if (customerChanged) {
        ticketUpdates.customer_id = ticketForm.customerId;
        console.log("Including customer_id in update:", ticketForm.customerId);
        
        // Also update the customer column in the currentTicket for immediate UI feedback
        if (currentTicket) {
          currentTicket.cells["col-3"] = ticketForm.customerId;
          // If there's a customer_id column, also update it
          if ("customer_id" in currentTicket.cells) {
            currentTicket.cells["customer_id"] = ticketForm.customerId;
          }
        }
      } else {
        console.log("Not updating customer_id as it hasn't changed");
      }
      
      // Always include attachments since they could have been modified
      ticketUpdates.attachments = ticketForm.attachments || [];
      
      // Only update the ticket if there are actually changes to make
      if (Object.keys(ticketUpdates).length > 0) {
        console.log("Updating ticket with changes:", ticketUpdates);
        await ticketsService.updateTicket(ticketId, ticketUpdates);
        console.log("Ticket updated successfully:", ticketId);
      } else {
        console.log("No ticket fields were changed, skipping ticket update");
      }

      // Save time entries to Appwrite
      if (timeEntries && timeEntries.length > 0) {
        console.log(`Processing ${timeEntries.length} time entries`);
        
        // Create new time entries
        const newTimeEntries = timeEntries.filter(entry => entry.id.startsWith('temp_'));
        console.log(`Found ${newTimeEntries.length} new time entries to create`);
        
        // Log the modifiedTimeEntries for debugging
        console.log("Modified time entries set:", [...modifiedTimeEntries]);
        
        // Create promises for new time entries
        const createPromises = newTimeEntries.map(async (entry) => {
          try {
            // Prepare entry for saving to database
            const newEntry = {
              ...entry,
              ticket_id: ticketId,
            };
            // Save the new time entry
            return await timeEntriesService.createTimeEntry(newEntry);
          } catch (error) {
            console.error("Error saving new time entry:", error);
            return null;
          }
        });
        
        // Update modified time entries
        const modifiedEntries = timeEntries.filter(entry => 
          !entry.id.startsWith('temp_') && modifiedTimeEntries.has(entry.id)
        );
        console.log(`Found ${modifiedEntries.length} modified time entries to update`);
        
        // Create promises for modified time entries
        const updatePromises = modifiedEntries.map(async (entry) => {
          try {
            // Ensure any relationship fields are correctly formatted
            let userIdToSave = entry.user_id;
            if (typeof userIdToSave === 'object') {
              userIdToSave = (userIdToSave as any).$id || (userIdToSave as any).id || "";
            }
            
            let ticketIdToSave = entry.ticket_id;
            if (typeof ticketIdToSave === 'object') {
              ticketIdToSave = (ticketIdToSave as any).$id || (ticketIdToSave as any).id || "";
            }
            
            // Prepare data for update
            const dataToUpdate = {
              start_time: entry.startTime,
              stop_time: entry.stopTime,
              total_duration: entry.duration,
              remarks: entry.remarks,
              files: entry.files,
              ticket_id: ticketIdToSave,
              user_id: userIdToSave
            };
            
            console.log(`Updating time entry ${entry.id} with data:`, dataToUpdate);
            
            // Update the time entry
            return await timeEntriesService.updateTimeEntry(entry.id, dataToUpdate);
          } catch (error) {
            console.error(`Error updating time entry ${entry.id}:`, error);
            return null;
          }
        });
        
        // Wait for all time entry operations to complete
        const results = await Promise.all([...createPromises, ...updatePromises]);
        console.log(`Time entries saved successfully: ${results.filter(Boolean).length} operations completed`);
        
        // Reset the modified time entries set - using the extracted setter function
        setModifiedTimeEntries(new Set());
      }

      // Update the table display
      const tablesStore = useTablesStore.getState();
      const currentTables = tablesStore.tables;

      // Look for the All Tickets tab
      const allTicketsTabId = tabs.find((tab) => tab.title === "All Tickets")?.id;
      const allTicketsTable = allTicketsTabId ? currentTables[allTicketsTabId] : null;

      if (allTicketsTable) {
        // Get all tickets from database again to refresh the view
        const allTickets = await ticketsService.getAllTickets();
        
        // Get current workflow from localStorage to filter tickets
        const currentWorkflow = localStorage.getItem("current-workflow") || "engineering";
        console.log(`Filtering tickets for current workflow: ${currentWorkflow}`);
        
        // Get the workflow name from the workflows list
        const currentWorkflowName = workflows.find(w => w.$id === currentWorkflow)?.name || "Engineering";
        
        // Filter tickets by the current workflow before converting to rows
        const workflowFilteredTickets = allTickets.filter(ticket => 
          // If ticket has no workflow, treat it as "Engineering" for backward compatibility
          (ticket.workflow || "Engineering").toLowerCase() === currentWorkflowName.toLowerCase()
        );
        
        console.log(`Filtered ${allTickets.length} tickets to ${workflowFilteredTickets.length} for workflow: ${currentWorkflowName}`);
        
        // Convert tickets to rows
        const ticketsAsRows = await Promise.all(
          workflowFilteredTickets.map(async (ticket) => {
            return await convertTicketToRow(ticket);
          })
        );
        
        // Refresh all tabs with the latest data
        await refreshStatusTabs(ticketsAsRows);
      }

      // Clear loading toast and show success message
      toast.dismiss();
      toast.success("Ticket updated successfully!");
      
      return true;
    } catch (error) {
      console.error("Error saving ticket changes:", error);
      toast.dismiss();
      toast.error("Failed to save ticket changes.");
      return false;
    }
  };

  // View ticket function
  const viewTicket = async (ticket: Row, tabId: string) => {
    const { 
      setCurrentTicket, 
      setViewDialogOpen, 
      setCurrentTicketPreset,
      setTicketForm,
      setUploadedImages,
      setAssignees,
      setTimeEntries 
    } = state;
    
    setCurrentTicket(ticket);
    setViewDialogOpen(true);

    // Check if this tab has a preset
    const currentTabData = tabs.find((tab) => tab.id === tabId);
    const hasEngineeringPreset = currentTabData && (currentTabData.isEngineeringPreset || currentTabData.appliedPreset === "Engineering");
    setCurrentTicketPreset(hasEngineeringPreset ? "Engineering" : undefined);

    // Get data from ticket
    const status = ticket.cells["status_id"] || ticket.cells["col-7"] || "";
    // Get customer ID from the relationship ID field first, then fallback to the display name column
    const customerId = ticket.cells["customer_id"] || ticket.cells["col-3"] || "";
    console.log("Setting customer from:", {
      raw_customer_id: ticket.cells["customer_id"],
      raw_col3: ticket.cells["col-3"],
      final_customer_id: customerId
    });
    
    const ticketId = ticket.id;
    const description = ticket.cells["col-4"] || "";
    const billableHoursStr = ticket.cells["col-9"] || "0";
    const totalHoursStr = ticket.cells["col-8"] || "0";
    const billableHours = parseFloat(billableHoursStr);
    const totalHours = parseFloat(totalHoursStr);
    
    // Get attachments from the dedicated attachments field
    const attachments = ticket.cells["attachments"] || [];

    // Convert string attachments to array if necessary
    let attachmentsArray: string[] = [];
    if (typeof attachments === 'string') {
      // Split by comma and trim each ID
      attachmentsArray = attachments.split(',').map(id => id.trim()).filter(id => id);
    } else if (Array.isArray(attachments)) {
      attachmentsArray = attachments;
    } else {
      // If it's an object, try to convert it to an array
      if (typeof attachments === 'object' && attachments !== null) {
        attachmentsArray = Object.values(attachments).map(String);
      }
    }

    // Set ticket form data
    setTicketForm({
      status,
      customerId,
      description,
      billableHours: isNaN(billableHours) ? 0 : billableHours,
      totalHours: isNaN(totalHours) ? 0 : totalHours,
      assigneeIds: [],
      attachments: attachmentsArray,
      
      // Appwrite relationship fields (store the same values for consistency)
      status_id: status,
      customer_id: customerId,
      assignee_ids: [],
    });

    // Set uploaded images
    setUploadedImages(attachmentsArray);

    // Fetch ticket assignments for this ticket and convert them to assignees
    try {
      if (ticketId) {
        console.log(`Fetching assignments for ticket ID: ${ticketId}`);
        const assigneeData = await ticketAssignmentsService.getAssigneesForTicket(ticketId);
        console.log(`Retrieved ${assigneeData.length} assignees from ticket_assignments collection`);
        console.log("Raw assignee data:", JSON.stringify(assigneeData, null, 2));
        
        if (assigneeData.length > 0) {
          setAssignees(assigneeData);
        } else {
          // Reset assignees if none found
          setAssignees([]);
        }
      }
    } catch (error) {
      console.error("Error fetching ticket assignments:", error);
      toast.error("Failed to load team members for this ticket");
      setAssignees([]);
    }

    // Fetch time entries for this ticket
    try {
      if (ticketId) {
        console.log(`Fetching time entries for ticket ID: ${ticketId}`);
        const timeEntryData = await timeEntriesService.getTimeEntriesForTicket(ticketId);
        console.log(`Retrieved ${timeEntryData.length} time entries from time_entries collection`);
        
        if (timeEntryData.length > 0) {
          setTimeEntries(timeEntryData);
        } else {
          // Reset time entries if none found
          setTimeEntries([]);
        }
      }
    } catch (error) {
      console.error("Error fetching time entries:", error);
      toast.error("Failed to load time entries for this ticket");
      setTimeEntries([]);
    }
  };

  return {
    ...state,
    ...imageHandlers,
    ...assigneeHandlers,
    ...timeEntryHandlers,
    handleInitializeTicketDialog,
    handleSaveTicketChanges,
    viewTicket
  };
}