import { Layouts } from "react-grid-layout";
import { useState } from "react";
import { toast } from "sonner";

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
import { timeEntriesService } from "../../../services/timeEntriesService";
import { customersService, ticketAssignmentsService } from "../../../services";

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
  const handleAddTimeEntry = (assigneeId: string) => {
    const assignee = assignees.find((a) => a.id === assigneeId);
    if (!assignee) return;

    const now = new Date();
    // Format time as HH:MM:SS for consistency with database
    const formattedTime = now.toTimeString().split(' ')[0];
    const formattedDate = now.toLocaleDateString();

    const newTimeEntry: TimeEntry = {
      id: `t${Date.now()}`,
      assigneeId,
      assigneeName: assignee.name,
      startTime: formattedTime,
      stopTime: "",
      duration: "0",
      dateCreated: formattedDate,
      remarks: "",
    };

    setTimeEntries((prev) => [...prev, newTimeEntry]);
  };

  const handleUpdateTimeEntry = (id: string, field: string, value: string) => {
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
      }),
    );
  };

  const handleRemoveTimeEntry = (id: string) => {
    setTimeEntries(timeEntries.filter((entry) => entry.id !== id));
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

    // Reset form data based on ticket
    setTicketForm({
      status: ticket.cells["col-7"] || "New",
      customerId: ticket.cells["customer_id"] || "",
      description: ticket.cells["col-4"] || "",
      billableHours: parseFloat(ticket.cells["col-9"] || "0"),
      totalHours: parseFloat(ticket.cells["col-8"] || "0"),
      assigneeIds: ticket.cells["assignee_ids"]
        ? JSON.parse(ticket.cells["assignee_ids"])
        : [],

      // Appwrite relationship fields
      status_id: ticket.cells["status_id"] || ticket.cells["col-7"] || "New",
      customer_id: ticket.cells["customer_id"] || "",
      assignee_ids: ticket.cells["assignee_ids"]
        ? JSON.parse(ticket.cells["assignee_ids"])
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

  // Handle saving ticket changes
  const handleSaveTicketChanges = async () => {
    if (!currentTicket) return;

    try {
      // Get the ticketId from the current ticket
      const ticketId = currentTicket.id;
      
      // Show loading toast
      toast.loading("Saving ticket changes...");

      // Save ticket update to Appwrite
      await ticketsService.updateTicket(ticketId, {
        status_id: ticketForm.status,
        customer_id: ticketForm.customerId,
        description: ticketForm.description,
        billable_hours: ticketForm.billableHours || 0,
        total_hours: ticketForm.totalHours || 0,
        attachments: ticketForm.attachments || [],
      });

      console.log("Ticket updated successfully:", ticketId);

      // Save time entries to Appwrite
      if (timeEntries && timeEntries.length > 0) {
        // Update existing time entries and create new ones
        const saveTimeEntriesPromises = timeEntries.map(async (entry) => {
          try {
            // If the entry has an ID that starts with 't', it's a new entry that hasn't been saved to the database
            if (entry.id.startsWith('t')) {
              // Prepare entry for saving to database
              const newEntry = {
                ...entry,
                ticket_id: ticketId,
              };
              // Save the new time entry
              return await timeEntriesService.createTimeEntry(newEntry);
            } else {
              // Update existing time entry
              return await timeEntriesService.updateTimeEntry(entry.id, entry);
            }
          } catch (error) {
            console.error("Error saving time entry:", error);
            return null;
          }
        });

        await Promise.all(saveTimeEntriesPromises);
        console.log("Time entries saved successfully");
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
    } catch (error) {
      console.error("Error saving ticket changes:", error);
      toast.dismiss();
      toast.error("Failed to save ticket changes.");
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

  const viewTicket = async (ticket: Row, tabId: string) => {
    setCurrentTicket(ticket);
    setViewDialogOpen(true);

    // Check if this tab has a preset
    const currentTabData = tabs.find((tab) => tab.id === tabId);
    const hasEngineeringPreset = currentTabData && (currentTabData.isEngineeringPreset || currentTabData.appliedPreset === "Engineering");
    setCurrentTicketPreset(hasEngineeringPreset ? "Engineering" : undefined);

    // Get data from ticket
    const status = ticket.cells["col-7"] || "";
    const customerId = ticket.cells["col-3"] || "";
    const ticketId = ticket.id;
    const description = ticket.cells["col-4"] || "";
    const createdAt = ticket.cells["col-2"] || "";
    const lastModified = ticket.cells["col-10"] || "";
    const billableHoursStr = ticket.cells["col-9"] || "0";
    const totalHoursStr = ticket.cells["col-8"] || "0";
    const billableHours = parseFloat(billableHoursStr);
    const totalHours = parseFloat(totalHoursStr);
    const attachments = ticket.cells["col-6"] || [];

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
    });

    // Set uploaded images
    setUploadedImages(attachmentsArray);

    // Fetch time entries for this ticket
    const fetchTimeEntries = async () => {
      try {
        console.log(`Fetching time entries for ticket: ${ticketId}`);
        const entries = await timeEntriesService.getTimeEntriesForTicket(ticketId);
        console.log(`Fetched ${entries.length} time entries for ticket: ${ticketId}`);
        setTimeEntries(entries);
      } catch (error) {
        console.error(`Error fetching time entries for ticket ${ticketId}:`, error);
        setTimeEntries([]);
      }
    };

    // Fetch team members (assignees) for this ticket
    const fetchTeamMembers = async () => {
      try {
        console.log(`Fetching team members for ticket: ${ticketId}`);
        const teamMembers = await ticketAssignmentsService.getAssigneesForTicket(ticketId);
        console.log(`Fetched ${teamMembers.length} team members for ticket: ${ticketId}`);
        
        if (teamMembers.length > 0) {
          setAssignees(teamMembers);
          
          // Extract and set assignee IDs for the form
          const assigneeIds = teamMembers
            .filter(member => member.user_id)
            .map(member => member.user_id as string);
          
          setTicketForm(prev => ({
            ...prev,
            assigneeIds
          }));
        } else {
          setAssignees([]);
        }
      } catch (error) {
        console.error(`Error fetching team members for ticket ${ticketId}:`, error);
        setAssignees([]);
      }
    };

    // Call fetch functions in parallel
    await Promise.all([fetchTimeEntries(), fetchTeamMembers()]);

    // Check if we have a raw appwrite data in the ticket
    if (ticket.rawData) {
      console.log("Using raw Appwrite data to populate ticket fields:", ticket.rawData);
      
      // Extract assignee_ids from raw data if available
      const assigneeIds: string[] = [];
      if (ticket.rawData.assignee_ids && Array.isArray(ticket.rawData.assignee_ids)) {
        ticket.rawData.assignee_ids.forEach((assignee: any) => {
          if (typeof assignee === 'string') {
            assigneeIds.push(assignee);
          } else if (assignee && typeof assignee === 'object' && assignee.$id) {
            assigneeIds.push(assignee.$id);
          }
        });
      }

      // Update ticket form with assignee IDs if found
      setTicketForm((prev) => ({
        ...prev,
        assigneeIds,
      }));
      
      // Note: We prefer the data from ticketAssignmentsService, so we only use this as fallback
      // if fetchTeamMembers() didn't return any results
      if (assignees.length === 0) {
        // Process assignments from assignment_id if available
        let newAssignees: Assignee[] = [];
        
        if (ticket.rawData.assignment_id && Array.isArray(ticket.rawData.assignment_id)) {
          newAssignees = ticket.rawData.assignment_id.map((assignment: any) => {
            // Get user information
            const userId = assignment.user_id?.$id || assignment.user_id || '';
            const firstName = assignment.user_id?.first_name || '';
            const lastName = assignment.user_id?.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            return {
              id: assignment.$id || `a-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: fullName,
              workDescription: assignment.work_description || '',
              totalHours: assignment.actual_time || '0',
              estTime: assignment.estimated_time || '0',
              priority: '1',
              user_id: userId,
              completed: false
            };
          });
        }

        // Set assignees if we have any from assignment_id
        if (newAssignees.length > 0) {
          setAssignees(newAssignees);
        }
      }
    }

    // Get the saved layout state for this preset/tab
    // ... existing code ...
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
  };
}
