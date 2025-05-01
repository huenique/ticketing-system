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

export default function useTicketDialogHandlers(
  activeTab: string,
  tabs: Tab[],
  tables: Record<string, Table | null>,
  widgets: Widget[],
  setWidgets: (widgets: Widget[]) => void,
  setWidgetLayouts: (layouts: Layouts) => void,
  addWidget: (type: string, ticket: Row) => void,
) {
  // Ticket Dialog State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Row | null>(null);
  const [currentTicketPreset, setCurrentTicketPreset] = useState<string | undefined>(
    undefined,
  );
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

  // Add a state to track modified time entries (near the other state declarations)
  const [modifiedTimeEntries, setModifiedTimeEntries] = useState<Set<string>>(new Set());

  // Get current user
  const { currentUser } = useUserStore();

  // Image Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Set uploading state if needed
    setUploadedImages((prevImages) => [...prevImages, "uploading..."]);

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
      
      // Update state with the successful uploads
      setUploadedImages((prevImages) => {
        // Remove the "uploading..." placeholder
        const filteredPrevImages = prevImages.filter(img => img !== "uploading...");
        return [...filteredPrevImages, ...successfulFileIds];
      });
      
      // If we have a current ticket, update the attachments in the form
      if (currentTicket && successfulFileIds.length > 0) {
        setTicketForm(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...successfulFileIds]
        }));
      }
    });
  };

  // Assignee Handlers
  const handleAddAssignee = async () => {
    if (newAssignee.name.trim() === "") return;

    // Generate a temporary ID for UI purposes
    const assigneeId = `a${Date.now()}`;
    const assigneeToAdd: Assignee = {
      ...newAssignee,
      id: assigneeId,
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
      
      // Add to local state
      setAssignees((prev) => [...prev, assigneeToAdd]);
      
      // Reset the form
      setNewAssignee({
        id: "",
        name: "",
        workDescription: "",
        totalHours: "0",
        estTime: "0",
        priority: "3",
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
        await ticketAssignmentsService.deleteTicketAssignment(id);
        toast.success("Team member removed successfully");
      }
      
      // Remove from local state
      setAssignees((prev) => prev.filter((a) => a.id !== id));
      // Also remove related time entries
      setTimeEntries((prev) => prev.filter((t) => t.assigneeId !== id));
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
      estTime: "estimated_time"
    };
    
    try {
      // Update in the local state first for immediate UI feedback
      setAssignees((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
      );
      
      // If we're in edit mode and have a current ticket, update in Appwrite
      if (currentTicket && currentTicket.id) {
        // Only send the update if the field has a mapping (is stored in the database)
        if (fieldMappings[field]) {
          const updates: Partial<Record<string, string>> = {
            [fieldMappings[field]]: value
          };
          
          await ticketAssignmentsService.updateTicketAssignment(id, updates);
        }
      }
    } catch (error) {
      console.error(`Error updating team member field '${field}':`, error);
      // We don't show an error toast here to avoid disrupting the user experience
      // during typing, but we log the error
    }
  };

  // Time Entry Handlers
  const handleAddTimeEntry = async (assigneeId: string) => {
    try {
      console.log("Adding new time entry for assignee:", assigneeId);
      const assignee = assignees.find((a) => a.id === assigneeId);
      if (!assignee && assigneeId !== "") return;

      const now = new Date();
      // Format time as HH:MM:SS for consistency with database
      const formattedTime = now.toTimeString().split(' ')[0];
      const formattedDate = now.toLocaleDateString();
      console.log("Current time for new entry:", formattedTime);

      // If assigneeId is empty, create a standalone time entry
      const assigneeName = assignee ? assignee.name : "";
      
      // Ensure we extract just the user ID if it's an object
      let userId = assignee ? assignee.user_id : "";
      if (userId && typeof userId === 'object') {
        userId = (userId as any).$id || (userId as any).id || "";
      }

      // Prepare the time entry data
      const newTimeEntryData: Omit<TimeEntry, "id"> = {
        assigneeId: assigneeId || "",
        assigneeName: assigneeName,
        startTime: formattedTime,
        stopTime: "", // Leave stop time empty as requested
        duration: "0", // Initially set to 0, will be calculated when stop time is added
        dateCreated: formattedDate,
        remarks: "",
        files: [],
        ticket_id: currentTicket?.id || "",
        user_id: userId || ""
      };

      console.log("Time entry data being sent to Appwrite:", newTimeEntryData);

      // If we're in edit mode, save to Appwrite
      if (currentTicket && currentTicket.id) {
        // Save to Appwrite
        const savedTimeEntry = await timeEntriesService.createTimeEntry(newTimeEntryData);
        console.log("Successfully created time entry in Appwrite:", savedTimeEntry);
        
        // Update the UI with the saved entry
        setTimeEntries(prev => [...prev, savedTimeEntry]);
        
        toast.success("Time entry added successfully");
      } else {
        // If we're in create mode, just update the local state
        console.log("Adding time entry to local state only (no Appwrite save)");
        setTimeEntries(prev => [
          ...prev, 
          { 
            ...newTimeEntryData, 
            id: `temp_${Date.now()}` 
          }
        ]);
      }
    } catch (error) {
      console.error("Error adding time entry:", error);
      toast.error("Failed to add time entry");
    }
  };

  // Update the handleUpdateTimeEntry function to only save locally
  const handleUpdateTimeEntry = async (id: string, field: string, value: string) => {
    try {
      // Don't allow direct editing of duration field
      if (field === "duration") return;
      
      // Update the time entry in the local state first
      setTimeEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === id) {
            const updatedEntry = { ...entry, [field]: value };

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
        })
      );

      // Mark this time entry as modified (if it's a real entry, not a temp one)
      if (!id.startsWith('temp_')) {
        setModifiedTimeEntries(prev => {
          const newSet = new Set(prev);
          newSet.add(id);
          return newSet;
        });
        console.log(`Marked time entry ${id} as modified for field ${field}`);
      }
    } catch (error) {
      console.error(`Error updating time entry field '${field}':`, error);
      toast.error("Failed to update time entry");
    }
  };

  const handleRemoveTimeEntry = async (id: string) => {
    try {
      // Remove from local state first for immediate UI feedback
      setTimeEntries(timeEntries.filter((entry) => entry.id !== id));
      
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
        setTimeEntries(prev => [...prev, entryToRestore]);
      }
    }
  };

  // Handle task/assignee completion status
  const markAssigneeCompleted = async (assigneeId: string, completed: boolean | string) => {
    // Convert to boolean regardless of input type
    const isCompleted = completed === true || completed === "true";

    // Update the assignees state
    setAssignees((prev) =>
      prev.map((assignee) =>
        assignee.id === assigneeId ? { ...assignee, completed: isCompleted } : assignee,
      ),
    );

    try {
      // If we're in edit mode and have a current ticket, update in Appwrite
      if (currentTicket && currentTicket.id && assigneeId) {
        // We don't have a completed field in our database schema, so we'll update
        // the work_description to include a [COMPLETED] prefix if completed
        const assignee = assignees.find(a => a.id === assigneeId);
        
        if (assignee) {
          let workDescription = assignee.workDescription;
          
          // If completed, add a [COMPLETED] prefix if not already there
          if (isCompleted && !workDescription.includes("[COMPLETED]")) {
            workDescription = `[COMPLETED] ${workDescription}`;
          } 
          // If not completed, remove the [COMPLETED] prefix if it exists
          else if (!isCompleted && workDescription.includes("[COMPLETED]")) {
            workDescription = workDescription.replace("[COMPLETED]", "").trim();
          }
          
          // Only update if the work description changed
          if (workDescription !== assignee.workDescription) {
            await ticketAssignmentsService.updateTicketAssignment(assigneeId, {
              work_description: workDescription
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating assignee completion status:", error);
      // We don't show an error toast here to avoid disrupting the UX
    }

    // Find the assignee that was updated
    const updatedAssignee = assignees.find((assignee) => assignee.id === assigneeId);

    // If we're working with a current ticket, update its status in the All Tickets tab
    if (updatedAssignee && currentTicket) {
      const ticketId = currentTicket.cells["col-1"];

      // Update the ticket in the current tab
      const updatedTables = { ...tables };
      if (updatedTables[activeTab]) {
        // Find the row that matches this ticket
        const updatedRows = updatedTables[activeTab].rows.map((row: Row) => {
          if (row.cells["col-1"] === ticketId) {
            return {
              ...row,
              completed: isCompleted,
              cells: {
                ...row.cells,
                "col-6": isCompleted ? "Completed" : "In Progress", // Update Status column if it exists
              },
            };
          }
          return row;
        });

        updatedTables[activeTab] = {
          ...updatedTables[activeTab],
          rows: updatedRows,
        };

        // Update the global tables state
        useTablesStore.getState().setTables(updatedTables);

        // Save to localStorage
        localStorage.setItem("ticket-tables", JSON.stringify(updatedTables));
      }
    }
  };

  // Initialize the ticket dialog
  const handleInitializeTicketDialog = (ticket: Row) => {
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
    setViewDialogOpen(true);

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
      completed: assigneeCompletedStatus, // Set completed status based on the ticket's status
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

  // Modify the handleSaveTicketChanges function to save modified time entries
  const handleSaveTicketChanges = async () => {
    if (!currentTicket) return;

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
        
        // Reset the modified time entries set
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
        
        // Convert tickets to rows
        const ticketsAsRows = await Promise.all(
          allTickets.map(async (ticket) => {
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

  const viewTicket = async (ticket: Row, tabId: string) => {
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
    const createdAt = ticket.cells["col-2"] || "";
    const lastModified = ticket.cells["col-10"] || "";
    const billableHoursStr = ticket.cells["col-9"] || "0";
    const totalHoursStr = ticket.cells["col-8"] || "0";
    const billableHours = parseFloat(billableHoursStr);
    const totalHours = parseFloat(totalHoursStr);
    const attachments = ticket.cells["attachments"] || ticket.cells["col-6"] || [];

    // Convert string attachments to array if necessary
    let attachmentsArray: string[] = [];
    if (typeof attachments === "string") {
      attachmentsArray = attachments
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a);
    } else if (Array.isArray(attachments)) {
      attachmentsArray = attachments;
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
    handleAddAssignee,
    handleRemoveAssignee,
    handleUpdateAssignee,
    handleAddTimeEntry,
    handleRemoveTimeEntry,
    handleUpdateTimeEntry,
    handleImageUpload,
    markAssigneeCompleted,
    handleInitializeTicketDialog,
    handleSaveTicketChanges,
    viewTicket,
    modifiedTimeEntries,
  };
}