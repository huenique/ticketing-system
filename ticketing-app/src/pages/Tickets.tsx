import { useState, useEffect, Fragment } from "react"

// Define the Tab type
interface Tab {
  id: string
  title: string
  content: string
  isDragging?: boolean
}

// Define column and table types
interface Column {
  id: string
  title: string
  width?: string
  isDragging?: boolean
}

interface Row {
  id: string
  cells: Record<string, string>
}

interface Table {
  columns: Column[]
  rows: Row[]
}

// Presets for tables
const PRESET_TABLES: Record<string, Table> = {
  "Engineering": {
    columns: [
      { id: "col-1", title: "Ticket ID", width: "120px" },
      { id: "col-2", title: "Date Created", width: "120px" },
      { id: "col-3", title: "Customer Name", width: "150px" },
      { id: "col-4", title: "Work Description", width: "200px" },
      { id: "col-5", title: "Assign To", width: "120px" },
      { id: "col-6", title: "Parts Used", width: "150px" },
      { id: "col-7", title: "Status", width: "100px" },
      { id: "col-8", title: "Total Hours", width: "100px" },
      { id: "col-9", title: "Billable Hours", width: "100px" },
      { id: "col-10", title: "Last Modified", width: "120px" },
      { id: "col-11", title: "Actions", width: "100px" },
    ],
    rows: []
  }
}

// Define some mock data constants
const MOCK_CUSTOMERS = [
  "John Smith", "Emma Johnson", "Michael Williams", "Olivia Brown", "Robert Jones",
  "Sophia Miller", "William Davis", "Ava Wilson", "James Anderson", "Isabella Martinez"
]

const MOCK_ASSIGNEES = [
  "David Clark", "Sarah Lewis", "Thomas Walker", "Jennifer Hall", "Richard Young",
  "Elizabeth Allen", "Charles King", "Mary Wright", "Joseph Scott", "Patricia Green"
]

const MOCK_STATUSES = [
  "Open", "In Progress", "Waiting for Parts", "Pending Approval", "Completed"
]

const MOCK_PARTS = [
  "Compressor A-101", "Valve Set B-200", "Filter Unit C-300", "Circuit Board D-400", 
  "Pressure Gauge E-500", "Thermostat F-600", "Bearing Assembly G-700", "Motor H-800"
]

// Generate mock data for a row
const generateMockRowData = (rowIndex: number): Record<string, string> => {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  
  const randomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  
  const dateCreated = randomDate(weekAgo, today)
  const lastModified = randomDate(dateCreated, today)
  
  const randomCustomer = MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)]
  const randomAssignee = MOCK_ASSIGNEES[Math.floor(Math.random() * MOCK_ASSIGNEES.length)]
  const randomStatus = MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)]
  
  // Generate 1-3 random parts
  const randomPartCount = Math.floor(Math.random() * 3) + 1
  const randomParts = Array(randomPartCount).fill(0).map(() => 
    MOCK_PARTS[Math.floor(Math.random() * MOCK_PARTS.length)]
  ).join(", ")
  
  // Generate random hours
  const totalHours = (Math.random() * 10 + 1).toFixed(1)
  const billableHours = (Math.random() * parseFloat(totalHours)).toFixed(1)
  
  return {
    'col-1': `TK-${1000 + rowIndex}`, // Ticket ID
    'col-2': formatDate(dateCreated), // Date Created
    'col-3': randomCustomer, // Customer Name
    'col-4': `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`, // Work Description
    'col-5': randomAssignee, // Assign To
    'col-6': randomParts, // Parts Used
    'col-7': randomStatus, // Status
    'col-8': totalHours, // Total Hours
    'col-9': billableHours, // Billable Hours 
    'col-10': formatDate(lastModified), // Last Modified
    'col-11': 'action_buttons' // Actions
  }
}

