// CSS Imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// React and Hooks
import { useEffect } from "react";

// Components
import TabNavigation from "../components/TabNavigation";
import TicketDialog from "../features/tickets/components/TicketDialog";
import TicketTable from "../features/tickets/components/TicketTable";

// Utils and Hooks
import { getGridStyles, getScrollbarStyles, getSavedTabsData } from "../utils/ticketUtils";
import useTicketDialogHandlers from "../features/tickets/hooks/useTicketDialogHandlers";

// Zustand Stores
import useColumnsStore from "../stores/columnsStore";
import useTablesStore from "../stores/tablesStore";
import useTabsStore from "../stores/tabsStore";
import useUserStore from "../stores/userStore";
import useWidgetsStore from "../stores/widgetsStore";

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

  // Columns Store
  const {
    editingColumn,
    editingColumnTitle,
    setEditingColumnTitle,
    handleColumnDoubleClick,
    saveColumnName,
    handleColumnRenameKeyDown,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  } = useColumnsStore();

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
    handleFieldChange,
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

  // Mark task as done (used in Task tab)
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
              "col-6": completed ? "Completed" : "In Progress", // Update Status column
            },
          };
        }
        return row;
      });

      // Update the global tables state
      useTablesStore.getState().setTables(updatedTables);

      // Save to localStorage
      localStorage.setItem("ticket-tables", JSON.stringify(updatedTables));

      // If this is the Tasks tab, also update the corresponding team member in the All Tickets tab
      const currentTabData = tabs.find((tab) => tab.id === tabId);
      if (currentTabData?.title === "Tasks") {
        // Find the All Tickets tab
        const allTicketsTab = tabs.find((tab) => tab.title === "All Tickets");
        if (allTicketsTab) {
          // Get the ticket ID and assignee name from the row
          const taskRow = updatedTables[tabId].rows.find(
            (row: any) => row.id === rowId,
          );
          if (taskRow) {
            const ticketId = taskRow.cells["col-1"];
            const assigneeName = taskRow.cells["col-2"]; // Assuming assignee name is in col-2
          }
        }
      }
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
                    onClick={() => applyPreset("Engineering", activeTab)}
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

        {/* Tab content - using TicketTable */}
        <TicketTable
          activeTab={activeTab}
          tabs={tabs}
          tables={tables}
          currentUser={currentUser}
          editingColumn={editingColumn}
          editingColumnTitle={editingColumnTitle}
          handleColumnDoubleClick={handleColumnDoubleClick}
          handleColumnDragStart={handleColumnDragStart}
          handleColumnDragEnd={handleColumnDragEnd}
          handleColumnDragOver={handleColumnDragOver}
          handleColumnDrop={handleColumnDrop}
          setEditingColumnTitle={setEditingColumnTitle}
          saveColumnName={saveColumnName}
          handleColumnRenameKeyDown={handleColumnRenameKeyDown}
          removeColumn={removeColumn}
          addColumn={addColumn}
          markTaskAsDone={markTaskAsDone}
          handleInitializeTicketDialog={ticketDialogHandlers.handleInitializeTicketDialog}
        />
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