// CSS Imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// React and Hooks
import { useEffect, useState } from "react";

import { PRESET_TABLES } from "@/constants/tickets";
import { Row, Ticket } from "@/types/tickets";
import { convertTicketToRow } from "@/utils/ticketUtils";
import { ticketsService } from "@/services/ticketsService";

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
import useUserStore from "../stores/userStore";
import useWidgetsStore from "../stores/widgetsStore";
// Utils and Hooks
import {
  getGridStyles,
  getSavedTabsData,
  getScrollbarStyles,
} from "../utils/ticketUtils";

function Tickets() {
  // State for Appwrite data loading
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<Error | null>(null);

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
    tabsSaved,
    showPresetsMenu,
    saveTabs,
    resetTabs,
    createNewTable,
    addRow,
  } = useTablesStore();

  // Settings Store
  const { statusOptions, fetchStatusOptions } = useSettingsStore();

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

  // User Store
  const { currentUser } = useUserStore();

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

  // Fetch status options from Appwrite when component mounts
  useEffect(() => {
    fetchStatusOptions();
  }, [fetchStatusOptions]);

  // Enhanced applyEngineeringPreset function that creates tabs based on statusOptions and uses real data
  const applyEngineeringPreset = async () => {
    try {
      // Start loading
      setTicketsLoading(true);
      setTicketsError(null);
      
      // Fetch tickets with relationships from Appwrite
      const ticketsWithRelationships = await ticketsService.getTicketsWithRelationships();
      
      // Clear existing tabs and tables
      const tabsStore = useTabsStore.getState();

      // First create an "All Tickets" tab - with no specific status filter
      const allTicketsTab = {
        id: "tab-all-tickets",
        title: "All Tickets",
        // No status property - this tab will show everything
      };

      // Use all status options to create tabs
      const statusTabs = statusOptions.map((status, index) => ({
        id: `tab-${index + 1}`,
        title: status,
        status: status, // Add status attribute to track which status this tab represents
      }));

      // Combine All Tickets tab with status tabs
      const newTabs = [allTicketsTab, ...statusTabs];

      // Reset all tabs first
      tabsStore.setTabs([]);

      // Set the new tabs
      tabsStore.setTabs(newTabs);

      // Set active tab to the All Tickets tab
      tabsStore.setActiveTab(allTicketsTab.id);

      // Convert tickets to rows
      const allTicketRows = ticketsWithRelationships.map(ticket => convertTicketToRow(ticket));
      
      // Create All Tickets tab with all tickets
      createTicketsTableForAllTickets(allTicketsTab.id, allTicketRows);

      // Then create filtered tables for each status tab
      statusTabs.forEach((tab) => {
        createFilteredTable(tab.id, tab.status, allTicketRows);
      });
      
      setTicketsLoading(false);
    } catch (error) {
      console.error("Error applying Engineering preset with real data:", error);
      setTicketsError(error instanceof Error ? error : new Error("Failed to load tickets"));
      setTicketsLoading(false);
    }
  };

  // Helper function to create a table with all tickets
  const createTicketsTableForAllTickets = (tabId: string, ticketRows: Row[]) => {
    const tablesStore = useTablesStore.getState();
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
    const filteredRows = allTicketRows.filter(
      (row) => row.cells["col-7"] === status,
    );

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
      const newTicketData: Omit<Ticket, 'id'> = {
        status_id: ticketData.status_id || "", // Default to empty, should be set by caller
        customer_id: ticketData.customer_id || "", // Default to empty, should be set by caller
        description: ticketData.description || "",
        billable_hours: ticketData.billable_hours || 0,
        total_hours: ticketData.total_hours || 0,
        assignee_ids: ticketData.assignee_ids || [],
        attachments: ticketData.attachments || []
      };
      
      // Create the ticket in Appwrite
      const createdTicket = await ticketsService.createTicket(newTicketData);
      
      // Fetch the complete ticket with relationships
      const ticketWithRelationships = await ticketsService.getTicketWithRelationships(createdTicket.id);
      
      // Convert to row format
      const newRow = convertTicketToRow(ticketWithRelationships);
      
      // Update the All Tickets tab
      const allTicketsTabId = "tab-all-tickets";
      if (tables[allTicketsTabId]) {
        const tablesStore = useTablesStore.getState();
        tablesStore.setTables({
          ...tables,
          [allTicketsTabId]: {
            ...tables[allTicketsTabId],
            rows: [...tables[allTicketsTabId].rows, newRow]
          }
        });
      }
      
      // Also update the current status tab if applicable
      const statusTabs = tabs.filter(tab => tab.status === ticketWithRelationships.status?.label);
      if (statusTabs.length > 0) {
        const statusTabId = statusTabs[0].id;
        if (tables[statusTabId]) {
          const tablesStore = useTablesStore.getState();
          tablesStore.setTables({
            ...tables,
            [statusTabId]: {
              ...tables[statusTabId],
              rows: [...tables[statusTabId].rows, newRow]
            }
          });
        }
      }
      
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
      setTicketsLoading(true);
      
      // Fetch fresh data
      const ticketsWithRelationships = await ticketsService.getTicketsWithRelationships();
      
      // Convert to rows
      const allTicketRows = ticketsWithRelationships.map(ticket => convertTicketToRow(ticket));
      
      // Update All Tickets tab
      createTicketsTableForAllTickets("tab-all-tickets", allTicketRows);
      
      // Update status tabs
      tabs.forEach(tab => {
        if (tab.status) {
          createFilteredTable(tab.id, tab.status, allTicketRows);
        }
      });
      
      setTicketsLoading(false);
    } catch (error) {
      console.error("Error refreshing tickets data:", error);
      setTicketsError(error instanceof Error ? error : new Error("Failed to refresh tickets"));
      setTicketsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <div className="flex space-x-2">
          <button
            onClick={applyEngineeringPreset}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Apply Engineering Preset
          </button>
          <button
            onClick={resetTabs}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-300"
          >
            Reset
          </button>
          <button
            onClick={refreshTicketsData}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            disabled={ticketsLoading}
          >
            {ticketsLoading ? "Loading..." : "Refresh Data"}
          </button>
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
        {/* Only render if we have a table for the active tab */}
        {currentTable ? (
          <DataTable
            columns={columns}
            data={currentTable.rows}
            onRowClick={ticketDialogHandlers.handleInitializeTicketDialog}
            statusFilter={tabs.find((tab) => tab.id === activeTab)?.status}
          />
        ) : (
          <div className="text-center py-10">
            <p className="text-neutral-500">No table for this tab yet</p>
          </div>
        )}
      </div>

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
