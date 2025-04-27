// CSS Imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Plus } from "lucide-react";
// React and Hooks
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRESET_TABLES } from "@/constants/tickets";
import {
  customersService,
  Status,
  statusesService,
  ticketsService,
  usersService,
} from "@/services/ticketsService";
import { Customer, Row, Ticket, User } from "@/types/tickets";
import { convertTicketToRow } from "@/utils/ticketUtils";

// Components
import TabNavigation from "../components/TabNavigation";
import { columns } from "../features/tickets/components/columns";
import { DataTable } from "../features/tickets/components/data-table";
import TicketDialog from "../features/tickets/components/TicketDialog";
import useTicketDialogHandlers from "../features/tickets/hooks/useTicketDialogHandlers";
// Zustand Stores
import { useSettingsStore } from "../stores/settingsStore";
import useTablesStore from "../stores/tablesStore";
import useTabsStore from "../stores/tabsStore";
import useWidgetsStore from "../stores/widgetsStore";
import { uploadFile } from "@/services/storageService";
// Utils and Hooks
import { getSavedTabsData } from "../utils/ticketUtils";

/**
 * Tickets Component
 *
 * This component manages the tickets tab and grid interface.
 *
 * Relationship Fields:
 * - status_id: Many-to-one relationship with the statuses collection
 *   When creating a ticket, this is a string ID of the selected status
 *
 * - customer_id: Many-to-one relationship with the customers collection
 *   When creating a ticket, this is a string ID of the selected customer
 *
 * - assignee_ids: Many-to-many relationship with the users collection
 *   When creating a ticket, this is an array of string IDs of selected users
 *
 * The selection of these relationship fields is handled in the "Create New Ticket" dialog,
 * and the correct formatting for Appwrite is managed in the ticketsService.createTicket
 * and ticketsService.updateTicket methods.
 */
