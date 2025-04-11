// CSS Imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// React and Hooks
import { useEffect } from "react";

// Components
import TabNavigation from "../components/TabNavigation";
import TicketDialog from "../features/tickets/components/TicketDialog";
import { DataTable } from "../features/tickets/components/data-table";
import { columns } from "../features/tickets/components/columns";

// Utils and Hooks
import { getGridStyles, getScrollbarStyles, getSavedTabsData } from "../utils/ticketUtils";
import useTicketDialogHandlers from "../features/tickets/hooks/useTicketDialogHandlers";

// Zustand Stores
import useColumnsStore from "../stores/columnsStore";
import useTablesStore from "../stores/tablesStore";
import useTabsStore from "../stores/tabsStore";
import useUserStore from "../stores/userStore";
import useWidgetsStore from "../stores/widgetsStore";
import { useSettingsStore } from "../stores/settingsStore";

import { PRESET_TABLES } from "@/constants/tickets";
import { Row, Table } from "@/types/tickets";
import { generateMockRowData } from "@/utils/ticketUtils";

function Tickets() {
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
    addColumn,
    addRow,
    applyPreset,
    removeColumn,
  } = useTablesStore();

  // Settings Store
  const { statusOptions } = useSettingsStore();

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

  // Enhanced applyEngineeringPreset function that creates tabs based on statusOptions
  const applyEngineeringPreset = () => {
    // Clear existing tabs and tables
    const tabsStore = useTabsStore.getState();
    const tablesStore = useTablesStore.getState();
    
    // First create an "All Tickets" tab - with no specific status filter
    const allTicketsTab = {
      id: 'tab-all-tickets',
      title: 'All Tickets',
      // No status property - this tab will show everything
    };
    
    // Use all default status options to create tabs
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
    
    // First, create tickets for each status (one ticket per status)
    createTicketsForAllStatuses(allTicketsTab.id);
    
    // Apply Engineering preset to all the other tabs (they will filter data from "All Tickets")
    statusTabs.forEach(tab => {
      // Create table for each status tab
      createFilteredTable(tab.id, tab.status);
    });
  };
  
  // Helper function to create a table with tickets for all statuses
  const createTicketsForAllStatuses = (tabId: string) => {
    const tablesStore = useTablesStore.getState();
    const presetTable = PRESET_TABLES["Engineering"];
    
    if (!presetTable) return;
    
    // Get current user
    const currentUser = useUserStore.getState().currentUser;
    const currentUserName = currentUser?.name || "John Doe";
    
    // Create a ticket for each status (except "Awaiting Customer Response" and "Declined")
    const mockRows: Row[] = [];
    
    // Create tickets for the required statuses
    const requiredStatuses = ["New", "Awaiting Parts", "Open", "In Progress", "Completed"];
    const emptyTabStatuses = ["Awaiting Customer Response", "Declined"];
    
    for (let i = 0; i < requiredStatuses.length; i++) {
      // Generate basic row data
      const rowData = generateMockRowData(i + 1);
      
      // Set the specific status for this ticket
      rowData["col-7"] = requiredStatuses[i];
      
      // Set all tickets to be assigned to the current user
      rowData["col-5"] = currentUserName;
      
      // If status is "Completed", mark it as completed
      const completed = requiredStatuses[i] === "Completed";
      
      mockRows.push({
        id: `row-${i + 1}`,
        completed: completed,
        cells: rowData,
      });
    }
    
    // Update table with new rows
    tablesStore.setTables({
      ...tablesStore.tables,
      [tabId]: {
        columns: [...presetTable.columns],
        rows: mockRows,
      },
    });
    
    // Mark this tab with the applied preset
    const tabsStore = useTabsStore.getState();
    const updatedTabs = tabsStore.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, appliedPreset: "Engineering" } : tab
    );
    tabsStore.setTabs(updatedTabs);
  };
  
  // Helper function to create filtered tables based on the All Tickets tab
  const createFilteredTable = (tabId: string, status: string) => {
    const tablesStore = useTablesStore.getState();
    const allTicketsTable = tablesStore.tables["tab-all-tickets"];
    const presetTable = PRESET_TABLES["Engineering"];
    
    if (!presetTable) return;
    
    // For "Awaiting Customer Response" and "Declined" tabs, create empty tables
    const emptyTabStatuses = ["Awaiting Customer Response", "Declined"];
    if (emptyTabStatuses.includes(status)) {
      // Create an empty table for these status tabs
      tablesStore.setTables({
        ...tablesStore.tables,
        [tabId]: {
          columns: [...presetTable.columns],
          rows: [], // Empty rows array
        },
      });
    } else if (allTicketsTable) {
      // For other status tabs, filter rows from All Tickets
      const filteredRows = allTicketsTable.rows.filter((row) => 
        row.cells["col-7"] === status
      );
      
      // Update table with filtered rows
      tablesStore.setTables({
        ...tablesStore.tables,
        [tabId]: {
          columns: [...presetTable.columns],
          rows: filteredRows,
        },
      });
    }
    
    // Mark this tab with the applied preset
    const tabsStore = useTabsStore.getState();
    const updatedTabs = tabsStore.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, appliedPreset: "Engineering" } : tab
    );
    tabsStore.setTabs(updatedTabs);
  };

  // Mark task as done (general status update function)
  const markTaskAsDone = (tabId: string, rowId: string, completed: boolean) => {
    // Create a new tables object with the updated row
    const updatedTables = { ...tables };

    if (updatedTables[tabId]) {
      // Find and update the row
      updatedTables[tabId].rows = updatedTables[tabId].rows.map((row: any) => {
        if (row.id === rowId) {
          return {
            ...row,
            completed: completed,
            cells: {
              ...row.cells,
              "col-7": completed ? "Completed" : "In Progress", // Update Status column
            },
          };
        }
        return row;
      });

      // Update the global tables state
      useTablesStore.getState().setTables(updatedTables);

      // Save to localStorage
      localStorage.setItem("ticket-tables", JSON.stringify(updatedTables));
    }
  };

  // Use custom hook for ticket dialog functionality
  const ticketDialogHandlers = useTicketDialogHandlers(
    activeTab,
    tabs,
    tables,
    widgets,
    setWidgets,
    setWidgetLayouts,
    addWidget
  );

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
      const allTicketsTab = 'tab-all-tickets';
      if (updatedTables[allTicketsTab]) {
        // Find and update the row in the All Tickets tab
        updatedTables[allTicketsTab].rows = updatedTables[allTicketsTab].rows.map((row: any) => {
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
        });
      }
      
      // Also update the row in the current tab if it's not the All Tickets tab
      if (activeTab !== allTicketsTab && updatedTables[activeTab]) {
        updatedTables[activeTab].rows = updatedTables[activeTab].rows.map((row: any) => {
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
        });
      }
      
      // Update the global tables state
      useTablesStore.getState().setTables(updatedTables);
      
      // Refresh all status-based tabs with updated data
      refreshStatusTabs(updatedTables[allTicketsTab]?.rows || []);
    }
  };
  
  // Function to refresh all status-based tabs based on updated All Tickets data
  const refreshStatusTabs = (allTicketsRows: any[]) => {
    // Get a reference to the tables store
    const tablesStore = useTablesStore.getState();
    const currentTables = tablesStore.tables;
    const updatedTables = { ...currentTables };
    const presetTable = PRESET_TABLES["Engineering"];
    
    if (!presetTable) return;
    
    // Loop through all tabs
    tabs.forEach(tab => {
      // Skip the All Tickets tab
      if (tab.id === 'tab-all-tickets' || !tab.status) return;
      
      // Filter rows for this tab based on its status
      const filteredRows = allTicketsRows.filter((row) => 
        row.cells["col-7"] === tab.status
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

  // ===== Component Render =====
  return (
    <div className="space-y-4">
      {/* Add the style tags for scrollbar hiding and grid layout */}
      <style dangerouslySetInnerHTML={{ __html: getScrollbarStyles() }} />
      <style dangerouslySetInnerHTML={{ __html: getGridStyles() }} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-neutral-500">Manage your support tickets</p>
        </div>
        {currentUser?.role !== "user" && (
          <div className="flex space-x-2">
            {/* Add new Ticket button with plus icon */}
            <button
              onClick={() => (activeTab && tables[activeTab] ? addRow(activeTab) : null)}
              className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 flex items-center"
              disabled={!activeTab || !tables[activeTab]}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Ticket
            </button>

            {/* Presets dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  const tablesStore = useTablesStore.getState();
                  tablesStore.setShowPresetsMenu(!tablesStore.showPresetsMenu);
                }}
                className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Presets
              </button>

              {showPresetsMenu && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-neutral-200 bg-white shadow-lg">
                  <div className="p-2">
                    <div className="mb-2 border-b border-neutral-200 pb-1 pt-1 text-sm font-medium">
                      Table Presets
                    </div>
                    <button
                      onClick={() => applyEngineeringPreset()}
                      className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                    >
                      Engineering
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={saveTabs}
              className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
            >
              {tabsSaved ? "✓ Tabs Saved!" : "Save Tabs"}
            </button>

            <button
              onClick={resetTabs}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Reset Tabs
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {/* Tab bar - using the TabNavigation component */}
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

        {/* Tab content - using DataTable instead of TicketTable */}
        <div className="p-4">
          {activeTab && tables[activeTab] && (
            <DataTable
              columns={columns}
              data={tables[activeTab].rows || []}
              onRowClick={ticketDialogHandlers.handleInitializeTicketDialog}
              statusFilter={tabs.find(tab => tab.id === activeTab)?.status}
            />
          )}
        </div>
      </div>

      {/* Render TicketDialog component when dialog is open */}
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