// CSS Imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Plus, Search, Check, X, Loader2, ChevronLeft, ChevronRight, Settings } from "lucide-react";
// React and Hooks
import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  customersService as ticketsCustomersService,
  statusesService,
  ticketsService,
  ticketAssignmentsService
} from "@/services/ticketsService";
import { timeEntriesService } from "@/services";
import { usersService, User as ServiceUser } from "@/services/usersService";
import { Customer, Row, Ticket, TimeEntry } from "@/types/tickets";
import { Status } from "@/services/ticketsService";
import { convertTicketToRow } from "@/utils/ticketUtils";
import { partsService, Part } from "@/services/partsService";

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
import useUserStore from "../stores/userStore";
import { uploadFile } from "@/services/storageService";

// Utils and Hooks
import { getSavedTabsData } from "../utils/ticketUtils";

// Debug component to display auth_user_id for assignees
const AssigneeDebugInfo = ({ assignees, users }: { assignees: any[], users: any[] }) => {
  if (!assignees || assignees.length === 0) return null;
  
  return (
    <div className="text-xs bg-gray-100 p-2 mt-2 rounded">
      <h4 className="font-bold">Debug: Auth User IDs</h4>
      {assignees.map((assignee, index) => {
        const user = users.find(u => u.$id === assignee.user_id);
        return (
          <div key={index} className="grid grid-cols-2 gap-2">
            <div>{assignee.name}</div>
            <div>{user?.auth_user_id || 'No auth_user_id'}</div>
          </div>
        );
      })}
    </div>
  );
}

// Import the customer contact types
import {
  customersService as fullCustomersService,
  CustomerContact
} from "@/services/customersService";

// Define a custom User type that includes auth_user_id
interface TicketUser {
  id: string;
  $id: string;
  first_name: string;
  last_name: string;
  username: string;
  user_type_id: string;
  auth_user_id?: string;
}

// Interface for the ticket form data (extends Ticket with UI-only fields)
interface TicketFormData {
  status_id: string;
  customer_id: string;
  primary_contact_id: string; // This is a UI-only field for the form
  description: string;
  billable_hours: number;
  total_hours: number;
  assignee_ids: string[];
  attachments: string[];
  part_ids: string[]; // Array of selected part IDs
  workflow: string; // New workflow field for tickets
}

// Add a workflow interface
interface Workflow {
  id: string;
  name: string;
}

// Helper function to convert ServiceUser to TicketUser
const mapServiceUserToTicketUser = (user: ServiceUser): TicketUser => ({
  id: user.$id || '',
  $id: user.$id || '',
  first_name: user.first_name || '',
  last_name: user.last_name || '',
  username: user.username || '',
  // Convert user_type_id to string if it's an object
  user_type_id: typeof user.user_type_id === 'object' ? user.user_type_id.$id : user.user_type_id || '',
  auth_user_id: user.auth_user_id || ''
});