function Tickets() {
  // State for Appwrite data loading
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<Error | null>(null);
  // State for forcing UI refreshes
  const [ticketsRefreshCounter, setTicketsRefreshCounter] = useState(0);

  // ===== Zustand Stores =====
  // Tabs Store
  const {
    tabs,
    activeTab,
    editingTab,
    editingTitle,
    setEditingTitle,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    addTab,
    closeTab,
    handleDoubleClick,
    handleRenameKeyDown,
  } = useTabsStore();

  // Tables Store
  const {
    tables,

    resetTabs,
    createNewTable,
  } = useTablesStore();

  // Widgets Store
  const {
    widgets,
    widgetLayouts,
    setWidgets,
    setWidgetLayouts,
    toggleWidgetCollapse,
    addWidget,
    removeWidget,
    onLayoutChange,
  } = useWidgetsStore();

  // ===== Initialization and Effects =====
  // Initialize data from localStorage
  (() => {
    const { tabs, activeTab } = getSavedTabsData();
    if (tabs) {
      useTabsStore.getState().setTabs(tabs);
    }
    if (activeTab) {
      useTabsStore.getState().setActiveTab(activeTab);
    }
  })();

  // Auto-rebuild missing tabs from Appwrite statuses on page load
  useEffect(() => {
    const restoreTabsFromStatuses = async () => {
      try {
        const tabsStore = useTabsStore.getState();
        const settingsStore = useSettingsStore.getState();

        const statuses = await statusesService.getAllStatuses();
        const statusLabels = statuses.map((s) => s.label);

        const existingTabs = tabsStore.tabs;
        const filteredTabs = [];

        // Always keep "All Tickets" tab
        if (!existingTabs.some((tab) => tab.title === "All Tickets")) {
          filteredTabs.push({
            id: "tab-all-tickets",
            title: "All Tickets",
          });
        } else {
          filteredTabs.push(existingTabs.find((tab) => tab.title === "All Tickets")!);
        }

        // Add tabs only for valid statuses
        statusLabels.forEach((status) => {
          const existingTab = existingTabs.find((tab) => tab.title === status);
          if (existingTab) {
            filteredTabs.push(existingTab); // reuse existing tab
          } else {
            filteredTabs.push({
              id: `tab-${status.toLowerCase().replace(/\s+/g, "-")}`,
              title: status,
              status: status,
            });
          }
        });

        // Update the Zustand tabs
        tabsStore.setTabs(filteredTabs);

        // Make sure we have an active tab
        if (!tabsStore.activeTab && filteredTabs.length > 0) {
          tabsStore.setActiveTab(filteredTabs[0].id);
        }

        // Update local status options store too
        settingsStore.setStatusOptions(statusLabels);
      } catch (error) {
        console.error("Failed to restore tabs from statuses:", error);
      }
    };

    restoreTabsFromStatuses();
  }, []);

  // Load tables from localStorage on initial render
  useEffect(() => {
    const savedTables = localStorage.getItem("ticket-tables");
    if (savedTables) {
      useTablesStore.getState().setTables(JSON.parse(savedTables));
    }
  }, []);

  // Create a table when a new tab is added without a table
  useEffect(() => {
    if (activeTab && !tables[activeTab]) {
      createNewTable(activeTab);
    }
  }, [activeTab, tables, createNewTable]);

  // Helper function to check if any tab has the engineering preset applied
  const hasEngineeringPreset = useCallback(() => {
    return tabs.some((tab) => tab.appliedPreset === "Engineering");
  }, [tabs]);

  // Fetch tickets data only if engineering preset is already initiated
  useEffect(() => {
    const fetchTicketsIfPresetExists = async () => {
      if (hasEngineeringPreset()) {
        try {
          setTicketsLoading(true);
          setTicketsError(null);

          // Fetch tickets with relationships from Appwrite
          const ticketsWithRelationships =
            await ticketsService.getTicketsWithRelationships();

          // Convert tickets to rows
          const allTicketRows = ticketsWithRelationships.map((ticket) =>
            convertTicketToRow(ticket),
          );

          // Update tables for each tab based on status
          // Find the "All Tickets" tab
          const allTicketsTab = tabs.find((tab) => tab.title === "All Tickets");
          if (allTicketsTab) {
            createTicketsTableForAllTickets(allTicketsTab.id, allTicketRows);
          }

          // Update filtered status tabs
          tabs.forEach((tab) => {
            if (tab.status) {
              createFilteredTable(tab.id, tab.status, allTicketRows);
            }
          });

          setTicketsLoading(false);
        } catch (error) {
          console.error("Error fetching tickets data:", error);
          setTicketsError(
            error instanceof Error ? error : new Error("Failed to load tickets"),
          );
          setTicketsLoading(false);
        }
      }
    };

    fetchTicketsIfPresetExists();
    // Only run when hasEngineeringPreset changes or ticketsRefreshCounter changes
    // Removed 'tabs' from dependency array to avoid infinite loop
  }, [hasEngineeringPreset, ticketsRefreshCounter, tabs]);

  // Creates tabs based on statusOptions and uses real data
  const applyEngineeringPreset = async () => {
    try {
      setTicketsLoading(true);
      setTicketsError(null);

      const settingsStore = useSettingsStore.getState();
      const tabsStore = useTabsStore.getState();

      const engineeringPresetStatuses = [
        "New Tickets",
        "Awaiting Customer Response",
        "Awaiting for Parts",
        "Open Tickets",
        "In-Progress Tickets",
        "Completed Tickets",
        "Declined Tickets",
      ];

      // STEP 1: Get current statuses fresh from backend (NOT from store yet)
      const statusesFromBackend = await statusesService.getAllStatuses();
      const existingStatusLabels = statusesFromBackend.map((status) => status.label);

      // STEP 2: Add missing statuses
      const missingStatuses = engineeringPresetStatuses.filter(
        (preset) => !existingStatusLabels.includes(preset),
      );

      if (missingStatuses.length > 0) {
        await Promise.all(
          missingStatuses.map((status) =>
            statusesService.createStatus({ label: status }),
          ),
        );
      }

      // STEP 3: Fetch statuses again freshly (after adding)
      const updatedStatuses = await statusesService.getAllStatuses();
      const updatedStatusLabels = updatedStatuses.map((status) => status.label);

      // STEP 4: Fetch tickets
      const ticketsWithRelationships =
        await ticketsService.getTicketsWithRelationships();

      // STEP 5: Build tabs
      const existingTabs = tabsStore.tabs;
      const existingTabTitles = new Set(existingTabs.map((tab) => tab.title));

      const tabsToAdd = [];

      if (!existingTabTitles.has("All Tickets")) {
        tabsToAdd.push({
          id: "tab-all-tickets",
          title: "All Tickets",
        });
      }

      updatedStatusLabels.forEach((status) => {
        if (!existingTabTitles.has(status)) {
          tabsToAdd.push({
            id: `tab-${status.toLowerCase().replace(/\s+/g, "-")}`,
            title: status,
            status: status,
          });
        }
      });

      tabsStore.setTabs([...existingTabs, ...tabsToAdd]);

      if (!tabsStore.activeTab && tabsToAdd.length > 0) {
        tabsStore.setActiveTab("tab-all-tickets");
      }

      // STEP 6: Create tables
      const allTicketRows = ticketsWithRelationships.map((ticket) =>
        convertTicketToRow(ticket),
      );

      tabsToAdd.forEach((tab) => {
        if (tab.title === "All Tickets") {
          createTicketsTableForAllTickets(tab.id, allTicketRows);
        } else {
          createFilteredTable(tab.id, tab.title, allTicketRows);
        }
      });

      // Finally, update the Zustand store statuses too
      settingsStore.setStatusOptions(updatedStatusLabels);

      setTicketsLoading(false);
    } catch (error) {
      console.error("Error applying Engineering preset with real data:", error);
      setTicketsError(
        error instanceof Error ? error : new Error("Failed to load tickets"),
      );
      setTicketsLoading(false);
    }
  };

  // Helper function to create a table with all tickets
  const createTicketsTableForAllTickets = (tabId: string, ticketRows: Row[]) => {
    const tablesStore = useTablesStore.getState();
    const presetTable = PRESET_TABLES["Engineering"];

    if (!presetTable) return;

    // Check if the table already exists with the same number of rows to avoid unnecessary updates
    const existingTable = tablesStore.tables[tabId];
    if (existingTable && existingTable.rows.length === ticketRows.length) {
      // If the table exists with same number of rows, only update if needed
      let needsUpdate = false;

      // Compare the first row to see if data has changed (simple check)
      if (existingTable.rows.length > 0 && ticketRows.length > 0) {
        const firstExistingRow = existingTable.rows[0];
        const firstNewRow = ticketRows[0];
        if (JSON.stringify(firstExistingRow) !== JSON.stringify(firstNewRow)) {
          needsUpdate = true;
        }
      }

      if (!needsUpdate) {
        return; // Skip update if data hasn't changed
      }
    }

    // Update table with new rows
    tablesStore.setTables({
      ...tablesStore.tables,
      [tabId]: {
        columns: [...presetTable.columns],
        rows: ticketRows,
      },
    });

    // Mark this tab with the applied preset
    const tabsStore = useTabsStore.getState();
    const updatedTabs = tabsStore.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, appliedPreset: "Engineering" } : tab,
    );
    tabsStore.setTabs(updatedTabs);
  };

  // Helper function to create filtered tables based on the All Tickets tab
  const createFilteredTable = (tabId: string, status: string, allTicketRows: Row[]) => {
    const tablesStore = useTablesStore.getState();
    const presetTable = PRESET_TABLES["Engineering"];

    if (!presetTable) return;

    // Filter rows by the status
    const filteredRows = allTicketRows.filter((row) => row.cells["col-7"] === status);

    // Check if the table already exists with the same number of rows to avoid unnecessary updates
    const existingTable = tablesStore.tables[tabId];
    if (existingTable && existingTable.rows.length === filteredRows.length) {
      // If the table exists with same number of rows, only update if needed
      let needsUpdate = false;

      // Compare the first row to see if data has changed (simple check)
      if (existingTable.rows.length > 0 && filteredRows.length > 0) {
        const firstExistingRow = existingTable.rows[0];
        const firstNewRow = filteredRows[0];
        if (JSON.stringify(firstExistingRow) !== JSON.stringify(firstNewRow)) {
          needsUpdate = true;
        }
      }

      if (!needsUpdate) {
        return; // Skip update if data hasn't changed
      }
    }

    // Update table with filtered rows
    tablesStore.setTables({
      ...tablesStore.tables,
      [tabId]: {
        columns: [...presetTable.columns],
        rows: filteredRows,
      },
    });

    // Mark this tab with the applied preset
    const tabsStore = useTabsStore.getState();
    const updatedTabs = tabsStore.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, appliedPreset: "Engineering" } : tab,
    );
    tabsStore.setTabs(updatedTabs);
  };

  // Real-time ticket creation - create ticket in Appwrite and update UI
  const handleCreateTicket = async (ticketData: Partial<Ticket>) => {
    try {
      // Prepare ticket data with defaults for required fields
      const newTicketData: Omit<Ticket, "id"> = {
        status_id: ticketData.status_id || "", // Default to empty, should be set by caller
        customer_id: ticketData.customer_id || "", // Default to empty, should be set by caller
        description: ticketData.description || "",
        billable_hours: ticketData.billable_hours || 0,
        total_hours: ticketData.total_hours || 0,
        assignee_ids: ticketData.assignee_ids || [],
        attachments: ticketData.attachments || [],
      };

      console.log("Formatted ticket data for creation:", {
        status_id: newTicketData.status_id,
        customer_id: newTicketData.customer_id,
        assignee_ids: newTicketData.assignee_ids,
        description:
          newTicketData.description?.substring(0, 50) +
          (newTicketData.description?.length > 50 ? "..." : ""),
      });

      // Create the ticket in Appwrite
      const createdTicket = await ticketsService.createTicket(newTicketData);

      // Make sure we have a valid ID before proceeding
      if (!createdTicket || !createdTicket.id) {
        throw new Error("Failed to create ticket: No ID returned");
      }

      console.log("Created ticket with ID:", createdTicket.id);

      // Create a simplified row for now, in case relationship fetching fails
      let newRow: Row = {
        id: createdTicket.id,
        cells: {
          "col-1": createdTicket.id || "",
          "col-2": new Date().toISOString(),
          "col-3": "Loading...", // Customer name (will be updated if relationship fetch succeeds)
          "col-4": createdTicket.description || "",
          "col-5": "Loading...", // Assignee names (will be updated if relationship fetch succeeds)
          "col-6": Array.isArray(createdTicket.attachments)
            ? createdTicket.attachments.join(", ")
            : "",
          "col-7": "Loading...", // Status (will be updated if relationship fetch succeeds)
          "col-8": createdTicket.billable_hours?.toString() || "0",
          "col-9": createdTicket.total_hours?.toString() || "0",
        },
      };

      try {
        // Try to fetch the complete ticket with relationships
        const ticketWithRelationships = await ticketsService.getTicketWithRelationships(
          createdTicket.id,
        );

        // If successful, convert to proper row format
        newRow = convertTicketToRow(ticketWithRelationships);
      } catch (relationshipError) {
        console.warn(
          "Error fetching relationships for newly created ticket:",
          relationshipError,
        );
        // Continue with the simplified row we created
      }

      // Get current tables and create updated tables object
      const currentTables = { ...tables };

      // Update the All Tickets tab
      const allTicketsTabId = "tab-all-tickets";
      if (currentTables[allTicketsTabId]) {
        currentTables[allTicketsTabId] = {
          ...currentTables[allTicketsTabId],
          rows: [...currentTables[allTicketsTabId].rows, newRow],
        };
      }

      // Also update the current status tab if applicable
      // Only do this if we successfully got the status
      if (newRow.cells["col-7"] !== "Loading...") {
        const statusTabs = tabs.filter((tab) => tab.status === newRow.cells["col-7"]);
        if (statusTabs.length > 0) {
          const statusTabId = statusTabs[0].id;
          if (currentTables[statusTabId]) {
            currentTables[statusTabId] = {
              ...currentTables[statusTabId],
              rows: [...currentTables[statusTabId].rows, newRow],
            };
          }
        }
      }

      // Update the tables in the store all at once
      const tablesStore = useTablesStore.getState();
      tablesStore.setTables(currentTables);

      // Force a refresh of the UI by updating a state value
      setTicketsRefreshCounter((prev) => prev + 1);

      return newRow;
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }
  };

  const updateWidgetTitle = (widgetId: string, newTitle: string) => {
    const updatedWidgets = widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, title: newTitle } : widget,
    );
    setWidgets(updatedWidgets);
  };

  // Custom handleFieldChange to handle ticket status updates
  const handleFieldChange = (field: string, value: string) => {
    // First, update the widget value in the widgets store
    useWidgetsStore.getState().handleFieldChange(field, value);

    // If this is a status change and we have a current ticket, update it in all tables
    if (field === "status" && ticketDialogHandlers.currentTicket) {
      const currentTicket = ticketDialogHandlers.currentTicket;
      const updatedTables = { ...tables };

      // First update the ticket in the All Tickets tab (or current tab if not using tabs with status)
      const allTicketsTab = "tab-all-tickets";
      if (updatedTables[allTicketsTab]) {
        // Find and update the row in the All Tickets tab
        updatedTables[allTicketsTab].rows = updatedTables[allTicketsTab].rows.map(
          (row: Row) => {
            if (row.id === currentTicket.id) {
              return {
                ...row,
                cells: {
                  ...row.cells,
                  "col-7": value, // Update Status column
                },
              };
            }
            return row;
          },
        );
      }

      // Also update the row in the current tab if it's not the All Tickets tab
      if (activeTab !== allTicketsTab && updatedTables[activeTab]) {
        updatedTables[activeTab].rows = updatedTables[activeTab].rows.map(
          (row: Row) => {
            if (row.id === currentTicket.id) {
              return {
                ...row,
                cells: {
                  ...row.cells,
                  "col-7": value, // Update Status column
                },
              };
            }
            return row;
          },
        );
      }

      // Update the global tables state
      useTablesStore.getState().setTables(updatedTables);

      // Refresh all status-based tabs with updated data
      refreshStatusTabs(updatedTables[allTicketsTab]?.rows || []);
    }
  };

  // Function to refresh all status-based tabs based on updated All Tickets data
  const refreshStatusTabs = (allTicketsRows: Row[]) => {
    // Get a reference to the tables store
    const tablesStore = useTablesStore.getState();
    const currentTables = tablesStore.tables;
    const updatedTables = { ...currentTables };
    const presetTable = PRESET_TABLES["Engineering"];

    if (!presetTable) return;

    // Loop through all tabs
    tabs.forEach((tab) => {
      // Skip the All Tickets tab
      if (tab.id === "tab-all-tickets" || !tab.status) return;

      // Filter rows for this tab based on its status
      const filteredRows = allTicketsRows.filter(
        (row) => row.cells["col-7"] === tab.status,
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

  // ===== Ticket Dialog Handlers =====
  const ticketDialogHandlers = useTicketDialogHandlers(
    activeTab,
    tabs,
    tables,
    widgets,
    setWidgets,
    setWidgetLayouts,
    addWidget,
  );

  // Get the current table based on active tab
  const currentTable = tables[activeTab];

  // Inject a refresh function to reload data from Appwrite
  const refreshTicketsData = async () => {
    try {
      // Only refresh if engineering preset is already initiated
      if (hasEngineeringPreset()) {
        setTicketsLoading(true);

        // Increment the counter to trigger the useEffect that fetches data
        setTicketsRefreshCounter((prev) => prev + 1);

        setTicketsLoading(false);
      } else {
        console.log("Cannot refresh tickets: Engineering preset not initiated");
      }
    } catch (error) {
      console.error("Error refreshing tickets data:", error);
      setTicketsError(
        error instanceof Error ? error : new Error("Failed to refresh tickets"),
      );
      setTicketsLoading(false);
    }
  };

  // State for the Add Ticket dialog
  const [isAddTicketDialogOpen, setIsAddTicketDialogOpen] = useState(false);
  const [newTicketData, setNewTicketData] = useState({
    status_id: "",
    customer_id: "",
    description: "",
    billable_hours: 0,
    total_hours: 0,
    assignee_ids: [] as string[],
    attachments: [] as string[],
  });
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Fetch statuses, customers, and users when component mounts or dialog opens
  useEffect(() => {
    const fetchTicketFormData = async () => {
      try {
        console.log("Fetching ticket form data...");

        // Fetch statuses
        const statusesData = await statusesService.getAllStatuses();
        console.log("Fetched statuses:", statusesData);
        setStatuses(statusesData);

        // Fetch customers
        const customersData = await customersService.getAllCustomers();
        console.log("Fetched customers:", customersData);
        setCustomers(customersData);

        // Fetch users
        const usersData = await usersService.getAllUsers();
        console.log("Fetched users:", usersData);
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    };

    if (isAddTicketDialogOpen) {
      fetchTicketFormData();
    }
  }, [isAddTicketDialogOpen]);

  // Handle new ticket form changes
  const handleNewTicketFormChange = (field: string, value: string | number) => {
    setNewTicketData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Helper function to get status label from ID
  const getStatusLabel = (statusId: string): string => {
    if (!statusId || statusId === "placeholder") return "Select status";
    const status = statuses.find((s) => s.$id === statusId);
    return status ? status.label : "Select status";
  };

  // Helper function to get customer name from ID
  const getCustomerName = (customerId: string): string => {
    if (!customerId || customerId === "placeholder") return "Select customer";
    const customer = customers.find((c) => c.$id === customerId);
    return customer ? customer.name : "Select customer";
  };

  // Handle assignee selection
  const handleAssigneeSelection = (userId: string) => {
    console.log("Toggling assignee selection for:", userId);
    setSelectedAssignees((prev) => {
      // If already selected, remove it
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      // Otherwise add it
      return [...prev, userId];
    });
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => file);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Handle file removal
  const removeUploadedFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
  };

  // Handle submit new ticket
  const handleSubmitNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Set loading state
      setTicketsLoading(true);
      
      // Upload files if any
      const uploadedFileIds: string[] = [];
      
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          try {
            // Upload file to Appwrite storage
            const result = await uploadFile(file);
            if (result && result.$id) {
              uploadedFileIds.push(result.$id);
            }
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
          }
        }
      }
      
      // Create new ticket with form data
      const ticketData = {
        ...newTicketData,
        assignee_ids: selectedAssignees,
        attachments: uploadedFileIds // Use the file IDs from storage
      };
      
      console.log("Creating ticket with relationship fields:", {
        status_id: ticketData.status_id,
        customer_id: ticketData.customer_id,
        assignee_ids: ticketData.assignee_ids,
        attachments: ticketData.attachments
      });
      
      // Create the ticket and update the UI
      await handleCreateTicket(ticketData);
      
      // Reset form data
      setNewTicketData({
        status_id: "",
        customer_id: "",
        description: "",
        billable_hours: 0,
        total_hours: 0,
        assignee_ids: [],
        attachments: []
      });
      setSelectedAssignees([]);
      setUploadedFiles([]);
      
      // Close dialog
      setIsAddTicketDialogOpen(false);
      
    } catch (error) {
      console.error("Error creating new ticket:", error);
    } finally {
      // End loading state
      setTicketsLoading(false);
    }
  };

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (isAddTicketDialogOpen) {
      // Reset form when opening
      setNewTicketData({
        status_id: "",
        customer_id: "",
        description: "",
        billable_hours: 0,
        total_hours: 0,
        assignee_ids: [],
        attachments: []
      });
      setSelectedAssignees([]);
      setUploadedFiles([]);
      console.log("Form data reset when dialog opened");
    }
  }, [isAddTicketDialogOpen]);

  return (
    <div className="p-8 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold mr-2">Tickets</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsAddTicketDialogOpen(true)}
            className="flex items-center gap-1 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <Plus size={16} /> Add Ticket
          </Button>
          <Button
            onClick={applyEngineeringPreset}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Apply Engineering Preset
          </Button>
          <Button
            onClick={resetTabs}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-300"
          >
            Reset
          </Button>
          {/* <button
            onClick={refreshTicketsData}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            disabled={ticketsLoading}
          >
            {ticketsLoading ? "Loading..." : "Refresh Data"}
          </button> */}
        </div>
      </div>

      {ticketsError && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          Error loading tickets: {ticketsError.message}
        </div>
      )}

      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        editingTab={editingTab}
        editingTitle={editingTitle}
        onTabClick={useTabsStore.getState().setActiveTab}
        onAddTabClick={addTab}
        onCloseTabClick={(id, e) => closeTab(id, e)}
        onDoubleClick={handleDoubleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onEditingTitleChange={(e) => setEditingTitle(e.target.value)}
        onRenameKeyDown={handleRenameKeyDown}
        onRenameBlur={useTabsStore.getState().saveTabName}
      />

      <div className="mt-6">
        {ticketsLoading ? (
          <div className="text-center py-10">
            <div className="flex justify-center items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Loading tickets...</span>
            </div>
          </div>
        ) : ticketsError ? (
          <div className="text-center py-10 text-red-500">
            <p>Error loading tickets: {ticketsError.message}</p>
            <Button variant="outline" className="mt-2" onClick={refreshTicketsData}>
              Try Again
            </Button>
          </div>
        ) : currentTable ? (
          // Key prop forces a remount when ticketsRefreshCounter changes
          <div key={`table-${activeTab}-${ticketsRefreshCounter}`}>
            <DataTable
              columns={columns}
              data={currentTable.rows}
              onRowClick={ticketDialogHandlers.handleInitializeTicketDialog}
              statusFilter={tabs.find((tab) => tab.id === activeTab)?.status}
            />
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-neutral-500">No table for this tab yet</p>
          </div>
        )}
      </div>

      {/* Add Ticket Dialog */}
      <Dialog
        open={isAddTicketDialogOpen}
        onOpenChange={(open) => {
          // Prevent closing the dialog when loading
          if (ticketsLoading && !open) return;
          setIsAddTicketDialogOpen(open);
        }}
      >
        <DialogTrigger asChild>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 hidden"
            aria-hidden="true"
          >
            Add Ticket
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Enter the details for the new ticket. Click create when done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitNewTicket}>
            <div className="grid gap-4 py-4">
              {/* Status */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status_id" className="text-right text-sm font-medium">
                  Status
                </label>
                <div className="col-span-3">
                  <Select
                    value={newTicketData.status_id || "placeholder"}
                    onValueChange={(value) => {
                      if (value !== "placeholder") {
                        handleNewTicketFormChange("status_id", value);
                      }
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={getStatusLabel(newTicketData.status_id)}
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border rounded-md shadow-md">
                      <SelectGroup>
                        <SelectItem value="placeholder" disabled>
                          Select status
                        </SelectItem>
                        {statuses && statuses.length > 0 ? (
                          statuses.map((status, index) => (
                            <SelectItem
                              key={status.$id || `status-${index}`}
                              value={
                                status.$id
                                  ? status.$id.toString()
                                  : `undefined-status-${index}`
                              }
                            >
                              {status.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-statuses" disabled>
                            No statuses available
                          </SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="customer_id" className="text-right text-sm font-medium">
                  Customer
                </label>
                <div className="col-span-3">
                  <Select
                    value={newTicketData.customer_id || "placeholder"}
                    onValueChange={(value) => {
                      if (value !== "placeholder") {
                        handleNewTicketFormChange("customer_id", value);
                      }
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={getCustomerName(newTicketData.customer_id)}
                    >
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border rounded-md shadow-md">
                      <SelectGroup>
                        <SelectItem value="placeholder" disabled>
                          Select customer
                        </SelectItem>
                        {customers && customers.length > 0 ? (
                          customers.map((customer, index) => (
                            <SelectItem
                              key={customer.$id || `customer-${index}`}
                              value={
                                customer.$id
                                  ? customer.$id.toString()
                                  : `undefined-customer-${index}`
                              }
                            >
                              {customer.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-customers" disabled>
                            No customers available
                          </SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="description" className="text-right text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newTicketData.description}
                  onChange={(e) =>
                    handleNewTicketFormChange("description", e.target.value)
                  }
                  className="col-span-3"
                  required
                />
              </div>

              {/* File Attachments */}
              <div className="grid grid-cols-4 items-start gap-4">
                <label htmlFor="attachments" className="text-right text-sm font-medium pt-2">
                  Attachments
                </label>
                <div className="col-span-3">
                  <Input
                    id="attachments"
                    type="file"
                    className="col-span-3"
                    multiple
                    onChange={handleFileUpload}
                    disabled={ticketsLoading}
                  />
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-xs">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeUploadedFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Select one or more files to attach to this ticket
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="billable_hours"
                  className="text-right text-sm font-medium"
                >
                  Billable Hours
                </label>
                <Input
                  id="billable_hours"
                  type="number"
                  value={newTicketData.billable_hours}
                  onChange={(e) =>
                    handleNewTicketFormChange(
                      "billable_hours",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="col-span-3"
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="total_hours" className="text-right text-sm font-medium">
                  Total Hours
                </label>
                <Input
                  id="total_hours"
                  type="number"
                  value={newTicketData.total_hours}
                  onChange={(e) =>
                    handleNewTicketFormChange(
                      "total_hours",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="col-span-3"
                  min="0"
                  step="0.5"
                />
              </div>

              {/* Assignees */}
              <div className="grid grid-cols-4 items-start gap-4">
                <label className="text-right text-sm font-medium mt-2">Assignees</label>
                <div className="col-span-3">
                  <Select
                    value={
                      selectedAssignees.length > 0 ? "has-selections" : "placeholder"
                    }
                    onValueChange={(value) => {
                      if (
                        value &&
                        value !== "has-selections" &&
                        value !== "placeholder"
                      ) {
                        handleAssigneeSelection(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label="Select assignees">
                      <SelectValue placeholder="Select assignees" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border rounded-md shadow-md">
                      <SelectGroup>
                        <SelectItem value="placeholder" disabled>
                          Select assignees
                        </SelectItem>
                        {users &&
                          users.length > 0 &&
                          users.map((user, index) => (
                            <SelectItem
                              key={user.$id || `user-${index}`}
                              value={
                                user.$id
                                  ? user.$id.toString()
                                  : `undefined-user-${index}`
                              }
                              className={
                                selectedAssignees.includes(
                                  user.$id || `undefined-user-${index}`,
                                )
                                  ? "bg-blue-100"
                                  : ""
                              }
                            >
                              {user.first_name} {user.last_name}
                              {selectedAssignees.includes(
                                user.$id || `undefined-user-${index}`,
                              ) && " ✓"}
                            </SelectItem>
                          ))}
                        {(!users || users.length === 0) && (
                          <SelectItem value="no-users" disabled>
                            No users available
                          </SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {/* Show selected assignees as tags */}
                  {selectedAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedAssignees.map((id) => {
                        const user = users.find((u) => u.$id === id);
                        if (!user) return null;

                        return (
                          <div
                            key={id}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm flex items-center"
                          >
                            {user.first_name} {user.last_name}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAssignees((prev) =>
                                  prev.filter((userId) => userId !== id),
                                )
                              }
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTicketDialogOpen(false)}
                disabled={ticketsLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={ticketsLoading}
                className="bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      <TicketDialog
        viewDialogOpen={ticketDialogHandlers.viewDialogOpen}
        setViewDialogOpen={ticketDialogHandlers.setViewDialogOpen}
        currentTicket={ticketDialogHandlers.currentTicket}
        currentTicketPreset={ticketDialogHandlers.currentTicketPreset}
        setCurrentTicketPreset={ticketDialogHandlers.setCurrentTicketPreset}
        ticketForm={ticketDialogHandlers.ticketForm}
        setTicketForm={ticketDialogHandlers.setTicketForm}
        uploadedImages={ticketDialogHandlers.uploadedImages}
        setUploadedImages={ticketDialogHandlers.setUploadedImages}
        assignees={ticketDialogHandlers.assignees}
        setAssignees={ticketDialogHandlers.setAssignees}
        timeEntries={ticketDialogHandlers.timeEntries}
        setTimeEntries={ticketDialogHandlers.setTimeEntries}
        isEditLayoutMode={ticketDialogHandlers.isEditLayoutMode}
        setIsEditLayoutMode={ticketDialogHandlers.setIsEditLayoutMode}
        showAssigneeForm={ticketDialogHandlers.showAssigneeForm}
        setShowAssigneeForm={ticketDialogHandlers.setShowAssigneeForm}
        newAssignee={ticketDialogHandlers.newAssignee}
        setNewAssignee={ticketDialogHandlers.setNewAssignee}
        widgets={widgets}
        setWidgets={setWidgets}
        widgetLayouts={widgetLayouts}
        setWidgetLayouts={setWidgetLayouts}
        activeTab={activeTab}
        tabs={tabs}
        handleSaveTicketChanges={ticketDialogHandlers.handleSaveTicketChanges}
        handleFieldChange={handleFieldChange}
        toggleWidgetCollapse={toggleWidgetCollapse}
        addWidget={addWidget}
        removeWidget={removeWidget}
        onLayoutChange={onLayoutChange}
        updateWidgetTitle={updateWidgetTitle}
        handleAddAssignee={ticketDialogHandlers.handleAddAssignee}
        handleRemoveAssignee={ticketDialogHandlers.handleRemoveAssignee}
        handleUpdateAssignee={ticketDialogHandlers.handleUpdateAssignee}
        handleAddTimeEntry={ticketDialogHandlers.handleAddTimeEntry}
        handleRemoveTimeEntry={ticketDialogHandlers.handleRemoveTimeEntry}
        handleUpdateTimeEntry={ticketDialogHandlers.handleUpdateTimeEntry}
        handleImageUpload={ticketDialogHandlers.handleImageUpload}
        markAssigneeCompleted={ticketDialogHandlers.markAssigneeCompleted}
      />
    </div>
  );
}

export default Tickets;
