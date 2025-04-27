import { useState } from "react";
import { Layouts } from "react-grid-layout";

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
import { getFromLS, saveToLS } from "../../../utils/ticketUtils";

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

    // In a real app, you would upload these files to a server
    // For demo purposes, we'll just create URLs for the images
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file));
    setUploadedImages((prev) => [...prev, ...newImages]);
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
      // Find the corresponding tab
      const currentTabData = tabs.find((tab) => tab.id === activeTab);
      if (!currentTabData) return;

      // Get the current status of the assignees
      const hasCompletedAssignees = assignees.some((assignee) => assignee.completed);

      // Prepare Appwrite relationship fields
      // Map the form data to the correct Appwrite field names
      const appwriteTicketData = {
        ...ticketForm,
        // Map status field to status_id for Appwrite
        status_id: ticketForm.status,
        // Map customerId field to customer_id for Appwrite
        customer_id: ticketForm.customerId,
        // Ensure assignee_ids is properly formatted
        assignee_ids: ticketForm.assigneeIds,
      };

      // Log the data being saved for debugging
      console.log(
        "Saving ticket with Appwrite relationship fields:",
        appwriteTicketData,
      );

      // Call saveTicketChanges from tablesStore
      useTablesStore.getState().saveTicketChanges(
        currentTicket,
        appwriteTicketData,
        setViewDialogOpen,
        activeTab,
        hasCompletedAssignees, // Pass the completion status to be saved
      );

      // If the ticket's status was changed, refresh all status-based tabs
      const allTicketsTab = "tab-all-tickets";
      const tablesStore = useTablesStore.getState();
      const allTicketsRows = tablesStore.tables[allTicketsTab]?.rows || [];

      // Refresh all status tabs to maintain consistency
      refreshStatusTabs(allTicketsRows);

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
  const refreshStatusTabs = (allTicketsRows: Row[]) => {
    // Get a reference to the tables store
    const tablesStore = useTablesStore.getState();
    const currentTables = tablesStore.tables;
    const updatedTables = { ...currentTables };

    // Loop through all tabs
    tabs.forEach((tab) => {
      // Skip the All Tickets tab
      if (tab.id === "tab-all-tickets" || !tab.status) return;

      // Get the preset table structure
      const presetTable = PRESET_TABLES["Engineering"];
      if (!presetTable) return;

      // Filter rows for this tab based on its status
      const filteredRows = allTicketsRows.filter(
        (row: { cells: { [x: string]: string | undefined; }; }) =>
          row.cells["col-7"] === tab.status,
      );

      // Update this tab's table with filtered rows
      updatedTables[tab.id] = {
        ...updatedTables[tab.id],
        columns: updatedTables[tab.id]?.columns || [...presetTable.columns],
        rows: filteredRows,
      };
    });

    // Update all tables at once
    tablesStore.setTables(updatedTables);
  };

  return {
    viewDialogOpen,
    setViewDialogOpen,
    currentTicket,
    setCurrentTicket,
    currentTicketPreset,
    setCurrentTicketPreset,
    isEditLayoutMode,
    setIsEditLayoutMode,
    ticketForm,
    setTicketForm,
    uploadedImages,
    setUploadedImages,
    assignees,
    setAssignees,
    assigneeTableTitle,
    setAssigneeTableTitle,
    newAssignee,
    setNewAssignee,
    showAssigneeForm,
    setShowAssigneeForm,
    timeEntries,
    setTimeEntries,
    handleImageUpload,
    handleAddAssignee,
    handleRemoveAssignee,
    handleUpdateAssignee,
    handleAddTimeEntry,
    handleUpdateTimeEntry,
    handleRemoveTimeEntry,
    markAssigneeCompleted,
    handleInitializeTicketDialog,
    handleSaveTicketChanges,
  };
}