// Helper function to convert form data to Ticket data
const convertFormDataToTicket = (formData: TicketFormData): Partial<Ticket> => {
  // Destructure to remove the primary_contact_id field
  const { primary_contact_id, ...ticketData } = formData;
  return ticketData;
};

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
  
  // State for time entries
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(false);
  const [timeEntriesTimestamp, setTimeEntriesTimestamp] = useState(0);
  
  // Workflow state
  const [workflows, setWorkflows] = useState<Workflow[]>(() => {
    // Try to load workflows from localStorage
    const savedWorkflows = localStorage.getItem("ticket-workflows");
    if (savedWorkflows) {
      try {
        return JSON.parse(savedWorkflows);
      } catch (e) {
        console.error("Failed to parse saved workflows:", e);
        return [{ id: "engineering", name: "Engineering" }]; // Default
      }
    }
    return [{ id: "engineering", name: "Engineering" }]; // Default
  });
  
  const [currentWorkflow, setCurrentWorkflow] = useState<string>(() => {
    // Try to load current workflow from localStorage
    const savedWorkflow = localStorage.getItem("current-workflow");
    return savedWorkflow || "engineering"; // Default to engineering
  });
  
  // Track which workflows have had presets applied
  const [appliedPresetWorkflows, setAppliedPresetWorkflows] = useState<string[]>(() => {
    // Load from localStorage
    const savedAppliedPresets = localStorage.getItem("applied-preset-workflows");
    if (savedAppliedPresets) {
      try {
        return JSON.parse(savedAppliedPresets);
      } catch (e) {
        console.error("Failed to parse saved applied presets:", e);
        return [];
      }
    }
    return [];
  });
  
  const [isNewWorkflowDialogOpen, setIsNewWorkflowDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  
  // Flag to track initial render for workflow changes
  const isInitialWorkflowRender = useRef(true);
  
  // Save workflows to localStorage when they change
  useEffect(() => {
    localStorage.setItem("ticket-workflows", JSON.stringify(workflows));
  }, [workflows]);
  
  // Add a new effect to save applied presets
  useEffect(() => {
    localStorage.setItem("applied-preset-workflows", JSON.stringify(appliedPresetWorkflows));
  }, [appliedPresetWorkflows]);
  
  // Get user permission state
  const { hasPermission, currentUser } = useUserStore();
  const isAdmin = hasPermission("admin");

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

  // Helper function to check if any tab has the engineering preset applied for the current workflow
  const hasEngineeringPreset = useCallback(() => {
    // Get tabs directly from the store to avoid dependency on component state
    const storeTabs = useTabsStore.getState().tabs;
    return storeTabs.some((tab) => tab.appliedPreset === "Engineering");
  }, []); // Remove tabs dependency to break the loop

  // Auto-rebuild missing tabs from Appwrite statuses on page load
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    const restoreTabsFromStatuses = async () => {
      try {
        const tabsStore = useTabsStore.getState();
        const settingsStore = useSettingsStore.getState();

        // Check if engineering preset is applied and hasn't been reset
        const storeTabs = tabsStore.tabs;
        const hasPreset = storeTabs.some((tab) => tab.appliedPreset === "Engineering");
        const hasBeenReset = !appliedPresetWorkflows.includes(currentWorkflow);

        if (!hasPreset || hasBeenReset) {
          // If engineering preset is not applied or has been reset, only ensure we have an All Tickets tab
          const existingTabs = tabsStore.tabs;
          
          // If we don't have any tabs yet, create just the All Tickets tab
          if (existingTabs.length === 0) {
            tabsStore.setTabs([{
              id: "tab-all-tickets",
              title: "All Tickets",
            }]);
            
            // Make sure we have an active tab
            tabsStore.setActiveTab("tab-all-tickets");
          }
          
          // Still fetch and update status options in the settings store
          await settingsStore.fetchStatusOptions();
          return;
        }

        // Below code only runs if engineering preset is applied and hasn't been reset
        // Fetch the status options from the settings store
        await settingsStore.fetchStatusOptions();

        // Check if component is still mounted before continuing
        if (!isMounted) return;

        const statuses = await statusesService.getAllStatuses();
        
        // Check if component is still mounted before state updates
        if (!isMounted) return;
        
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

        // Only add tabs for statuses that don't already exist
        const existingTabTitles = new Set(existingTabs.map(tab => tab.title));
        
        statusLabels.forEach((status) => {
          if (existingTabTitles.has(status)) {
            // Reuse existing tab
            filteredTabs.push(existingTabs.find((tab) => tab.title === status)!);
          } else {
            // Create new tab
            filteredTabs.push({
              id: `tab-${status.toLowerCase().replace(/\s+/g, "-")}`,
              title: status,
              status: status,
            });
          }
        });

        // Check if component is still mounted before final state updates
        if (!isMounted) return;
        
        // Only update tabs if they've actually changed
        if (JSON.stringify(filteredTabs) !== JSON.stringify(existingTabs)) {
          // Update the Zustand tabs
          tabsStore.setTabs(filteredTabs);
          
          // Make sure we have an active tab
          if (!tabsStore.activeTab && filteredTabs.length > 0) {
            tabsStore.setActiveTab(filteredTabs[0].id);
          }
        }

        // Update local status options store too
        settingsStore.setStatusOptions(statusLabels);
      } catch (error) {
        console.error("Failed to restore tabs from statuses:", error);
      }
    };

    restoreTabsFromStatuses();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [ticketsRefreshCounter, currentWorkflow, appliedPresetWorkflows]);

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

  // Flag to prevent concurrent fetches
  const [isDataFetchInProgress, setIsDataFetchInProgress] = useState(false);
  
  // Fetch tickets data only if engineering preset is already initiated and we aren't already fetching
  useEffect(() => {
    let isMounted = true;
    
    const fetchTicketsIfPresetExists = async () => {
      // Skip if a fetch is already in progress or component unmounted
      if (isDataFetchInProgress || !isMounted) return;
      
      // Check if engineering preset exists directly from store
      const storeTabs = useTabsStore.getState().tabs;
      if (!storeTabs.some((tab) => tab.appliedPreset === "Engineering")) {
        return; // Don't fetch if preset not applied
      }
      
      try {
        // Set loading flags to prevent concurrent fetches
        setIsDataFetchInProgress(true);
        setTicketsLoading(true);
        setTicketsError(null);

        console.log("Starting tickets fetch...");
        // Fetch tickets and users with relationships from Appwrite
        const [ticketsWithRelationships, users] = await Promise.all([
          ticketsService.getTicketsWithRelationships(),
          usersService.getAllUsers()
        ]);
        
        // Exit early if unmounted
        if (!isMounted) return;
          
        // Fetch time entries only if cache is old or empty
        const now = Date.now();
        if (timeEntries.length === 0 || (now - timeEntriesTimestamp) > 30000) {
          await fetchTimeEntries();
        }
        
        // Exit early if unmounted
        if (!isMounted) return;
          
        // Filter tickets based on user permissions
        const filteredTickets = filterTicketsByUserPermission(ticketsWithRelationships, users);

        // Convert tickets to rows
        const allTicketRows = filteredTickets.map((ticket) =>
          convertTicketToRow(ticket),
        );

        // Get current tables state directly from store
        const tablesStore = useTablesStore.getState();
        const currentTables = { ...tablesStore.tables };
        let tablesNeedUpdate = false;

        // Get tabs from store directly
        const currentTabs = useTabsStore.getState().tabs;

        // Find the "All Tickets" tab
        const allTicketsTab = currentTabs.find((tab) => tab.title === "All Tickets");
        if (allTicketsTab) {
          // Check if we need to update the all tickets table
          const currentAllTicketsTable = currentTables[allTicketsTab.id];
          const needsUpdate = !currentAllTicketsTable || 
            currentAllTicketsTable.rows.length !== allTicketRows.length;
          
          if (needsUpdate) {
            tablesNeedUpdate = true;
            createTicketsTableForAllTickets(allTicketsTab.id, allTicketRows);
          }
        }

        // Update filtered status tabs
        currentTabs.forEach((tab) => {
          if (tab.status) {
            // Filter rows by the status
            const filteredRows = allTicketRows.filter((row) => row.cells["col-7"] === tab.status);
            
            // Check if we need to update this status tab
            const currentStatusTable = currentTables[tab.id];
            const needsUpdate = !currentStatusTable ||
              currentStatusTable.rows.length !== filteredRows.length;
            
            if (needsUpdate) {
              tablesNeedUpdate = true;
              createFilteredTable(tab.id, tab.status, allTicketRows);
            }
          }
        });

        // Only log if we had to update tables
        if (tablesNeedUpdate) {
          console.log("Updated tables with new ticket data");
        }
        
        console.log("Tickets fetch complete!");
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching tickets data:", error);
          setTicketsError(
            error instanceof Error ? error : new Error("Failed to load tickets"),
          );
        }
      } finally {
        if (isMounted) {
          setTicketsLoading(false);
          setIsDataFetchInProgress(false);
        }
      }
    };

    fetchTicketsIfPresetExists();
    
    return () => {
      isMounted = false;
    };
  // Only refresh when counter changes or workflow changes, not on data state changes
  }, [ticketsRefreshCounter, currentWorkflow]);

  // Function to filter tickets based on user permissions
  const filterTicketsByUserPermission = (tickets: Ticket[], serviceUsers: ServiceUser[]) => {
    // Convert ServiceUser array to TicketUser array
    const users = serviceUsers.map(mapServiceUserToTicketUser);
    
    // First, filter tickets by the current workflow
    const workflowFilteredTickets = tickets.filter(ticket => 
      // If ticket has no workflow, treat it as "engineering" for backward compatibility
      (ticket.workflow || "engineering") === currentWorkflow
    );
    
    // If user is admin, show all tickets within the current workflow
    if (isAdmin) {
      console.log(`User is admin, showing ${workflowFilteredTickets.length} tickets for workflow: ${currentWorkflow}`);
      return workflowFilteredTickets;
    }
    
    // For debugging: log the current user info
    console.log("Current user:", currentUser);
    
    if (!currentUser) {
      console.log("No current user detected, showing no tickets");
      return [];
    }
    
    // For debugging: log auth user ID
    console.log("Auth user ID:", currentUser.id);
    
    // Create a mapping of auth_user_id to user documents
    const usersByAuthId = new Map<string, TicketUser>();
    const usersById = new Map<string, TicketUser>();
    
    users.forEach(user => {
      // Map by database ID
      usersById.set(user.id || '', user);
      
      // Map by auth_user_id if it exists
      if (user.auth_user_id) {
        usersByAuthId.set(user.auth_user_id, user);
      }
    });
    
    // Find the database user that matches the current auth user
    const currentDbUser = usersByAuthId.get(currentUser.id);
    
    console.log("Current DB user found:", currentDbUser);
    
    if (!currentDbUser) {
      console.log(`No database user record found for auth user ID ${currentUser.id}`);
      return [];
    }
    
    // Get the database user ID
    const currentDbUserId = currentDbUser.id;
    
    if (!currentDbUserId) {
      console.log("Database user has no ID");
      return [];
    }
    
    console.log(`Current user maps to database user ID: ${currentDbUserId}`);
    
    // If not admin, only show tickets assigned to the current user
    const filteredTickets = workflowFilteredTickets.filter((ticket) => {
      // Skip filtering if no assignee_ids or if ticket has no assignments
      if (!ticket.assignee_ids || !Array.isArray(ticket.assignee_ids) || ticket.assignee_ids.length === 0) {
        return false;
      }
      
      // For debugging: log the assignee IDs for this ticket
      const ticketId = ticket.id || (ticket as any).$id;
      console.log(`Checking ticket ${ticketId} with assignees:`, ticket.assignee_ids);
      
      // Check if the current DB user ID is in the assignees list
      return ticket.assignee_ids.some(assignee => {
        if (typeof assignee === 'string') {
          // If it's just a string ID, compare directly with the DB user ID
          const matches = assignee === currentDbUserId;
          console.log(`Comparing assignee ID ${assignee} with user DB ID ${currentDbUserId}: ${matches}`);
          return matches;
        } else if (typeof assignee === 'object' && assignee !== null) {
          // If it's an object, it should have an $id property to compare
          const assigneeId = (assignee as any).$id || '';
          const matches = assigneeId === currentDbUserId;
          console.log(`Comparing assignee object ID ${assigneeId} with user DB ID ${currentDbUserId}: ${matches}`);
          return matches;
        }
        return false;
      });
    });
    
    console.log(`Filtered ${workflowFilteredTickets.length} tickets down to ${filteredTickets.length} for user ${currentUser.name} in workflow ${currentWorkflow}`);
    return filteredTickets;
  };

  // Creates tabs based on statusOptions and applies presets to current workflow 
  const applyWorkflowPreset = async () => {
    // Skip if a data fetch is already in progress
    if (isDataFetchInProgress || ticketsLoading) {
      console.log("Skipping preset apply - a data operation is already in progress");
      return;
    }
    
    try {
      setIsDataFetchInProgress(true);
      setTicketsLoading(true);
      setTicketsError(null);

      // Use a single transaction for all store updates
      const settingsStore = useSettingsStore.getState();
      const tabsStore = useTabsStore.getState();
      const tablesStore = useTablesStore.getState();

      console.log("Applying preset to workflow:", currentWorkflow);
      
      // STEP 1: Get current statuses fresh from backend
      const statusesFromBackend = await statusesService.getAllStatuses();
      const existingStatusLabels = statusesFromBackend.map((status) => status.label);

      // STEP 2: Define the required engineering statuses
      const requiredStatuses = [
        "New",
        "Awaiting Customer Response",
        "Awaiting for Parts",
        "Open",
        "In Progress",
        "Completed",
        "Declined"
      ];

      // STEP 3: Add missing required statuses
      const missingRequiredStatuses = requiredStatuses.filter(
        (status) => !existingStatusLabels.includes(status)
      );

      if (missingRequiredStatuses.length > 0) {
        await Promise.all(
          missingRequiredStatuses.map((status) =>
            statusesService.createStatus({ label: status })
          )
        );
      }

      // STEP 4: Fetch statuses again after adding required ones
      const updatedStatuses = await statusesService.getAllStatuses();
      const updatedStatusLabels = updatedStatuses.map((status) => status.label);

      // Update the settings store with all available statuses
      settingsStore.setStatusOptions(updatedStatusLabels);

      // STEP 5: Fetch tickets and users
      const [ticketsWithRelationships, users] = await Promise.all([
        ticketsService.getTicketsWithRelationships(),
        usersService.getAllUsers()
      ]);
        
      // STEP 6: Filter tickets based on user permissions
      const filteredTickets = filterTicketsByUserPermission(ticketsWithRelationships, users);

      // Convert all tickets to rows once
      const allTicketRows = filteredTickets.map((ticket) => convertTicketToRow(ticket));

      // STEP 7: Build tabs
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

      // STEP 8: Apply all changes in one batch
      // Update tabs first
      if (tabsToAdd.length > 0) {
        const updatedTabs = [...existingTabs, ...tabsToAdd];
        tabsStore.setTabs(updatedTabs);

        if (!tabsStore.activeTab) {
          tabsStore.setActiveTab("tab-all-tickets");
        }
      }
      
      // Create or update tables
      // "All Tickets" tab first
      const allTicketsTab = (tabsToAdd.find(t => t.title === "All Tickets") || 
        existingTabs.find(t => t.title === "All Tickets"));
        
      if (allTicketsTab) {
        createTicketsTableForAllTickets(allTicketsTab.id, allTicketRows);
      }
      
      // Then update all status tabs
      const allTabs = [...existingTabs, ...tabsToAdd];
      allTabs.forEach((tab) => {
        if (tab.title !== "All Tickets" && tab.status) {
          createFilteredTable(tab.id, tab.status, allTicketRows);
        }
      });

      // Get the current workflow name for logging
      const workflowName = workflows.find(w => w.id === currentWorkflow)?.name || currentWorkflow;
      console.log(`Applied preset to ${workflowName} workflow`);

      // Add this workflow to the list of workflows with applied presets
      if (!appliedPresetWorkflows.includes(currentWorkflow)) {
        const updatedAppliedPresets = [...appliedPresetWorkflows, currentWorkflow];
        setAppliedPresetWorkflows(updatedAppliedPresets);
        // Save to localStorage
        localStorage.setItem("applied-preset-workflows", JSON.stringify(updatedAppliedPresets));
      }

      // STEP 9: No need to increment the refresh counter - we've done all the updates directly
      console.log("Preset applied successfully");
    } catch (error) {
      console.error(`Error applying preset to workflow ${currentWorkflow}:`, error);
      setTicketsError(
        error instanceof Error ? error : new Error("Failed to load tickets"),
      );
    } finally {
      setTicketsLoading(false);
      setIsDataFetchInProgress(false);
    }
  };

  // Helper function to create a table with all tickets
  const createTicketsTableForAllTickets = (tabId: string, ticketRows: Row[]) => {
    const tablesStore = useTablesStore.getState();
    const tabsStore = useTabsStore.getState();
    const presetTable = PRESET_TABLES["Engineering"];

    if (!presetTable) return;

    // Update table with new rows
    tablesStore.setTables({
      ...tablesStore.tables,
      [tabId]: {
        columns: [...presetTable.columns],
        rows: ticketRows,
      },
    });

    // Mark this tab with the applied preset - only if not already marked
    const currentTabs = tabsStore.tabs;
    const tabToUpdate = currentTabs.find(tab => tab.id === tabId);
    
    if (tabToUpdate && tabToUpdate.appliedPreset !== "Engineering") {
      const updatedTabs = currentTabs.map((tab) =>
        tab.id === tabId ? { ...tab, appliedPreset: "Engineering" } : tab,
      );
      tabsStore.setTabs(updatedTabs);
    }
  };

  // Helper function to create filtered tables based on the All Tickets tab
  const createFilteredTable = (tabId: string, status: string, allTicketRows: Row[]) => {
    const tablesStore = useTablesStore.getState();
    const tabsStore = useTabsStore.getState();
    const presetTable = PRESET_TABLES["Engineering"];

    if (!presetTable) return;

    // Filter rows by the status
    const filteredRows = allTicketRows.filter((row) => row.cells["col-7"] === status);

    // Update table with filtered rows
    tablesStore.setTables({
      ...tablesStore.tables,
      [tabId]: {
        columns: [...presetTable.columns],
        rows: filteredRows,
      },
    });

    // Mark this tab with the applied preset - only if not already marked
    const currentTabs = tabsStore.tabs;
    const tabToUpdate = currentTabs.find(tab => tab.id === tabId);
    
    if (tabToUpdate && tabToUpdate.appliedPreset !== "Engineering") {
      const updatedTabs = currentTabs.map((tab) =>
        tab.id === tabId ? { ...tab, appliedPreset: "Engineering" } : tab,
      );
      tabsStore.setTabs(updatedTabs);
    }
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
        part_ids: ticketData.part_ids || [], // Include part_ids from the ticket data
        workflow: ticketData.workflow || currentWorkflow, // Set the workflow from the form or current workflow
      };

      console.log("Formatted ticket data for creation:", {
        status_id: newTicketData.status_id,
        customer_id: newTicketData.customer_id,
        assignee_ids: newTicketData.assignee_ids,
        part_ids: newTicketData.part_ids,
        workflow: newTicketData.workflow,
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

      // Also update the current tab if applicable
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

  // Function to refresh all status-based tabs based on updated All Tickets data
  const refreshStatusTabs = (allTicketsRows: Row[]) => {
    // Get a reference to the tables store
    const tablesStore = useTablesStore.getState();
    const currentTables = tablesStore.tables;
    const updatedTables = { ...currentTables };
    const presetTable = PRESET_TABLES["Engineering"];

    if (!presetTable) return;

    // Loop through all tabs
    tabs.forEach((tab: { id: string; status?: string }) => {
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

  // Custom handleFieldChange to handle ticket status updates
  const handleFieldChange = async (field: string, value: string | number) => {
    // First, update the widget value in the widgets store
    // Check if this is a number field and value is empty string, convert to "0" instead of null
    const processedValue = (field === 'billable_hours' || field === 'total_hours') && value === '' 
      ? "0" // Convert empty string to "0" as a string to maintain type compatibility
      : value;
    
    useWidgetsStore.getState().handleFieldChange(field, processedValue.toString());

    // If this is a status change and we have a current ticket, update it in all tables
    if (field === "status" && ticketDialogHandlers.currentTicket) {
      const currentTicket = ticketDialogHandlers.currentTicket;
      const updatedTables = { ...tables };

      // Get the status ID for the selected label
      try {
        const allStatuses = await statusesService.getAllStatuses();
        const selectedStatus = allStatuses.find(status => status.label === processedValue);
        
        if (selectedStatus) {
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
                      "col-7": processedValue.toString(), // Update Status column with label
                    },
                    rawData: {
                      ...row.rawData,
                      status_id: selectedStatus.$id || selectedStatus.id, // Store the ID in rawData
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
                      "col-7": processedValue.toString(), // Update Status column with label
                    },
                    rawData: {
                      ...row.rawData,
                      status_id: selectedStatus.$id || selectedStatus.id, // Store the ID in rawData
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
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      }
    }
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
  const [newTicketData, setNewTicketData] = useState<TicketFormData>({
    status_id: "", // Will be set to "New" when statuses are loaded
    customer_id: "",
    primary_contact_id: "",
    description: "",
    billable_hours: 0,
    total_hours: 0,
    assignee_ids: [],
    attachments: [],
    part_ids: [],
    workflow: "", // New workflow field for tickets
  });
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([]);
  const [customerContactsLoading, setCustomerContactsLoading] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  // State for customer selection
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customersPage, setCustomersPage] = useState(1);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [customersTotalItems, setCustomersTotalItems] = useState(0);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [displayedCustomers, setDisplayedCustomers] = useState<Customer[]>([]);
  const customersLimit = 20; // Items per page

  // State for parts selection
  const [partsSearchQuery, setPartsSearchQuery] = useState("");
  const [partsPage, setPartsPage] = useState(1);
  const [partsTotalPages, setPartsTotalPages] = useState(1);
  const [partsTotalItems, setPartsTotalItems] = useState(0);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [displayedParts, setDisplayedParts] = useState<Part[]>([]);
  const partsLimit = 20; // Items per page

  // Customer selection dialog
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isParsDialogOpen, setIsParsDialogOpen] = useState(false);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const partsSearchInputRef = useRef<HTMLInputElement>(null);

  // Function to fetch contacts for a customer
  const fetchCustomerContacts = async (customerId: string) => {
    if (!customerId) return;
    
    try {
      setCustomerContactsLoading(true);
      console.log(`Fetching contacts for customer ID: ${customerId}`);
      const contacts = await fullCustomersService.getCustomerContacts(customerId);
      console.log(`Retrieved ${contacts.length} contacts for ticket form:`, contacts);
      setCustomerContacts(contacts);
    } catch (error) {
      console.error("Error fetching customer contacts:", error);
      setCustomerContacts([]);
    } finally {
      setCustomerContactsLoading(false);
    }
  };

  // Fetch statuses, customers, and users when component mounts or dialog opens
  useEffect(() => {
    const fetchTicketFormData = async () => {
      try {
        console.log("Fetching ticket form data...");

        // Fetch statuses
        const statusesData = await statusesService.getAllStatuses();
        console.log("Fetched statuses:", statusesData);
        setStatuses(statusesData);
        
        // Find the "New" status and set it as default
        const newStatus = statusesData.find(status => status.label === "New");
        if (newStatus && newStatus.$id) {
          console.log("Setting default status to 'New' with ID:", newStatus.$id);
          // Use setState callback to ensure we get the latest state
          setNewTicketData(prev => {
            const updated = {
              ...prev,
              status_id: newStatus.$id || ""
            };
            console.log("Updated ticket data with New status:", updated);
            return updated;
          });
        } else {
          console.log("Could not find 'New' status in:", statusesData);
        }

        // Fetch customers
        const customersResponse = await fullCustomersService.getAllCustomers();
        console.log("Fetched customers:", customersResponse);
        
        // Convert the customer data to match the expected format
        const formattedCustomers: Customer[] = customersResponse.customers.map(c => ({
          id: c.$id,
          name: c.name,
          address: c.address,
          primary_contact_name: c.primary_contact_name,
          primary_contact_number: c.primary_contact_number,
          primary_email: c.primary_email,
          abn: c.abn,
          $id: c.$id,
          $createdAt: c.$createdAt,
          $updatedAt: c.$updatedAt,
        }));
        
        setCustomers(formattedCustomers);
        // Initially set the first page of customers to display
        setDisplayedCustomers(formattedCustomers.slice(0, customersLimit));

        // Fetch users and map them to the expected format
        const usersData = await usersService.getAllUsers();
        console.log("Fetched users:", usersData);
        // Store the original ServiceUser objects
        setUsers(usersData);
        
        // Fetch parts
        const partsData = await partsService.getAllParts();
        console.log("Fetched parts:", partsData);
        setParts(partsData.parts);
        // Initially set the first page of parts to display
        setDisplayedParts(partsData.parts.slice(0, partsLimit));
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    };

    if (isAddTicketDialogOpen) {
      fetchTicketFormData();
    }
  }, [isAddTicketDialogOpen]);

  // Load customers with pagination and search
  const loadCustomers = async (page = 1, query = "") => {
    setIsLoadingCustomers(true);
    try {
      // Use the customer service's searchCustomers method for server-side search
      const result = await fullCustomersService.searchCustomers(
        query,
        "all", // Search in all fields
        page,
        customersLimit
      );
      
      // Map service Customer type to tickets Customer type
      const mappedCustomers: Customer[] = result.customers.map(c => ({
        id: c.$id, // Map $id to id
        name: c.name,
        address: c.address,
        primary_contact_name: c.primary_contact_name,
        primary_contact_number: c.primary_contact_number,
        primary_email: c.primary_email,
        abn: c.abn,
        $id: c.$id,
        $createdAt: c.$createdAt,
        $updatedAt: c.$updatedAt,
      }));
      
      setDisplayedCustomers(mappedCustomers);
      setCustomersTotalItems(result.total);
      setCustomersTotalPages(Math.ceil(result.total / customersLimit));
      setCustomers(prev => {
        // Merge with existing customers to maintain selected state
        const existingMap = new Map(prev.map(c => [c.$id, c]));
        mappedCustomers.forEach(c => existingMap.set(c.$id, c));
        return Array.from(existingMap.values());
      });
    } catch (error) {
      console.error("Error loading customers:", error);
      setDisplayedCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Load parts with pagination and search
  const loadParts = async (page = 1, query = "") => {
    setIsLoadingParts(true);
    try {
      // Use the parts service's searchParts method for server-side search
      const result = await partsService.searchParts(
        query,
        "all", // Search in all fields
        page,
        partsLimit
      );
      
      setDisplayedParts(result.parts);
      setPartsTotalItems(result.total);
      setPartsTotalPages(Math.ceil(result.total / partsLimit));
      setParts(prev => {
        // Merge with existing parts to maintain selected state
        const existingMap = new Map(prev.map(p => [p.$id, p]));
        result.parts.forEach(p => existingMap.set(p.$id, p));
        return Array.from(existingMap.values());
      });
    } catch (error) {
      console.error("Error loading parts:", error);
      setDisplayedParts([]);
    } finally {
      setIsLoadingParts(false);
    }
  };

  // Hook for customer search and pagination - only trigger on page change now
  useEffect(() => {
    if (isCustomerDialogOpen && customersPage > 1) {
      loadCustomers(customersPage, customerSearchQuery);
    }
  }, [isCustomerDialogOpen, customersPage]);

  // Hook for parts search and pagination - only trigger on page change now
  useEffect(() => {
    if (isParsDialogOpen && partsPage > 1) {
      loadParts(partsPage, partsSearchQuery);
    }
  }, [isParsDialogOpen, partsPage]);

  // Fetch customers and parts only when dialog first opens
  useEffect(() => {
    if (isAddTicketDialogOpen) {
      // Only fetch initial status options when dialog opens
      const fetchInitialData = async () => {
        try {
          console.log("Fetching ticket form initial data...");

          // Fetch statuses
          const statusesData = await statusesService.getAllStatuses();
          console.log("Fetched statuses:", statusesData);
          setStatuses(statusesData);
          
          // Find the "New" status and set it as default
          const newStatus = statusesData.find(status => status.label === "New");
          if (newStatus && newStatus.$id) {
            console.log("Setting default status to 'New' with ID:", newStatus.$id);
            // Use setState callback to ensure we get the latest state
            setNewTicketData(prev => {
              const updated = {
                ...prev,
                status_id: newStatus.$id || ""
              };
              console.log("Updated ticket data with New status:", updated);
              return updated;
            });
          } else {
            console.log("Could not find 'New' status in:", statusesData);
          }

          // Fetch users and map them to the expected format
          const usersData = await usersService.getAllUsers();
          console.log("Fetched users:", usersData);
          // Store the original ServiceUser objects
          setUsers(usersData);
          
        } catch (error) {
          console.error("Error fetching form data:", error);
        }
      };

      fetchInitialData();
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
    if (!statusId || statusId === "placeholder") {
      // Return "New" as the default display value
      const newStatus = statuses.find(s => s.label === "New");
      if (newStatus) {
        return "New";
      }
      return "Select status";
    }
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

  // Handle part selection
  const handlePartSelection = (partId: string) => {
    console.log("Toggling part selection for:", partId);
    setSelectedParts((prev) => {
      // If already selected, remove it
      if (prev.includes(partId)) {
        return prev.filter((id) => id !== partId);
      }
      // Otherwise add it
      return [...prev, partId];
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
      
      // Convert form data to ticket data (removing primary_contact_id)
      const baseTicketData = convertFormDataToTicket(newTicketData);
      
      // Create ticket data with uploaded files and selected assignees
      const ticketData = {
        ...baseTicketData,
        assignee_ids: selectedAssignees,
        attachments: uploadedFileIds, // Use the file IDs from storage
        part_ids: selectedParts, // Add the selected parts
        workflow: currentWorkflow // Set current workflow
      };
      
      console.log("Creating ticket with relationship fields:", {
        status_id: ticketData.status_id,
        customer_id: ticketData.customer_id,
        assignee_ids: ticketData.assignee_ids,
        part_ids: ticketData.part_ids,
        workflow: ticketData.workflow,
        attachments: ticketData.attachments,
      });
      
      // Create the ticket and update the UI
      const createdTicket = await handleCreateTicket(ticketData);
      
      // Create ticket assignments for each selected assignee
      if (createdTicket && createdTicket.id && selectedAssignees.length > 0) {
        console.log(`Creating ${selectedAssignees.length} ticket assignments for ticket ${createdTicket.id}`);
        
        // Create a ticket assignment for each assignee
        const assignmentPromises = selectedAssignees.map(assigneeId => 
          ticketAssignmentsService.createTicketAssignment({
            ticket_id: createdTicket.id,
            user_id: assigneeId,
            // Leave other fields empty by default
            work_description: '',
            estimated_time: '',
            actual_time: ''
          })
        );
        
        // Wait for all assignment creations to complete
        await Promise.all(assignmentPromises);
        console.log('All ticket assignments created successfully');
      }
      
      // Reset form data
      setNewTicketData({
        status_id: "",
        customer_id: "",
        primary_contact_id: "",
        description: "",
        billable_hours: 0,
        total_hours: 0,
        assignee_ids: [],
        attachments: [],
        part_ids: [],
        workflow: "", // New workflow field for tickets
      });
      setSelectedAssignees([]);
      setUploadedFiles([]);
      setSelectedParts([]); // Reset selected parts
      setCustomerContacts([]);
      
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
      // Find the "New" status ID first (if statuses are already loaded)
      const newStatus = statuses.find(status => status.label === "New");
      const newStatusId = newStatus?.$id || "";
      
      console.log("Resetting form with New status ID:", newStatusId);
      
      // Reset form when opening with "New" as default status if available
      setNewTicketData({
        status_id: newStatusId, // Keep "New" as the default status if available
        customer_id: "",
        primary_contact_id: "",
        description: "",
        billable_hours: 0,
        total_hours: 0,
        assignee_ids: [],
        attachments: [],
        part_ids: [],
        workflow: currentWorkflow // Set the current workflow
      });
      
      setSelectedAssignees([]);
      setUploadedFiles([]);
      setSelectedParts([]); // Reset selected parts
      setCustomerContacts([]);
      console.log("Form data reset when dialog opened");
    }
  }, [isAddTicketDialogOpen, statuses, currentWorkflow]);

  // Fetch all time entries - with deduplication and caching
  const fetchTimeEntries = async () => {
    // Return cached data if it's recent (less than 30 seconds old)
    const now = Date.now();
    const cacheAge = now - timeEntriesTimestamp;
    const CACHE_TTL = 30000; // 30 seconds
    
    if (timeEntries.length > 0 && cacheAge < CACHE_TTL) {
      console.log("Using cached time entries data", timeEntries.length, "entries");
      return timeEntries;
    }
    
    // Prevent multiple concurrent requests using state
    if (isLoadingTimeEntries) {
      console.log("Time entries already being fetched, waiting for completion...");
      // Return current data without waiting
      return timeEntries; 
    }
    
    // Set loading state first before any async operations
    setIsLoadingTimeEntries(true);
    
    try {
      console.log("Fetching time entries...");
      const entries = await timeEntriesService.getAllTimeEntries();
      console.log("Time entries received:", entries);
      
      // Create stable JSON representation for deep comparison
      const currentJSON = JSON.stringify(timeEntries);
      const newJSON = JSON.stringify(entries);
      
      // Only update state if the data has actually changed
      if (currentJSON !== newJSON) {
        console.log("Time entries have changed, updating state");
        // Only update state if component is still mounted (helps avoid memory leaks)
        setTimeEntries(entries);
        setTimeEntriesTimestamp(now);
      } else {
        console.log("Time entries unchanged, skipping state update");
        // Still update timestamp to avoid frequent refetching
        setTimeEntriesTimestamp(now);
      }
      
      return entries;
    } catch (error) {
      console.error("Error fetching time entries:", error);
      return [];
    } finally {
      // Make sure loading state is reset
      setIsLoadingTimeEntries(false);
    }
};

  // Function to set a contact as primary for a customer
  const setPrimaryContact = async (customerId: string, contact: CustomerContact) => {
    if (!customerId || !contact) return;
    
    try {
      // Update customer with primary contact info
      const updateData = {
        primary_contact_name: `${contact.first_name} ${contact.last_name}`,
        primary_contact_number: contact.contact_number,
        primary_email: contact.email,
      };
      
      // Update the customer record in Appwrite
      await ticketsCustomersService.updateCustomer(customerId, updateData);
      console.log(`Set ${contact.first_name} ${contact.last_name} as primary contact for customer ${customerId}`);
    } catch (error) {
      console.error("Error setting primary contact:", error);
    }
  };

  // Focus search input when dialog opens
  useEffect(() => {
    if (isCustomerDialogOpen && customerSearchInputRef.current) {
      setTimeout(() => {
        customerSearchInputRef.current?.focus();
      }, 100);
    }
  }, [isCustomerDialogOpen]);

  useEffect(() => {
    if (isParsDialogOpen && partsSearchInputRef.current) {
      setTimeout(() => {
        partsSearchInputRef.current?.focus();
      }, 100);
    }
  }, [isParsDialogOpen]);

  // Reset pagination when search query changes
  useEffect(() => {
    setCustomersPage(1);
  }, [customerSearchQuery]);

  useEffect(() => {
    setPartsPage(1);
  }, [partsSearchQuery]);

  // Make the refresh counter incrementor available globally
  // for child components to trigger workflow-filtered refreshes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).incrementTicketsRefreshCounter = () => {
        console.log('Incrementing tickets refresh counter from external call');
        setTicketsRefreshCounter(prev => prev + 1);
      };
    }
    
    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).incrementTicketsRefreshCounter;
      }
    };
  }, []);

  // Refresh data when workflow changes
  useEffect(() => {
    // Skip initial render
    if (isInitialWorkflowRender.current) {
      isInitialWorkflowRender.current = false;
      return;
    }
    
    const refreshWorkflowData = async () => {
      // Store the current workflow value to avoid closure issues
      const workflowValue = currentWorkflow;
      
      // Clear tables for the previous workflow
      const tablesStore = useTablesStore.getState();
      tablesStore.setTables({});
      
      // Reset tabs for the new workflow
      const tabsStore = useTabsStore.getState();
      tabsStore.setTabs([{
        id: "tab-all-tickets",
        title: "All Tickets",
      }]);
      tabsStore.setActiveTab("tab-all-tickets");
      
      // Check if preset was previously applied to this workflow
      const wasPresetApplied = appliedPresetWorkflows.includes(workflowValue);
      
      if (wasPresetApplied) {
        console.log(`Workflow ${workflowValue} had preset applied before, automatically reapplying`);
        // Wait a moment for state updates to complete
        setTimeout(async () => {
          await applyWorkflowPreset();
        }, 100);
      } else {
        // For workflows without presets, just create an empty table and stop loading
        console.log(`Workflow ${workflowValue} has no preset, creating empty table`);
        const presetTable = PRESET_TABLES["Engineering"];
        if (presetTable) {
          tablesStore.setTables({
            "tab-all-tickets": {
              columns: [...presetTable.columns],
              rows: [],
            },
          });
        }
        // Stop loading state immediately
        setTicketsLoading(false);
        setIsDataFetchInProgress(false);
      }
      
      console.log(`Switched to workflow: ${workflowValue}`);
    };
    
    // Only run this effect when currentWorkflow actually changes, not on initial render
    refreshWorkflowData();
    
    // Save current workflow to localStorage whenever it changes
    localStorage.setItem("current-workflow", currentWorkflow);
  }, [currentWorkflow, appliedPresetWorkflows]);

  // Modify the Reset button click handler
  const handleReset = async () => {
    try {
      setTicketsLoading(true);
      
      // First call the original resetTabs function
      resetTabs();
      
      // Then delete all statuses
      const allStatuses = await statusesService.getAllStatuses();
      console.log(`Deleting ${allStatuses.length} statuses from collection`);
      
      // Delete each status one by one
      for (const status of allStatuses) {
        if (status.$id) {
          await statusesService.deleteStatus(status.$id);
          console.log(`Deleted status ${status.label} with ID ${status.$id}`);
        }
      }
      
      // Remove this workflow from appliedPresetWorkflows
      setAppliedPresetWorkflows(prev => prev.filter(w => w !== currentWorkflow));
      
      // Increment the refresh counter to update the UI
      setTicketsRefreshCounter(prev => prev + 1);
      
      console.log("All statuses deleted successfully");
    } catch (error) {
      console.error("Error resetting data:", error);
      setTicketsError(error instanceof Error ? error : new Error("Failed to reset data"));
    } finally {
      setTicketsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold mr-2">Tickets</h1>
        <div className="flex space-x-2">
          {isAdmin && (
            <Button
              onClick={() => setIsAddTicketDialogOpen(true)}
              className="flex items-center gap-1 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              <Plus size={16} /> Add Ticket
            </Button>
          )}
          <Button
            onClick={applyWorkflowPreset}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Apply Preset to {workflows.find(w => w.id === currentWorkflow)?.name || "Current Workflow"}
          </Button>
          <Button
            onClick={handleReset}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-300"
          >
            Reset
          </Button>
        </div>
      </div>

      {ticketsError && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          Error loading tickets: {ticketsError.message}
        </div>
      )}

      {/* Workflow Tabs */}
      <div className="mb-6">
        <div className="flex items-center overflow-x-auto border-b">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="flex items-center"
            >
              <button
                className={`px-4 py-2 border-b-2 whitespace-nowrap ${
                  currentWorkflow === workflow.id
                    ? "border-blue-500 text-blue-600 font-medium"
                    : "border-transparent hover:border-gray-300"
                }`}
                onClick={() => {
                  // Only do work if changing to a different workflow
                  if (currentWorkflow !== workflow.id && !isDataFetchInProgress && !ticketsLoading) {
                    // Start loading state to prevent multiple clicks
                    setIsDataFetchInProgress(true);
                    setTicketsLoading(true);
                    
                    // Just set the current workflow - the useEffect will handle the rest
                    setCurrentWorkflow(workflow.id);
                    
                    // End loading state - the useEffect will handle data fetching
                    setTicketsLoading(false);
                    setIsDataFetchInProgress(false);
                  }
                }}
              >
                {workflow.name}
              </button>
              {isAdmin && workflow.id !== "engineering" && (
                <button
                  className="p-1 text-gray-400 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent tab switch
                    toast.custom(
                      (t) => (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border-2 border-gray-300 dark:border-gray-700">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-lg">
                            Delete Workflow
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 mb-4">
                            Are you sure you want to delete the "{workflow.name}" workflow?
                          </p>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => toast.dismiss(t)}
                              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                toast.dismiss(t);
                                // Remove from workflows list
                                setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
                                
                                // Remove from applied presets if it was there
                                setAppliedPresetWorkflows(prev => prev.filter(w => w !== workflow.id));
                                
                                // If this was the current workflow, switch to engineering
                                if (currentWorkflow === workflow.id) {
                                  setCurrentWorkflow("engineering");
                                }
                                
                                // Clear any tables for this workflow
                                const tablesStore = useTablesStore.getState();
                                const currentTables = { ...tablesStore.tables };
                                Object.keys(currentTables).forEach(key => {
                                  if (key.startsWith(`tab-${workflow.id}`)) {
                                    delete currentTables[key];
                                  }
                                });
                                tablesStore.setTables(currentTables);

                                // Show success message
                                toast.success(`Workflow "${workflow.name}" has been deleted`);
                              }}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ),
                      {
                        duration: Infinity,
                        position: "top-center",
                      }
                    );
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {isAdmin && (
            <button
              className="px-4 py-2 border-b-2 border-transparent text-gray-600 hover:border-gray-300 flex items-center"
              onClick={() => setIsNewWorkflowDialogOpen(true)}
            >
              <Plus size={16} className="mr-1" /> New Workflow
            </button>
          )}
        </div>
      </div>

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
        showAddButton={true}
      />

      <div className="mt-6">
        {ticketsError ? (
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
              onRowClick={(row) => ticketDialogHandlers.viewTicket(row, activeTab)}
              isLoading={ticketsLoading}
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
          // Reset search and pagination when dialog closes
          if (!open) {
            setCustomerSearchQuery("");
            setCustomersPage(1);
            setPartsSearchQuery("");
            setPartsPage(1);
          }
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
                    defaultValue={newTicketData.status_id || "placeholder"}
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
                      <SelectValue>
                        {newTicketData.status_id ? getStatusLabel(newTicketData.status_id) : "New"}
                      </SelectValue>
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

              {/* Customer - Simple Button + Dialog */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="customer_id" className="text-right text-sm font-medium">
                  Customer
                </label>
                <div className="col-span-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsCustomerDialogOpen(true);
                    }}
                  >
                    {newTicketData.customer_id
                      ? getCustomerName(newTicketData.customer_id)
                      : "Select customer..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </div>
              </div>

              {/* Customer Selection Dialog */}
              <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Select Customer</DialogTitle>
                    <DialogDescription>
                      Search and select the customer for this ticket.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={customerSearchInputRef}
                        placeholder="Search customers..."
                        className="pl-8"
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            loadCustomers(1, customerSearchQuery);
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={() => loadCustomers(1, customerSearchQuery)}
                      disabled={isLoadingCustomers}
                    >
                      Search
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto border rounded-md mb-4" style={{ maxHeight: "300px" }}>
                    {isLoadingCustomers ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-gray-500">Loading...</span>
                      </div>
                    ) : displayedCustomers.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No customers found</div>
                    ) : (
                      <div className="divide-y">
                        {displayedCustomers.map((customer) => (
                          <div
                            key={customer.$id}
                            className={`p-2 cursor-pointer hover:bg-gray-100 flex items-center ${
                              newTicketData.customer_id === customer.$id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              handleNewTicketFormChange("customer_id", customer.$id || "");
                              fetchCustomerContacts(customer.$id || "");
                              setIsCustomerDialogOpen(false);
                            }}
                          >
                            <Check
                              className={
                                newTicketData.customer_id === customer.$id
                                  ? "mr-2 h-4 w-4"
                                  : "mr-2 h-4 w-4 invisible"
                              }
                            />
                            <span>{customer.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Pagination control */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {customersTotalItems > 0 ? (
                          <>
                            Showing page {customersPage} of {customersTotalPages}
                            <span className="mx-1">·</span>
                            {customersTotalItems} total
                          </>
                        ) : (
                          "No results"
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomersPage(prev => Math.max(prev - 1, 1))}
                          disabled={customersPage <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: Math.min(3, customersTotalPages) }, (_, i) => {
                          // Show current page and surrounding pages
                          let pageToShow;
                          if (customersTotalPages <= 3) {
                            pageToShow = i + 1;
                          } else if (customersPage === 1) {
                            pageToShow = i + 1;
                          } else if (customersPage === customersTotalPages) {
                            pageToShow = customersTotalPages - 2 + i;
                          } else {
                            pageToShow = customersPage - 1 + i;
                          }
                          
                          return (
                            <Button
                              key={i}
                              variant={pageToShow === customersPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCustomersPage(pageToShow)}
                              className="h-8 w-8 p-0"
                            >
                              {pageToShow}
                            </Button>
                          );
                        })}
                        {customersTotalPages > 3 && customersPage < customersTotalPages - 1 && (
                          <span className="text-gray-500">...</span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomersPage(prev => prev < customersTotalPages ? prev + 1 : prev)}
                          disabled={customersPage >= customersTotalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Primary Contact */}
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="primary_contact_id" className="text-right text-sm font-medium">
                  Primary Contact
                </label>
                <div className="col-span-3">
                  <Select
                    value={newTicketData.primary_contact_id || "placeholder"}
                    onValueChange={(value) => {
                      if (value !== "placeholder") {
                        handleNewTicketFormChange("primary_contact_id", value);
                        
                        // Also update the customer's primary contact info in Appwrite
                        if (newTicketData.customer_id) {
                          const selectedContact = customerContacts.find(contact => contact.$id === value);
                          if (selectedContact) {
                            setPrimaryContact(newTicketData.customer_id, selectedContact);
                          }
                        }
                      }
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label="Select primary contact"
                    >
                      <SelectValue placeholder="Select primary contact" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border rounded-md shadow-md">
                      <SelectGroup>
                        <SelectItem value="placeholder" disabled>
                          {customerContactsLoading 
                            ? "Loading contacts..."
                            : "Select primary contact"
                          }
                        </SelectItem>
                        {customerContacts && customerContacts.length > 0 ? (
                          customerContacts.map((contact, index) => (
                            <SelectItem
                              key={contact.$id || `contact-${index}`}
                              value={
                                contact.$id
                                  ? contact.$id.toString()
                                  : `undefined-contact-${index}`
                              }
                            >
                              {contact.first_name} {contact.last_name} - {contact.email}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-contacts" disabled>
                            No contacts available
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
                <label className="text-right text-sm font-medium mt-2">Team Members</label>
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
                    <SelectTrigger className="w-full" aria-label="Select team members">
                      <SelectValue placeholder="Select team members" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border rounded-md shadow-md">
                      <SelectGroup>
                        <SelectItem value="placeholder" disabled>
                          Select team members
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
              
              {/* Parts - Simple Button + Dialog */}
              <div className="grid grid-cols-4 items-start gap-4">
                <label className="text-right text-sm font-medium mt-2">Parts</label>
                <div className="col-span-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsParsDialogOpen(true);
                    }}
                  >
                    {selectedParts.length > 0
                      ? `${selectedParts.length} part${selectedParts.length > 1 ? 's' : ''} selected`
                      : "Select parts..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>

                  {/* Show selected parts as tags */}
                  {selectedParts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedParts.map((id) => {
                        const part = parts.find((p) => p.$id === id);
                        if (!part) return null;

                        return (
                          <div
                            key={id}
                            className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm flex items-center"
                          >
                            {part.description} - {part.quantity}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedParts((prev) =>
                                  prev.filter((partId) => partId !== id),
                                )
                              }
                              className="ml-2 text-green-600 hover:text-green-800"
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

              {/* Parts Selection Dialog */}
              <Dialog open={isParsDialogOpen} onOpenChange={setIsParsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Select Parts</DialogTitle>
                    <DialogDescription>
                      Search and select parts for this ticket. You can select multiple parts.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={partsSearchInputRef}
                        placeholder="Search parts..."
                        className="pl-8"
                        value={partsSearchQuery}
                        onChange={(e) => setPartsSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            loadParts(1, partsSearchQuery);
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={() => loadParts(1, partsSearchQuery)}
                      disabled={isLoadingParts}
                    >
                      Search
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto border rounded-md mb-4" style={{ maxHeight: "300px" }}>
                    {isLoadingParts ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-gray-500">Loading...</span>
                      </div>
                    ) : displayedParts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No parts found</div>
                    ) : (
                      <div className="divide-y">
                        {displayedParts.map((part) => (
                          <div
                            key={part.$id}
                            className={`p-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                              selectedParts.includes(part.$id || "") ? 'bg-green-50' : ''
                            }`}
                            onClick={() => handlePartSelection(part.$id || "")}
                          >
                            <div className="flex items-center">
                              <Check
                                className={
                                  selectedParts.includes(part.$id || "")
                                    ? "mr-2 h-4 w-4"
                                    : "mr-2 h-4 w-4 invisible"
                                }
                              />
                              <span>{part.description}</span>
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {part.quantity} | ${part.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Pagination control */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {partsTotalItems > 0 ? (
                          <>
                            Showing page {partsPage} of {partsTotalPages}
                            <span className="mx-1">·</span>
                            {partsTotalItems} total
                          </>
                        ) : (
                          "No results"
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartsPage(prev => Math.max(prev - 1, 1))}
                          disabled={partsPage <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: Math.min(3, partsTotalPages) }, (_, i) => {
                          // Show current page and surrounding pages
                          let pageToShow;
                          if (partsTotalPages <= 3) {
                            pageToShow = i + 1;
                          } else if (partsPage === 1) {
                            pageToShow = i + 1;
                          } else if (partsPage === partsTotalPages) {
                            pageToShow = partsTotalPages - 2 + i;
                          } else {
                            pageToShow = partsPage - 1 + i;
                          }
                          
                          return (
                            <Button
                              key={i}
                              variant={pageToShow === partsPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPartsPage(pageToShow)}
                              className="h-8 w-8 p-0"
                            >
                              {pageToShow}
                            </Button>
                          );
                        })}
                        {partsTotalPages > 3 && partsPage < partsTotalPages - 1 && (
                          <span className="text-gray-500">...</span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartsPage(prev => prev < partsTotalPages ? prev + 1 : prev)}
                          disabled={partsPage >= partsTotalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsParsDialogOpen(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
        modifiedTimeEntries={ticketDialogHandlers.modifiedTimeEntries}
        usersWithAuthId={users}
      />

      {/* New Workflow Dialog */}
      <Dialog open={isNewWorkflowDialogOpen} onOpenChange={setIsNewWorkflowDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Enter a name for your new workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="workflow-name" className="text-right text-sm font-medium">
                Name
              </label>
              <Input
                id="workflow-name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Sales, Support, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setNewWorkflowName("");
                setIsNewWorkflowDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={() => {
                if (newWorkflowName.trim() && !isDataFetchInProgress && !ticketsLoading) {
                  // Start loading state
                  setIsDataFetchInProgress(true);
                  setTicketsLoading(true);
                  
                  try {
                    // Create workflow ID from name (lowercase, replace spaces with hyphens)
                    const workflowId = newWorkflowName.trim().toLowerCase().replace(/\s+/g, "-");
                    
                    // Add new workflow to state
                    setWorkflows(prev => [...prev, { id: workflowId, name: newWorkflowName.trim() }]);
                    
                    // Switch to the new workflow - the useEffect will handle the rest
                    setCurrentWorkflow(workflowId);
                    
                    // Reset the form
                    setNewWorkflowName("");
                    setIsNewWorkflowDialogOpen(false);
                    
                    console.log(`Created new workflow: ${workflowId}`);
                  } finally {
                    // End loading state - data will be fetched by the useEffect
                    setTicketsLoading(false);
                    setIsDataFetchInProgress(false);
                  }
                }
              }}
              disabled={!newWorkflowName.trim()}
            >
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Tickets;