function Tickets() {
  // Function to get saved data from localStorage
  const getSavedTabsData = () => {
    if (typeof window === "undefined") return { tabs: null, activeTab: null }
    
    const savedTabs = localStorage.getItem("ticket-tabs")
    const savedActiveTab = localStorage.getItem("ticket-active-tab")
    
    return {
      tabs: savedTabs ? JSON.parse(savedTabs) : null,
      activeTab: savedActiveTab || null,
    }
  }

  // Initialize tabs from localStorage or defaults
  const initialData = (() => {
    const { tabs, activeTab } = getSavedTabsData()
    return {
      tabs: tabs || [{ id: "tab-1", title: "All Tickets", content: "all" }],
      activeTab: activeTab || "tab-1"
    }
  })()

  // State for tabs and active tab
  const [tabs, setTabs] = useState<Tab[]>(initialData.tabs)
  const [activeTab, setActiveTab] = useState(initialData.activeTab)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTab, setDraggedTab] = useState<string | null>(null)
  const [editingTab, setEditingTab] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [tabsSaved, setTabsSaved] = useState(false)
  const [showPresetsMenu, setShowPresetsMenu] = useState(false)

  // State for tables (indexed by tab ID)
  const [tables, setTables] = useState<Record<string, Table | null>>({})
  const [editingColumn, setEditingColumn] = useState<{tabId: string, columnId: string} | null>(null)
  const [editingColumnTitle, setEditingColumnTitle] = useState("")
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [isDraggingColumn, setIsDraggingColumn] = useState(false)

  // Load tables from localStorage on initial render
  useEffect(() => {
    const savedTables = localStorage.getItem("ticket-tables")
    if (savedTables) {
      setTables(JSON.parse(savedTables))
    }
  }, [])

  // Manual save function with confirmation
  const saveTabs = () => {
    localStorage.setItem("ticket-tabs", JSON.stringify(tabs))
    localStorage.setItem("ticket-active-tab", activeTab)
    localStorage.setItem("ticket-tables", JSON.stringify(tables))
    setTabsSaved(true)
    // Reset notification after 3 seconds
    setTimeout(() => setTabsSaved(false), 3000)
  }

  // Reset to default tabs
  const resetTabs = () => {
    const defaultTabs: Tab[] = [{ id: "tab-1", title: "All Tickets", content: "all" }]
    setTabs(defaultTabs)
    setActiveTab("tab-1")
    setTables({})
    localStorage.setItem("ticket-tabs", JSON.stringify(defaultTabs))
    localStorage.setItem("ticket-active-tab", "tab-1")
    localStorage.setItem("ticket-tables", JSON.stringify({}))
  }

  // Handle tab dragging
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setIsDragging(true)
    setDraggedTab(tabId)
    e.dataTransfer.setData("text/plain", tabId)
    
    // Using setTimeout to allow the drag effect to show before applying styles
    setTimeout(() => {
      setTabs(prev => 
        prev.map(tab => tab.id === tabId 
          ? { ...tab, isDragging: true } 
          : tab
        )
      )
    }, 0)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggedTab(null)
    setTabs(prev => prev.map(tab => ({ ...tab, isDragging: false })))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    if (!draggedTab || draggedTab === targetTabId) return

    const draggedTabIndex = tabs.findIndex(tab => tab.id === draggedTab)
    const targetTabIndex = tabs.findIndex(tab => tab.id === targetTabId)
    
    // Reorder tabs
    const newTabs = [...tabs]
    const [draggedTabItem] = newTabs.splice(draggedTabIndex, 1)
    newTabs.splice(targetTabIndex, 0, draggedTabItem)
    
    setTabs(newTabs)
    setIsDragging(false)
    setDraggedTab(null)
  }

  // Add a new tab
  const addTab = () => {
    const newTabId = `tab-${tabs.length + 1}`
    const newTab: Tab = {
      id: newTabId,
      title: `Tickets ${tabs.length + 1}`,
      content: "all"
    }
    setTabs([...tabs, newTab])
    setActiveTab(newTabId)
  }

  // Close a tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length === 1) return // Don't close the last tab
    
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    
    // If we're closing the active tab, activate another tab
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id)
    }

    // Remove the table data for this tab
    const newTables = { ...tables }
    delete newTables[tabId]
    setTables(newTables)
  }

  // Handle double click to rename tab
  const handleDoubleClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    
    setEditingTab(tabId)
    setEditingTitle(tab.title)
  }
  
  // Save the new tab name
  const saveTabName = () => {
    if (!editingTab) return
    
    // Don't save empty titles
    if (editingTitle.trim() === "") {
      cancelTabRename()
      return
    }
    
    setTabs(prev => 
      prev.map(tab => tab.id === editingTab 
        ? { ...tab, title: editingTitle.trim() } 
        : tab
      )
    )
    setEditingTab(null)
    setEditingTitle("")
  }
  
  // Cancel the renaming
  const cancelTabRename = () => {
    setEditingTab(null)
    setEditingTitle("")
  }
  
  // Handle key press in input field
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveTabName()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelTabRename()
    }
  }

  // Table operations
  const createNewTable = (tabId: string) => {
    // Create a new table with default columns
    const newTable: Table = {
      columns: [
        { id: "col-1", title: "Ticket ID", width: "150px" },
        { id: "col-2", title: "Actions", width: "100px" }
      ],
      rows: []
    }
    
    setTables(prev => ({
      ...prev,
      [tabId]: newTable
    }))
  }

  const addColumn = (tabId: string) => {
    const table = tables[tabId]
    if (!table) return
    
    const newColumnId = `col-${table.columns.length + 1}`
    const newColumn: Column = {
      id: newColumnId,
      title: `Column ${table.columns.length + 1}`,
      width: "150px"
    }
    
    setTables(prev => ({
      ...prev,
      [tabId]: {
        ...table,
        columns: [...table.columns, newColumn]
      }
    }))
  }

  const addRow = (tabId: string) => {
    const table = tables[tabId]
    if (!table) return
    
    const newRowId = `row-${table.rows.length + 1}`
    const rowIndex = table.rows.length + 1
    
    // Generate mock data based on existing columns
    const cells: Record<string, string> = {}
    
    // If we have engineering columns, generate mock data
    if (table.columns.some(col => col.title === "Customer Name" || col.title === "Work Description")) {
      // This appears to be the engineering table format, generate structured mock data
      const mockData = generateMockRowData(rowIndex)
      
      // Map the mock data to the actual columns we have
      table.columns.forEach(column => {
        // Try to match by column ID first, then by title if exists in mock data
        if (mockData[column.id]) {
          cells[column.id] = mockData[column.id]
        } else {
          // Default empty string
          cells[column.id] = ''
        }
      })
    } else {
      // Simple table, just set Ticket ID and action buttons
      table.columns.forEach(column => {
        if (column.id === 'col-1') {
          cells[column.id] = `TK-${1000 + rowIndex}`
        } else if (column.id === 'col-11' || column.title === 'Actions') {
          cells[column.id] = 'action_buttons'
        } else {
          cells[column.id] = ''
        }
      })
    }
    
    const newRow: Row = {
      id: newRowId,
      cells
    }
    
    setTables(prev => ({
      ...prev,
      [tabId]: {
        ...table,
        rows: [...table.rows, newRow]
      }
    }))
  }

  const handleColumnDoubleClick = (tabId: string, columnId: string) => {
    const table = tables[tabId]
    if (!table) return
    
    const column = table.columns.find(col => col.id === columnId)
    if (!column) return
    
    setEditingColumn({ tabId, columnId })
    setEditingColumnTitle(column.title)
  }

  const saveColumnName = () => {
    if (!editingColumn) return
    
    const { tabId, columnId } = editingColumn
    const table = tables[tabId]
    if (!table) return
    
    // Don't save empty titles
    if (editingColumnTitle.trim() === "") {
      cancelColumnRename()
      return
    }
    
    setTables(prev => ({
      ...prev,
      [tabId]: {
        ...table,
        columns: table.columns.map(col => 
          col.id === columnId 
            ? { ...col, title: editingColumnTitle.trim() } 
            : col
        )
      }
    }))
    
    setEditingColumn(null)
    setEditingColumnTitle("")
  }

  const cancelColumnRename = () => {
    setEditingColumn(null)
    setEditingColumnTitle("")
  }

  const handleColumnRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveColumnName()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelColumnRename()
    }
  }

  // Column dragging handlers
  const handleColumnDragStart = (e: React.DragEvent, tabId: string, columnId: string) => {
    e.stopPropagation()
    setIsDraggingColumn(true)
    setDraggedColumn(columnId)
    e.dataTransfer.setData("text/plain", columnId)
    
    // Using setTimeout to allow the drag effect to show before applying styles
    setTimeout(() => {
      setTables(prev => {
        const table = prev[tabId]
        if (!table) return prev
        
        return {
          ...prev,
          [tabId]: {
            ...table,
            columns: table.columns.map(col => 
              col.id === columnId 
                ? { ...col, isDragging: true } 
                : col
            )
          }
        }
      })
    }, 0)
  }

  const handleColumnDragEnd = (tabId: string) => {
    setIsDraggingColumn(false)
    setDraggedColumn(null)
    
    setTables(prev => {
      const table = prev[tabId]
      if (!table) return prev
      
      return {
        ...prev,
        [tabId]: {
          ...table,
          columns: table.columns.map(col => ({ ...col, isDragging: false }))
        }
      }
    })
  }

  const handleColumnDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>, tabId: string, columnId: string) => {
    e.preventDefault()
    // We only need to prevent default to allow dropping
  }

  const handleColumnDrop = (e: React.DragEvent, tabId: string, targetColumnId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedColumn || draggedColumn === targetColumnId) return
    
    setTables(prev => {
      const table = prev[tabId]
      if (!table) return prev
      
      const draggedColumnIndex = table.columns.findIndex(col => col.id === draggedColumn)
      const targetColumnIndex = table.columns.findIndex(col => col.id === targetColumnId)
      
      if (draggedColumnIndex === -1 || targetColumnIndex === -1) return prev
      
      // Reorder columns
      const newColumns = [...table.columns]
      const [draggedColumnItem] = newColumns.splice(draggedColumnIndex, 1)
      
      // Simple swap - just place at target index
      newColumns.splice(targetColumnIndex, 0, draggedColumnItem)
      
      return {
        ...prev,
        [tabId]: {
          ...table,
          columns: newColumns
        }
      }
    })
    
    setIsDraggingColumn(false)
    setDraggedColumn(null)
  }

  // Apply preset table to current tab
  const applyPreset = (presetKey: string) => {
    if (!activeTab) return
    
    const presetTable = PRESET_TABLES[presetKey]
    if (!presetTable) return
    
    // Create a few mock rows
    const mockRows: Row[] = []
    for (let i = 0; i < 5; i++) {
      mockRows.push({
        id: `row-${i+1}`,
        cells: generateMockRowData(i+1)
      })
    }
    
    // Create a new table with the preset columns and mock rows
    setTables(prev => ({
      ...prev,
      [activeTab]: {
        columns: [...presetTable.columns],
        rows: mockRows
      }
    }))
    
    setShowPresetsMenu(false)
  }

  // Remove a column from the table
  const removeColumn = (tabId: string, columnId: string) => {
    const table = tables[tabId]
    if (!table) return
    
    // Don't allow removing if there's only one column left
    if (table.columns.length <= 1) return
    
    // Remove the column
    const newColumns = table.columns.filter(col => col.id !== columnId)
    
    // Update rows to remove the cell data for this column
    const newRows = table.rows.map(row => {
      const newCells = { ...row.cells }
      delete newCells[columnId]
      return { ...row, cells: newCells }
    })
    
    setTables(prev => ({
      ...prev,
      [tabId]: {
        columns: newColumns,
        rows: newRows
      }
    }))
  }

  // Render the content based on active tab
  const renderTabContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab)
    if (!activeTabData) return null

    const table = tables[activeTab]

    return (
      <div className="p-4">
        <div className="mb-4 flex justify-between">
          {!table ? (
            <div>
              <button
                onClick={() => createNewTable(activeTab)}
                className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
              >
                New Table
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              {/* Remove the Add Row button */}
            </div>
          )}
        </div>
        
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
                        onDoubleClick={() => handleColumnDoubleClick(activeTab, column.id)}
                        draggable={!editingColumn || editingColumn.columnId !== column.id}
                        onDragStart={(e) => handleColumnDragStart(e, activeTab, column.id)}
                        onDragEnd={() => handleColumnDragEnd(activeTab)}
                        onDragOver={(e) => handleColumnDragOver(e, activeTab, column.id)}
                        onDrop={(e) => handleColumnDrop(e, activeTab, column.id)}
                      >
                        {editingColumn && editingColumn.tabId === activeTab && editingColumn.columnId === column.id ? (
                          <input
                            type="text"
                            value={editingColumnTitle}
                            onChange={(e) => setEditingColumnTitle(e.target.value)}
                            onBlur={saveColumnName}
                            onKeyDown={handleColumnRenameKeyDown}
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
                            <button className="rounded bg-blue-100 p-1 text-blue-700 hover:bg-blue-200" title="Edit">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

  // Add CSS helper class for scrollbar hiding
  const styles = `
    /* Add custom style to remove scrollbars */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;

  return (
    <div className="space-y-4">
      {/* Add the style tag to hide scrollbars */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
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
                  {Object.keys(PRESET_TABLES).map(preset => (
                    <button
                      key={preset}
                      onClick={() => applyPreset(preset)}
                      className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                    >
                      {preset}
                    </button>
                  ))}
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
        {/* Tab bar */}
        <div className="flex items-center border-b bg-neutral-50">
          <div className="flex flex-1 items-center space-x-1 overflow-x-auto overflow-y-visible px-2 no-scrollbar">
            {tabs.map(tab => (
              <div
                key={tab.id}
                draggable={editingTab !== tab.id}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tab.id)}
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => handleDoubleClick(tab.id)}
                className={`group relative flex h-9 cursor-pointer items-center rounded-t-lg px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id 
                    ? 'bg-white border-l border-r border-t border-b-white -mb-px' 
                    : 'hover:bg-neutral-100 text-neutral-600'
                } ${tab.isDragging ? 'opacity-50' : ''}`}
              >
                {editingTab === tab.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={saveTabName}
                    onKeyDown={handleRenameKeyDown}
                    className="w-full min-w-[80px] bg-transparent px-0 py-0 outline-none focus:ring-0 border-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{tab.title}</span>
                )}
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 ${
                    tabs.length > 1 ? 'opacity-0 group-hover:opacity-100' : 'hidden'
                  }`}
                >
                  ×
                </button>
              </div>
            ))}
            {/* Add new tab button inline with tabs */}
            <div
              onClick={addTab}
              className="flex h-9 cursor-pointer items-center px-3 border-l border-neutral-200 text-neutral-500 hover:bg-neutral-100"
              title="Add new tab"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tab content */}
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Tickets 