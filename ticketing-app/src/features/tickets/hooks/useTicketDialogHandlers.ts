import { useState, useEffect } from "react";
import { Layouts } from "react-grid-layout";
import { toast } from "sonner";

import { PRESET_TABLES, WIDGET_TYPES } from "../../../constants/tickets";
import useTablesStore from "../../../stores/tablesStore";
import {
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
import { ticketsService, statusesService, customersService } from "../../../services/ticketsService";
import { uploadFile } from "../../../services/storageService";

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
  const [assigneeTableTitle, setAssigneeTableTitle] = useState("Assigned Team Members");
  const [newAssignee, setNewAssignee] = useState<Assignee>({
    id: "",
    name: "",
    workDescription: "",
    totalHours: "0",
    estTime: "0",
    priority: "3",
  });
  const [showAssigneeForm, setShowAssigneeForm] = useState(false);

  // Time Entries State
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

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
      const successfulFileIds = fileIds.filter(id => id !== null) as string[];
      
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
  const handleAddAssignee = () => {
    if (newAssignee.name.trim() === "") return;

    const assigneeId = `a${Date.now()}`;
    const assigneeToAdd: Assignee = {
      ...newAssignee,
      id: assigneeId,
    };

    setAssignees((prev) => [...prev, assigneeToAdd]);
    setNewAssignee({
      id: "",
      name: "",
      workDescription: "",
      totalHours: "0",
      estTime: "0",
      priority: "3",
    });
    setShowAssigneeForm(false);
  };

  const handleRemoveAssignee = (id: string) => {
    setAssignees((prev) => prev.filter((a) => a.id !== id));
    // Also remove related time entries
    setTimeEntries((prev) => prev.filter((t) => t.assigneeId !== id));
  };

  const handleUpdateAssignee = (id: string, field: string, value: string) => {
    setAssignees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  };

  // Time Entry Handlers
  const handleAddTimeEntry = (assigneeId: string) => {
    const assignee = assignees.find((a) => a.id === assigneeId);
    if (!assignee) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
              // Parse times (assuming format is HH:MM)
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
  const markAssigneeCompleted = (assigneeId: string, completed: boolean | string) => {
    // Convert to boolean regardless of input type
    const isCompleted = completed === true || completed === "true";

    // Update the assignees state
    setAssignees((prev) =>
      prev.map((assignee) =>
        assignee.id === assigneeId ? { ...assignee, completed: isCompleted } : assignee,
      ),
    );

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

    // Reset assignee table title
    setAssigneeTableTitle("Assigned Team Members");

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

        // Add default widgets after a short delay
        setTimeout(() => {
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
        }, 100);
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
      // Validate required fields
      if (ticketForm.billableHours === null || ticketForm.billableHours === undefined) {
        toast.error("Validation Error", {
          description: "Billable Hours cannot be empty"
        });
        return;
      }

      if (ticketForm.totalHours === null || ticketForm.totalHours === undefined) {
        toast.error("Validation Error", {
          description: "Total Hours cannot be empty"
        });
        return;
      }

      // Find the corresponding tab
      const currentTabData = tabs.find((tab) => tab.id === activeTab);
      if (!currentTabData) return;

      // Get the current status of the assignees
      const hasCompletedAssignees = assignees.some((assignee) => assignee.completed);

      // Get the ticket ID from the currentTicket
      const ticketDisplayId = currentTicket.cells["col-1"];
      
      // Extract the actual Appwrite document ID by removing the "TK-" prefix
      // The Appwrite document ID is the actual ID without the "TK-" prefix
      const ticketId = currentTicket.id;
      
      console.log(`Updating ticket with ID: ${ticketId} (display ID: ${ticketDisplayId})`);
      
      // Lookup the actual status_id from the status label
      let statusId = "";
      try {
        // First get all statuses from Appwrite
        const statuses = await statusesService.getAllStatuses();
        // Find the status object that matches the label in ticketForm.status
        const statusObj = statuses.find(status => status.label === ticketForm.status);
        // Get the Appwrite document ID of that status
        statusId = statusObj ? (statusObj.$id || statusObj.id) : "";
        
        console.log(`Found status ID ${statusId} for label "${ticketForm.status}"`);
      } catch (error) {
        console.error("Error looking up status ID:", error);
      }
      
      // Lookup the customer_id if one is specified
      let customerId = ticketForm.customerId || "";
      if (customerId) {
        try {
          const customers = await customersService.getAllCustomers();
          const customerObj = customers.find(customer => customer.name === customerId);
          if (customerObj) {
            customerId = customerObj.$id || customerObj.id || "";
            console.log(`Found customer ID ${customerId} for name "${ticketForm.customerId}"`);
          }
        } catch (error) {
          console.error("Error looking up customer ID:", error);
        }
      }
      
      // Get assignee IDs - ensure we're saving actual user document IDs
      // This assumes assignees contains the correct Appwrite document IDs
      // If you're storing user IDs instead of names in assigneeIds, use this directly
      const assigneeIds = ticketForm.assigneeIds || [];
      
      console.log("Using assignee IDs:", assigneeIds);
      
      // If attachments were uploaded, include them in the ticket update
      // Filter out any 'uploading...' placeholders and ensure all attachment IDs are valid
      const attachmentsToSave = uploadedImages
        .filter(img => img !== "uploading...")
        .filter(img => typeof img === 'string' && img.trim() !== '');
      
      console.log("Saving attachments:", attachmentsToSave);

      // Prepare Appwrite relationship fields
      // Map the form data to the correct Appwrite field names
      const appwriteTicketData = {
        // Data to save to Appwrite
        status_id: statusId || undefined, // Use the looked up status ID
        customer_id: customerId || undefined, // Use the looked up customer ID
        description: ticketForm.description,
        billable_hours: ticketForm.billableHours, // Now guaranteed to be non-null by validation
        total_hours: ticketForm.totalHours, // Now guaranteed to be non-null by validation
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined, // Only include if we have assignees
        attachments: attachmentsToSave.length > 0 ? attachmentsToSave : undefined, // Only include if we have attachments
      };

      // Log the data being saved for debugging
      console.log(
        "Saving ticket with Appwrite relationship fields:",
        JSON.stringify(appwriteTicketData, null, 2),
      );

      // First, update the UI tables
      useTablesStore.getState().saveTicketChanges(
        currentTicket,
        {
          ...ticketForm,
          status: ticketForm.status,
          customerId: ticketForm.customerId,
          assigneeIds: assigneeIds,
        },
        setViewDialogOpen,
        activeTab,
        hasCompletedAssignees, // Pass the completion status to be saved
      );

      // Then, update the actual data in Appwrite
      const updatedTicket = await ticketsService.updateTicket(ticketId, appwriteTicketData);
      console.log(`Ticket ${ticketId} updated successfully in Appwrite:`, updatedTicket);

      // If the ticket's status was changed, refresh all status-based tabs
      const allTicketsTab = "tab-all-tickets";
      const tablesStore = useTablesStore.getState();
      const allTicketsRows = tablesStore.tables[allTicketsTab]?.rows || [];

      // Refresh all status tabs to maintain consistency
      await refreshStatusTabs(allTicketsRows);

      // Save widget layouts to localStorage
      if (currentTicket && widgets.length > 0) {
        // Create a complete widget state object that includes both widget data and layout
        const completeState = {
          widgets: widgets,
          layouts: {},
        };

        // Find current tab to determine if it has Engineering preset
        const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

        // Use the appropriate storage key based on tab type
        const ticketIdDisplay = currentTicket.cells["col-1"];
        if (hasEngineeringPreset) {
          // For Engineering preset tabs, save to Engineering-specific key
          saveToLS<LayoutStorage>("engineering-layouts", completeState);
          console.log(
            "Saved Engineering widget layout with",
            widgets.length,
            "widgets",
          );
        } else {
          // For non-Engineering tabs, save to tab-specific key
          const tabSpecificLayoutKey = `tab-${activeTab}`;
          saveToLS<LayoutStorage>(tabSpecificLayoutKey, completeState);
          console.log(
            "Saved tab-specific layout for tab",
            activeTab,
            "and ticket:",
            ticketIdDisplay,
          );
        }
      }

      // Close the dialog
      setViewDialogOpen(false);

      // Reset the current ticket preset
      setCurrentTicketPreset(undefined);
    } catch (error) {
      console.error("Error saving ticket changes:", error);
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

  const viewTicket = (ticket: Row, tabId: string) => {
    setCurrentTicket(ticket);
    setViewDialogOpen(true);

    // Check if this tab has a preset
    const currentTabData = tabs.find((tab) => tab.id === tabId);
    const hasEngineeringPreset = currentTabData && currentTabData.isEngineeringPreset;
    setCurrentTicketPreset(hasEngineeringPreset ? "engineering" : undefined);

    // Get data from ticket
    const status = ticket.cells["col-7"] || "";
    const customerId = ticket.cells["col-3"] || "";
    const ticketId = ticket.id;
    const description = ticket.cells["col-8"] || "";
    const createdAt = ticket.cells["col-2"] || "";
    const lastModified = ticket.cells["col-9"] || "";
    const billableHoursStr = ticket.cells["col-5"] || "0";
    const totalHoursStr = ticket.cells["col-6"] || "0";
    const billableHours = parseFloat(billableHoursStr);
    const totalHours = parseFloat(totalHoursStr);
    const attachments = ticket.cells["col-10"] || [];

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
      } else {
        // Start with empty assignees for all presets
        setAssignees([]);
      }
    } else {
      // Without raw data, start with empty assignees
      setAssignees([]);
    }

    // Set empty time entries for all presets
    setTimeEntries([]);

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
