import { useState, useEffect, Fragment } from "react"
import { Layout, Layouts, Responsive, WidthProvider } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
// Import components
import TabNavigation from "../components/TabNavigation"
import TicketWidget from "../components/TicketWidget"
// Import hooks
import { useTickets } from "../hooks/useTickets"
import { useTabs } from "../hooks/useTabs"
import { useColumns } from "../hooks/useColumns"
import { useWidgets } from "../hooks/useWidgets"
// Import types, constants and utilities
import { Row, Table, Widget, Assignee, TimeEntry, TicketForm } from "../types/tickets"
import { WIDGET_TYPES } from "../constants/tickets"
import { getSavedTabsData, getGridStyles, getScrollbarStyles } from "../utils/ticketUtils"

const ResponsiveGridLayout = WidthProvider(Responsive)

function Tickets() {
  // Initialize data from localStorage
  const initialData = (() => {
    const { tabs, activeTab } = getSavedTabsData()
    return {
      tabs: tabs || [{ id: "tab-1", title: "All Tickets", content: "all" }],
      activeTab: activeTab || "tab-1"
    }
  })()
  
  // State for ticket view dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<Row | null>(null)
  const [ticketForm, setTicketForm] = useState<TicketForm>({
    status: '',
    description: '',
    billableHours: '',
    totalHours: '',
  })
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [assigneeTableTitle, setAssigneeTableTitle] = useState("Assigned Team Members")
  const [editingAssigneeTableTitle, setEditingAssigneeTableTitle] = useState(false)
  const [newAssignee, setNewAssignee] = useState<Assignee>({
    id: "",
    name: "",
    workDescription: "",
    totalHours: "0",
    estTime: "0"
  })
  const [showAssigneeForm, setShowAssigneeForm] = useState(false)

  // Use hooks
  const {
    tables,
    setTables,
    tabsSaved,
    showPresetsMenu,
    setShowPresetsMenu,
    saveTabs,
    resetTabs,
    createNewTable,
    addColumn,
    addRow,
    applyPreset,
    removeColumn,
    initializeTicketDialog,
    saveTicketChanges
  } = useTickets()

  const {
    tabs,
    setTabs,
    activeTab,
    setActiveTab,
    isDragging,
    draggedTab,
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
    saveTabName,
    handleRenameKeyDown
  } = useTabs(initialData.tabs, initialData.activeTab)

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
    handleColumnDrop
  } = useColumns()

  const {
    widgets,
    setWidgets,
    widgetLayouts,
    setWidgetLayouts,
    handleWidgetDragStart,
    handleWidgetDragEnd,
    handleWidgetDragOver,
    handleWidgetDrop,
    toggleWidgetCollapse,
    addWidget,
    removeWidget,
    onLayoutChange,
    handleFieldChange
  } = useWidgets(ticketForm)

  // Load tables from localStorage on initial render
  useEffect(() => {
    const savedTables = localStorage.getItem("ticket-tables")
    if (savedTables) {
      setTables(JSON.parse(savedTables))
    }
  }, [])

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    // In a real app, you would upload these files to a server
    // For demo purposes, we'll just create URLs for the images
    const newImages = Array.from(files).map(file => URL.createObjectURL(file))
    setUploadedImages(prev => [...prev, ...newImages])
  }

  // Handle adding a new assignee
  const handleAddAssignee = () => {
    if (newAssignee.name.trim() === '') return
    
    const assigneeId = `a${Date.now()}`
    const assigneeToAdd: Assignee = {
      ...newAssignee,
      id: assigneeId
    }
    
    setAssignees(prev => [...prev, assigneeToAdd])
    setNewAssignee({
      id: "",
      name: "",
      workDescription: "",
      totalHours: "0",
      estTime: "0"
    })
    setShowAssigneeForm(false)
  }

  // Handle removing an assignee
  const handleRemoveAssignee = (id: string) => {
    setAssignees(prev => prev.filter(a => a.id !== id))
    // Also remove related time entries
    setTimeEntries(prev => prev.filter(t => t.assigneeId !== id))
  }

  // Handle updating an assignee
  const handleUpdateAssignee = (id: string, field: keyof Assignee, value: string) => {
    setAssignees(prev => 
      prev.map(a => 
        a.id === id 
          ? { ...a, [field]: value } 
          : a
      )
    )
  }

  // Handle adding a time entry for an assignee
  const handleAddTimeEntry = (assigneeId: string) => {
    const assignee = assignees.find(a => a.id === assigneeId)
    if (!assignee) return
    
    const now = new Date()
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const formattedDate = now.toLocaleDateString()
    
    const newTimeEntry: TimeEntry = {
      id: `t${Date.now()}`,
      assigneeId,
      assigneeName: assignee.name,
      startTime: formattedTime,
      stopTime: "",
      duration: "0",
      dateCreated: formattedDate,
      remarks: ""
    }
    
    setTimeEntries(prev => [...prev, newTimeEntry])
  }

  // Handle updating a time entry
  const handleUpdateTimeEntry = (id: string, field: keyof TimeEntry, value: string) => {
    setTimeEntries(prev => 
      prev.map(entry => {
        if (entry.id === id) {
          const updatedEntry = { ...entry, [field]: value }
          
          // Recalculate duration if start or stop time changes
          if (field === 'startTime' || field === 'stopTime') {
            if (updatedEntry.startTime && updatedEntry.stopTime) {
              // Parse times (assuming format is HH:MM)
              const [startHours, startMinutes] = updatedEntry.startTime.split(':').map(Number)
              const [stopHours, stopMinutes] = updatedEntry.stopTime.split(':').map(Number)
              
              // Calculate duration in hours
              let durationHours = stopHours - startHours
              let durationMinutes = stopMinutes - startMinutes
              
              if (durationMinutes < 0) {
                durationHours -= 1
                durationMinutes += 60
              }
              
              if (durationHours < 0) {
                // Assuming stop time is next day if it's earlier than start time
                durationHours += 24
              }
              
              const totalDuration = durationHours + (durationMinutes / 60)
              updatedEntry.duration = totalDuration.toFixed(1)
            }
          }
          
          return updatedEntry
        }
        return entry
      })
    )
  }

  // Handle removing a time entry
  const handleRemoveTimeEntry = (id: string) => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== id))
  }

  // Initialize the ticket dialog
  const handleInitializeTicketDialog = (ticket: Row) => {
    initializeTicketDialog(
      ticket,
      setCurrentTicket,
      setTicketForm,
      setUploadedImages,
      setAssignees,
      setTimeEntries,
      setAssigneeTableTitle,
      setWidgets,
      setWidgetLayouts,
      setViewDialogOpen
    )
  }

  // Save ticket changes
  const handleSaveTicketChanges = () => {
    saveTicketChanges(currentTicket, ticketForm, setViewDialogOpen)
  }

  // Modified renderTabContent function to use the refactored structure
  const renderTabContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab)
    if (!activeTabData) return null

    const table = tables[activeTab]

    return (
      <div className="p-4">
        {!table ? (
          <div className="flex justify-center items-center py-16">
            <button
              onClick={() => createNewTable(activeTab)}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-md transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create New Table</span>
            </button>
          </div>
        ) : (
          <div className="mb-4 flex space-x-2">
            {/* Placeholder for action buttons if needed */}
          </div>
        )}
        
        {table && (
          <div className="rounded-lg border overflow-x-auto relative">
            <table className="w-full">
              <thead className="bg-neutral-50 text-sm text-neutral-600">
                <tr className="relative">
                  {table.columns.map((column, index) => (
                    <Fragment key={column.id}>
                      <th 
                        className={`group border-b px-4 py-2 text-left font-medium cursor-grab ${column.isDragging ? 'opacity-50 bg-neutral-100' : ''}`}
                        style={{ width: column.width }}
                        onDoubleClick={() => handleColumnDoubleClick(activeTab, column.id, tables)}
                        draggable={!editingColumn || editingColumn.columnId !== column.id}
                        onDragStart={(e) => handleColumnDragStart(e, activeTab, column.id, tables, setTables)}
                        onDragEnd={() => handleColumnDragEnd(activeTab, tables, setTables)}
                        onDragOver={(e) => handleColumnDragOver(e, activeTab, column.id)}
                        onDrop={(e) => handleColumnDrop(e, activeTab, column.id, tables, setTables)}
                      >
                        {editingColumn && editingColumn.tabId === activeTab && editingColumn.columnId === column.id ? (
                          <input
                            type="text"
                            value={editingColumnTitle}
                            onChange={(e) => setEditingColumnTitle(e.target.value)}
                            onBlur={() => saveColumnName(tables, setTables)}
                            onKeyDown={(e) => handleColumnRenameKeyDown(e, tables, setTables)}
                            className="w-full min-w-[80px] bg-transparent px-0 py-0 outline-none focus:ring-0 border-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onDragStart={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <span className="mr-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              </span>
                              {column.title}
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {/* Remove column button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  removeColumn(activeTab, column.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 h-4 w-4 text-neutral-400 hover:text-red-500 transition-colors"
                                title="Remove column"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              
                              {/* Add column button (only on last column) */}
                              {index === table.columns.length - 1 && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    addColumn(activeTab);
                                  }}
                                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-500 hover:bg-blue-100 hover:text-blue-600 transition-colors shadow-sm border border-neutral-200"
                                  title="Add column"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map(row => (
                  <tr key={row.id} className="border-b hover:bg-neutral-50">
                    {table.columns.map(column => (
                      <td key={`${row.id}-${column.id}`} className="px-4 py-3">
                        {column.id === 'col-11' || column.title === 'Actions' || row.cells[column.id] === 'action_buttons' ? (
                          <div className="flex space-x-2">
                            <button 
                              className="rounded bg-blue-100 p-1 text-blue-700 hover:bg-blue-200" 
                              title="View Ticket"
                              onClick={() => handleInitializeTicketDialog(row)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          row.cells[column.id] || ""
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.rows.length === 0 && (
                  <tr>
                    <td colSpan={table.columns.length} className="px-4 py-8 text-center text-neutral-500">
                      No rows yet. Click "Add Row" to create a new row.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Main component render
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
            onClick={() => activeTab && tables[activeTab] ? addRow(activeTab) : null}
            className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 flex items-center"
            disabled={!activeTab || !tables[activeTab]}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ticket
          </button>
          
          {/* Presets dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowPresetsMenu(prev => !prev)}
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
                    onClick={() => applyPreset("Engineering")}
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
          onTabClick={setActiveTab}
          onAddTabClick={addTab}
          onCloseTabClick={(id, e) => closeTab(id, e, tables, setTables)}
          onDoubleClick={handleDoubleClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onEditingTitleChange={(e) => setEditingTitle(e.target.value)}
          onRenameKeyDown={handleRenameKeyDown}
        />
        
        {/* Tab content */}
        {renderTabContent()}
      </div>
      
      {/* Custom dialog for ticket view */}
      {viewDialogOpen && currentTicket && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/30 p-4 overflow-y-auto"
          onClick={() => setViewDialogOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          >
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Ticket Details (ID: {currentTicket.cells['col-1']})
                </h2>
              </div>
              <button 
                onClick={() => setViewDialogOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {(() => {
                const currentTab = tabs.find(tab => tab.id === activeTab);
                if (currentTab?.appliedPreset === "Engineering" || widgets.length > 0) {
                  // Show widget grid layout
                  return (
                    <>
                      {/* ResponsiveGridLayout for widgets */}
                      <div className="w-full relative">
                        <ResponsiveGridLayout
                          className="layout"
                          layouts={widgetLayouts}
                          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
                          cols={{ lg: 12, md: 6, sm: 6, xs: 4 }}
                          rowHeight={60}
                          onLayoutChange={onLayoutChange}
                          isDraggable
                          isResizable
                          margin={[15, 15]}
                          containerPadding={[0, 0]}
                          preventCollision={false}
                          compactType="vertical"
                          useCSSTransforms={true}
                          draggableHandle=".widget-drag-handle"
                        >
                          {widgets.map(widget => (
                            <div key={widget.id} className="widget-container">
                              <TicketWidget 
                                widget={widget}
                                ticketForm={ticketForm}
                                currentTicket={currentTicket}
                                handleFieldChange={handleFieldChange}
                                toggleWidgetCollapse={toggleWidgetCollapse}
                                removeWidget={removeWidget}
                                handleWidgetDragStart={handleWidgetDragStart}
                                handleWidgetDragEnd={handleWidgetDragEnd}
                                handleWidgetDragOver={handleWidgetDragOver}
                                handleWidgetDrop={handleWidgetDrop}
                                assignees={assignees}
                                timeEntries={timeEntries}
                                uploadedImages={uploadedImages}
                                handleAddAssignee={handleAddAssignee}
                                handleRemoveAssignee={handleRemoveAssignee}
                                handleUpdateAssignee={handleUpdateAssignee}
                                handleAddTimeEntry={handleAddTimeEntry}
                                handleRemoveTimeEntry={handleRemoveTimeEntry}
                                handleUpdateTimeEntry={handleUpdateTimeEntry}
                                setTicketForm={setTicketForm}
                                handleImageUpload={handleImageUpload}
                                setUploadedImages={setUploadedImages}
                                showAssigneeForm={showAssigneeForm}
                                setShowAssigneeForm={setShowAssigneeForm}
                                newAssignee={newAssignee}
                                setNewAssignee={setNewAssignee}
                              />
                            </div>
                          ))}
                        </ResponsiveGridLayout>
                      </div>
                      
                      {/* Add widget button */}
                      <div className="mt-6 flex justify-center">
                        <div className="relative">
                          <button 
                            className="flex items-center space-x-1 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                            onClick={() => {
                              const dropdown = document.getElementById('widget-dropdown');
                              if (dropdown) {
                                dropdown.classList.toggle('hidden');
                              }
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Add Widget</span>
                          </button>
                          
                          <div id="widget-dropdown" className="absolute left-0 right-0 mt-2 hidden rounded-md border border-neutral-200 bg-white shadow-lg z-10">
                            <div className="py-1">
                              <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">Groups</div>
                              {/* Widget type buttons for group widgets */}
                              {[
                                { type: WIDGET_TYPES.DETAILS, label: "Ticket Details" },
                                { type: WIDGET_TYPES.ASSIGNEES, label: "Team Members" },
                                { type: WIDGET_TYPES.TIME_ENTRIES, label: "Time Entries" },
                                { type: WIDGET_TYPES.ATTACHMENTS, label: "Attachments" },
                                { type: WIDGET_TYPES.NOTES, label: "Notes" }
                              ].map(item => (
                                <button 
                                  key={item.type}
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                  onClick={() => {
                                    addWidget(item.type, currentTicket);
                                    document.getElementById('widget-dropdown')?.classList.add('hidden');
                                  }}
                                >
                                  {item.label}
                                </button>
                              ))}
                              
                              <div className="my-1 border-t border-neutral-200"></div>
                              <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">Individual Fields</div>
                              
                              {/* Widget type buttons for field widgets */}
                              {[
                                { type: WIDGET_TYPES.FIELD_STATUS, label: "Status Field" },
                                { type: WIDGET_TYPES.FIELD_CUSTOMER_NAME, label: "Customer Name Field" },
                                { type: WIDGET_TYPES.FIELD_DATE_CREATED, label: "Date Created Field" },
                                { type: WIDGET_TYPES.FIELD_LAST_MODIFIED, label: "Last Modified Field" },
                                { type: WIDGET_TYPES.FIELD_BILLABLE_HOURS, label: "Billable Hours Field" },
                                { type: WIDGET_TYPES.FIELD_TOTAL_HOURS, label: "Total Hours Field" },
                                { type: WIDGET_TYPES.FIELD_DESCRIPTION, label: "Description Field" }
                              ].map(item => (
                                <button 
                                  key={item.type}
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                  onClick={() => {
                                    addWidget(item.type, currentTicket);
                                    document.getElementById('widget-dropdown')?.classList.add('hidden');
                                  }}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                } else {
                  // For blank slate, show the option to add widgets
                  return (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="p-6 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 max-w-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <h3 className="text-lg font-medium text-neutral-700 mb-2">
                            Customize Your Ticket Layout
                          </h3>
                          <p className="text-neutral-500 mb-6">
                            This ticket doesn't have any widgets yet. Add widgets to create your custom layout.
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <button 
                              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                              onClick={() => addWidget(WIDGET_TYPES.DETAILS, currentTicket)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Details Widget
                            </button>
                            <button 
                              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                              onClick={() => {
                                // Create a layout with individual field widgets
                                
                                // Add status field
                                addWidget(WIDGET_TYPES.FIELD_STATUS, currentTicket);
                                
                                // Add customer name field
                                addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME, currentTicket);
                                
                                // Add date fields in a row
                                addWidget(WIDGET_TYPES.FIELD_DATE_CREATED, currentTicket);
                                addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED, currentTicket);
                                
                                // Add hour fields
                                addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS, currentTicket);
                                addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS, currentTicket);
                                
                                // Add description
                                addWidget(WIDGET_TYPES.FIELD_DESCRIPTION, currentTicket);
                                
                                // Add larger widgets
                                addWidget(WIDGET_TYPES.ASSIGNEES, currentTicket);
                                addWidget(WIDGET_TYPES.TIME_ENTRIES, currentTicket);
                                addWidget(WIDGET_TYPES.ATTACHMENTS, currentTicket);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                              </svg>
                              Use Default Layout
                            </button>
                            <button 
                              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                              onClick={() => addWidget(WIDGET_TYPES.FIELD_STATUS, currentTicket)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Form Field
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="border-t p-4 flex justify-end space-x-3">
              <button
                onClick={() => setViewDialogOpen(false)}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTicketChanges}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tickets 