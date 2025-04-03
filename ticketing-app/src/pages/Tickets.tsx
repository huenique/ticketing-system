import { useState, useEffect, Fragment } from "react"
import { Layout, Layouts, Responsive, WidthProvider } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Define the Tab type
interface Tab {
  id: string
  title: string
  content: string
  isDragging?: boolean
  appliedPreset?: string  // Track which preset is applied to this tab
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

// Define assignee and time entry types
interface Assignee {
  id: string
  name: string
  workDescription: string
  totalHours: string
  estTime: string
}

interface TimeEntry {
  id: string
  assigneeId: string
  assigneeName: string
  startTime: string
  stopTime: string
  duration: string
  dateCreated: string
  remarks: string
}

// Define widget type for draggable dialog sections
interface Widget {
  id: string
  type: string       // More specific types for individual form fields
  title: string
  content?: string
  fieldType?: string // Added to identify specific input type (text, select, etc)
  fieldName?: string // Added to identify which field this widget represents
  fieldValue?: any   // Added to store the current value
  width: number     // Width hint for the layout - make this required
  height: number    // Height hint for the layout - make this required
  isDragging?: boolean
  isCollapsed?: boolean
  layouts?: Record<string, Layout>
}

// Widget types - expanded to include individual form fields
const WIDGET_TYPES = {
  // Groups
  DETAILS: "details",
  ASSIGNEES: "assignees",
  TIME_ENTRIES: "timeEntries",
  ATTACHMENTS: "attachments",
  NOTES: "notes",
  
  // Individual form fields
  FIELD_STATUS: "field_status",
  FIELD_CUSTOMER_NAME: "field_customer_name",
  FIELD_DATE_CREATED: "field_date_created",
  FIELD_LAST_MODIFIED: "field_last_modified",
  FIELD_BILLABLE_HOURS: "field_billable_hours",
  FIELD_TOTAL_HOURS: "field_total_hours",
  FIELD_DESCRIPTION: "field_description"
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
    'col-5': MOCK_ASSIGNEES[Math.floor(Math.random() * MOCK_ASSIGNEES.length)], // Assign To
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

  // State for ticket view dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<Row | null>(null)
  const [ticketForm, setTicketForm] = useState({
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

  // State for widget management in dialog
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [isDraggingWidget, setIsDraggingWidget] = useState(false)
  
  // State for grid layout
  const [widgetLayouts, setWidgetLayouts] = useState<Layouts>({ lg: [], md: [], sm: [] })

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
    
    // Update the tab to track which preset was applied
    setTabs(prev => 
      prev.map(tab => 
        tab.id === activeTab
          ? { ...tab, appliedPreset: presetKey }
          : tab
      )
    )
    
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

  // Widget drag handlers
  const handleWidgetDragStart = (e: React.DragEvent, widgetId: string) => {
    setIsDraggingWidget(true)
    setDraggedWidget(widgetId)
    e.dataTransfer.setData("widget", widgetId)
    
    // Apply visual effect to the dragged widget
    setTimeout(() => {
      setWidgets(prev => 
        prev.map(widget => widget.id === widgetId 
          ? { ...widget, isDragging: true } 
          : widget
        )
      )
    }, 0)
  }

  const handleWidgetDragEnd = () => {
    setIsDraggingWidget(false)
    setDraggedWidget(null)
    setWidgets(prev => prev.map(widget => ({ ...widget, isDragging: false })))
  }

  const handleWidgetDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleWidgetDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetWidgetId) return

    const draggedWidgetIndex = widgets.findIndex(widget => widget.id === draggedWidget)
    const targetWidgetIndex = widgets.findIndex(widget => widget.id === targetWidgetId)
    
    if (draggedWidgetIndex === -1 || targetWidgetIndex === -1) return
    
    // Reorder widgets
    const newWidgets = [...widgets]
    const [draggedWidgetItem] = newWidgets.splice(draggedWidgetIndex, 1)
    newWidgets.splice(targetWidgetIndex, 0, draggedWidgetItem)
    
    setWidgets(newWidgets)
    setIsDraggingWidget(false)
    setDraggedWidget(null)
  }

  // Toggle widget collapse state
  const toggleWidgetCollapse = (widgetId: string) => {
    setWidgets(prev => 
      prev.map(widget => widget.id === widgetId 
        ? { ...widget, isCollapsed: !widget.isCollapsed } 
        : widget
      )
    )
  }

  // Add a new widget to the dialog
  const addWidget = (type: string) => {
    const newWidgetId = `widget-${Date.now()}`
    let title = "New Widget"
    let width = 12
    let height = 4
    let fieldType = ""
    let fieldName = ""
    let fieldValue = null
    
    // Configure widget based on type
    switch(type) {
      // Group widgets
      case WIDGET_TYPES.DETAILS:
        title = "Ticket Details"
        width = 12
        height = 4
        break
      case WIDGET_TYPES.ASSIGNEES:
        title = "Team Members"
        width = 12
        height = 5
        break
      case WIDGET_TYPES.TIME_ENTRIES:
        title = "Time Entries"
        width = 12
        height = 5
        break
      case WIDGET_TYPES.NOTES:
        title = "Notes"
        width = 6
        height = 3
        break
      case WIDGET_TYPES.ATTACHMENTS:
        title = "Attachments"
        width = 6
        height = 3
        break
      
      // Individual field widgets
      case WIDGET_TYPES.FIELD_STATUS:
        title = "Status"
        fieldType = "select"
        fieldName = "status"
        fieldValue = ticketForm.status
        width = 6
        height = 2
        break
      case WIDGET_TYPES.FIELD_CUSTOMER_NAME:
        title = "Customer Name"
        fieldType = "text-readonly"
        fieldName = "customerName"
        fieldValue = currentTicket?.cells['col-3'] || ""
        width = 6
        height = 2
        break
      case WIDGET_TYPES.FIELD_DATE_CREATED:
        title = "Date Created"
        fieldType = "text-readonly"
        fieldName = "dateCreated"
        fieldValue = currentTicket?.cells['col-2'] || ""
        width = 4
        height = 2
        break
      case WIDGET_TYPES.FIELD_LAST_MODIFIED:
        title = "Last Modified"
        fieldType = "text-readonly"
        fieldName = "lastModified"
        fieldValue = currentTicket?.cells['col-10'] || ""
        width = 4
        height = 2
        break
      case WIDGET_TYPES.FIELD_BILLABLE_HOURS:
        title = "Billable Hours"
        fieldType = "number"
        fieldName = "billableHours"
        fieldValue = ticketForm.billableHours
        width = 4
        height = 2
        break
      case WIDGET_TYPES.FIELD_TOTAL_HOURS:
        title = "Total Hours"
        fieldType = "number"
        fieldName = "totalHours"
        fieldValue = ticketForm.totalHours
        width = 4
        height = 2
        break
      case WIDGET_TYPES.FIELD_DESCRIPTION:
        title = "Description"
        fieldType = "textarea"
        fieldName = "description"
        fieldValue = ticketForm.description
        width = 12
        height = 3
        break
    }
    
    const newWidget: Widget = {
      id: newWidgetId,
      type,
      title,
      isCollapsed: false,
      fieldType,
      fieldName,
      fieldValue,
      width,
      height
    }
    
    // Add the widget to the state
    setWidgets(prev => [...prev, newWidget])
    
    // Calculate the next position based on existing widgets
    const y = widgetLayouts.lg.reduce((maxY, layout) => {
      return Math.max(maxY, layout.y + layout.h)
    }, 0)
    
    // Add layouts for each breakpoint
    const newLayouts = { ...widgetLayouts }
    
    // For large screens
    newLayouts.lg = [
      ...newLayouts.lg, 
      { i: newWidgetId, x: 0, y, w: width, h: height, minW: 2, minH: 1 }
    ]
    
    // For medium screens (adjust width)
    newLayouts.md = [
      ...newLayouts.md, 
      { i: newWidgetId, x: 0, y, w: Math.min(6, width), h: height, minW: 2, minH: 1 }
    ]
    
    // For small screens (full width)
    newLayouts.sm = [
      ...newLayouts.sm, 
      { i: newWidgetId, x: 0, y, w: 4, h: height, minW: 2, minH: 1 }
    ]
    
    setWidgetLayouts(newLayouts)
  }

  // Remove a widget
  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId))
  }
  
  // Handle layout changes
  const onLayoutChange = (layout: Layout[], layouts: Layouts) => {
    setWidgetLayouts(layouts)
  }

  // Initialize dialog with ticket data
  const initializeTicketDialog = (ticket: Row) => {
    setCurrentTicket(ticket)
    
    // Find current tab and its preset
    const currentTab = tabs.find(tab => tab.id === activeTab);
    const isEngineeringPreset = currentTab?.appliedPreset === "Engineering";
    
    // Reset ticket form data
    setTicketForm({
      status: ticket.cells['col-7'] || 'New',
      description: ticket.cells['col-4'] || '',
      billableHours: ticket.cells['col-9'] || '0.0',
      totalHours: ticket.cells['col-8'] || '0.0',
    })
    
    // Reset uploaded images
    setUploadedImages([])

    if (isEngineeringPreset) {
      // Engineering preset uses pre-defined assignees and time entries
      const mockAssignees: Assignee[] = [
        {
          id: "a1",
          name: "David Clark",
          workDescription: "Primary technician",
          totalHours: "4.5",
          estTime: "8"
        }
      ]
      
      const mockTimeEntries: TimeEntry[] = [
        {
          id: "t1",
          assigneeId: "a1",
          assigneeName: "David Clark",
          startTime: "09:00",
          stopTime: "12:30",
          duration: "3.5",
          dateCreated: new Date().toLocaleDateString(),
          remarks: "Initial assessment and troubleshooting"
        }
      ]
      
      setAssignees(mockAssignees)
      setTimeEntries(mockTimeEntries)
      setAssigneeTableTitle("Assigned Team Members")
      
      // Option 2: Initialize with individual field widgets
      const defaultWidgets: Widget[] = [
        { 
          id: "widget-status", 
          type: WIDGET_TYPES.FIELD_STATUS, 
          title: "Status", 
          fieldType: "select",
          fieldName: "status",
          fieldValue: ticketForm.status,
          width: 6,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-customer", 
          type: WIDGET_TYPES.FIELD_CUSTOMER_NAME, 
          title: "Customer Name", 
          fieldType: "text-readonly",
          fieldName: "customerName",
          fieldValue: ticket.cells['col-3'] || "",
          width: 6,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-date", 
          type: WIDGET_TYPES.FIELD_DATE_CREATED, 
          title: "Date Created", 
          fieldType: "text-readonly",
          fieldName: "dateCreated",
          fieldValue: ticket.cells['col-2'] || "",
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-modified", 
          type: WIDGET_TYPES.FIELD_LAST_MODIFIED, 
          title: "Last Modified", 
          fieldType: "text-readonly",
          fieldName: "lastModified",
          fieldValue: ticket.cells['col-10'] || "",
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-billable", 
          type: WIDGET_TYPES.FIELD_BILLABLE_HOURS, 
          title: "Billable Hours", 
          fieldType: "number",
          fieldName: "billableHours",
          fieldValue: ticketForm.billableHours,
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-total", 
          type: WIDGET_TYPES.FIELD_TOTAL_HOURS, 
          title: "Total Hours", 
          fieldType: "number",
          fieldName: "totalHours",
          fieldValue: ticketForm.totalHours,
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-description", 
          type: WIDGET_TYPES.FIELD_DESCRIPTION, 
          title: "Description", 
          fieldType: "textarea",
          fieldName: "description",
          fieldValue: ticketForm.description,
          width: 12,
          height: 3,
          isCollapsed: false
        },
        { 
          id: "widget-assignees", 
          type: WIDGET_TYPES.ASSIGNEES, 
          title: "Assigned Team Members", 
          width: 12,
          height: 5,
          isCollapsed: false
        },
        { 
          id: "widget-time", 
          type: WIDGET_TYPES.TIME_ENTRIES, 
          title: "Time Entry Records", 
          width: 12,
          height: 5,
          isCollapsed: false
        },
        { 
          id: "widget-attachments", 
          type: WIDGET_TYPES.ATTACHMENTS, 
          title: "Attachments", 
          width: 6,
          height: 3,
          isCollapsed: false
        }
      ]
      
      setWidgets(defaultWidgets)
      
      // Create layouts for the default widgets
      const newLayouts: Layouts = { lg: [], md: [], sm: [] }
      
      // Add layout for each widget
      let y = 0
      defaultWidgets.forEach(widget => {
        // Get dimensions from widget directly
        const wSize = widget.width;
        const hSize = widget.height;
        
        // Add to layouts for each breakpoint
        newLayouts.lg.push({ i: widget.id, x: 0, y, w: wSize, h: hSize, minW: 2, minH: 1 })
        newLayouts.md.push({ i: widget.id, x: 0, y, w: Math.min(6, wSize), h: hSize, minW: 2, minH: 1 })
        newLayouts.sm.push({ i: widget.id, x: 0, y, w: 4, h: hSize, minW: 2, minH: 1 })
        
        // Increment y for next widget
        y += hSize
      })
      
      setWidgetLayouts(newLayouts)
    } else {
      // For other presets, start with empty form
      setAssignees([])
      setTimeEntries([])
      setAssigneeTableTitle("Team Members")
      
      // Initialize with a blank widget layout
      setWidgets([])
      setWidgetLayouts({ lg: [], md: [], sm: [] })
    }
    
    setViewDialogOpen(true)
  }

  // Handle saving ticket changes
  const saveTicketChanges = () => {
    if (!currentTicket || !activeTab) return
    
    // Update the ticket in the table
    const updatedTicket = {
      ...currentTicket,
      cells: {
        ...currentTicket.cells,
        'col-7': ticketForm.status,
        'col-4': ticketForm.description,
        'col-9': ticketForm.billableHours,
        'col-8': ticketForm.totalHours,
        // In a real app, we would also save assignees and time entries
      }
    }
    
    setTables(prev => {
      const table = prev[activeTab]
      if (!table) return prev
      
      return {
        ...prev,
        [activeTab]: {
          ...table,
          rows: table.rows.map(row => 
            row.id === currentTicket.id ? updatedTicket : row
          )
        }
      }
    })
    
    setViewDialogOpen(false)
  }

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

  // Widget component to render each draggable section
  const TicketWidget = ({ widget }: { widget: Widget }) => {
    // Function to handle field value updates
    const handleFieldChange = (fieldName: string, value: any) => {
      if (!fieldName) return;
      
      // Update the ticket form state
      if (fieldName === 'status' || fieldName === 'description' || 
          fieldName === 'billableHours' || fieldName === 'totalHours') {
        setTicketForm(prev => ({
          ...prev,
          [fieldName]: value
        }));
      }
      
      // Also update the widget's fieldValue
      setWidgets(prev => 
        prev.map(w => 
          w.id === widget.id 
            ? { ...w, fieldValue: value } 
            : w
        )
      );
    };

    const renderWidgetContent = () => {
      if (widget.isCollapsed) return null;
      
      // First check if it's an individual field widget
      if (widget.fieldType) {
        switch (widget.fieldType) {
          case 'select':
            return (
              <div>
                <label htmlFor={widget.fieldName} className="block text-sm font-medium text-neutral-700">{widget.title}</label>
                <select
                  id={widget.fieldName}
                  value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                  onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="New">New</option>
                  <option value="Awaiting Customer Response">Awaiting Customer Response</option>
                  <option value="Awaiting Parts">Awaiting Parts</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>
            );
            
          case 'text-readonly':
            return (
              <div>
                <label className="block text-sm font-medium text-neutral-700">{widget.title}</label>
                <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                  {widget.fieldValue}
                </div>
              </div>
            );
            
          case 'number':
            return (
              <div>
                <label htmlFor={widget.fieldName} className="block text-sm font-medium text-neutral-700">{widget.title}</label>
                <input
                  type="number"
                  id={widget.fieldName}
                  value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                  onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  step="0.1"
                  min="0"
                />
              </div>
            );
            
          case 'textarea':
            return (
              <div>
                <label htmlFor={widget.fieldName} className="block text-sm font-medium text-neutral-700">{widget.title}</label>
                <textarea
                  id={widget.fieldName}
                  value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                  onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                  rows={5}
                  className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            );
        }
      }
      
      // If not an individual field, fall back to the original widget types
      switch (widget.type) {
        case WIDGET_TYPES.DETAILS:
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-neutral-700">Status</label>
                  <select
                    id="status"
                    value={ticketForm.status}
                    onChange={(e) => setTicketForm({...ticketForm, status: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="New">New</option>
                    <option value="Awaiting Customer Response">Awaiting Customer Response</option>
                    <option value="Awaiting Parts">Awaiting Parts</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Customer Name</label>
                  <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                    {currentTicket?.cells['col-3']}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Date Created</label>
                    <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                      {currentTicket?.cells['col-2']}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Last Modified</label>
                    <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                      {currentTicket?.cells['col-10']}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="billableHours" className="block text-sm font-medium text-neutral-700">Billable Hours</label>
                    <input
                      type="number"
                      id="billableHours"
                      value={ticketForm.billableHours}
                      onChange={(e) => setTicketForm({...ticketForm, billableHours: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="totalHours" className="block text-sm font-medium text-neutral-700">Total Hours</label>
                    <input
                      type="number"
                      id="totalHours"
                      value={ticketForm.totalHours}
                      onChange={(e) => setTicketForm({...ticketForm, totalHours: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      step="0.1"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-neutral-700">General Ticket Description</label>
                  <textarea
                    id="description"
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                    rows={5}
                    className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          );
          
        case WIDGET_TYPES.ASSIGNEES:
          return (
            <div>
              {/* Form to add a new assignee */}
              {showAssigneeForm && (
                <div className="mb-4 p-4 border rounded-lg bg-neutral-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Name</label>
                      <input
                        type="text"
                        value={newAssignee.name}
                        onChange={(e) => setNewAssignee({...newAssignee, name: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Work Description</label>
                      <input
                        type="text"
                        value={newAssignee.workDescription}
                        onChange={(e) => setNewAssignee({...newAssignee, workDescription: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Total Hours</label>
                      <input
                        type="number"
                        value={newAssignee.totalHours}
                        onChange={(e) => setNewAssignee({...newAssignee, totalHours: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Estimated Time</label>
                      <input
                        type="number"
                        value={newAssignee.estTime}
                        onChange={(e) => setNewAssignee({...newAssignee, estTime: e.target.value})}
                        className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => setShowAssigneeForm(false)}
                      className="px-3 py-1.5 border border-neutral-300 rounded-md text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAssignee}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between mb-3">
                <div></div>
                <button
                  onClick={() => setShowAssigneeForm(true)}
                  className="flex items-center rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
                  title="Add assignee"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Team Member
                </button>
              </div>
              
              {/* Assignees table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Work Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Est. Time</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {assignees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-sm text-neutral-500">
                          No team members assigned yet
                        </td>
                      </tr>
                    )}
                    {assignees.map(assignee => (
                      <tr key={assignee.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          <input
                            type="text"
                            value={assignee.name}
                            onChange={(e) => handleUpdateAssignee(assignee.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          <input
                            type="text"
                            value={assignee.workDescription}
                            onChange={(e) => handleUpdateAssignee(assignee.id, 'workDescription', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          <input
                            type="number"
                            value={assignee.totalHours}
                            onChange={(e) => handleUpdateAssignee(assignee.id, 'totalHours', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-0 p-0"
                            step="0.1"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          <input
                            type="number"
                            value={assignee.estTime}
                            onChange={(e) => handleUpdateAssignee(assignee.id, 'estTime', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-0 p-0"
                            step="0.1"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right whitespace-nowrap">
                          <button 
                            onClick={() => handleAddTimeEntry(assignee.id)}
                            className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none mr-2"
                            title="Add time entry"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveAssignee(assignee.id)}
                            className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                            title="Remove assignee"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          
        case WIDGET_TYPES.TIME_ENTRIES:
          return (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Start Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Stop Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Duration (hrs)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Remarks</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {timeEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-center text-sm text-neutral-500">
                        No time entries yet
                      </td>
                    </tr>
                  )}
                  {timeEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.assigneeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="time"
                          value={entry.startTime}
                          onChange={(e) => handleUpdateTimeEntry(entry.id, 'startTime', e.target.value)}
                          className="bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="time"
                          value={entry.stopTime}
                          onChange={(e) => handleUpdateTimeEntry(entry.id, 'stopTime', e.target.value)}
                          className="bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.duration}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.dateCreated}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) => handleUpdateTimeEntry(entry.id, 'remarks', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          placeholder="Add remarks..."
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 text-right">
                        <button
                          onClick={() => handleRemoveTimeEntry(entry.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                          title="Remove time entry"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          
        case WIDGET_TYPES.ATTACHMENTS:
          return (
            <div>
              <label className="block text-sm font-medium text-neutral-700">Uploaded Images</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={image} 
                      alt={`Uploaded ${index}`} 
                      className="h-24 w-full object-cover rounded-md border border-neutral-200"
                    />
                    <button
                      onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {uploadedImages.length === 0 && (
                  <div className="h-24 border border-dashed border-neutral-300 rounded-md flex items-center justify-center text-neutral-500 text-sm">
                    No images uploaded
                  </div>
                )}
              </div>
              <div className="mt-2">
                <label htmlFor="image-upload" className="inline-block px-3 py-2 bg-neutral-100 text-neutral-700 rounded-md cursor-pointer hover:bg-neutral-200 transition-colors text-sm">
                  Upload Images
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>
          );
          
        case WIDGET_TYPES.NOTES:
          return (
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-neutral-700">Notes</label>
              <textarea
                id="notes"
                rows={5}
                className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Add notes about this ticket..."
              />
            </div>
          );
          
        default:
          return (
            <div className="py-4 text-center text-neutral-500">
              No content for this widget type
            </div>
          );
      }
    };
    
    return (
      <div 
        className={`mb-5 border rounded-lg bg-white shadow-sm overflow-hidden ${widget.isDragging ? 'opacity-50 border-dashed border-blue-400' : ''}`}
        draggable={true}
        onDragStart={(e) => handleWidgetDragStart(e, widget.id)}
        onDragEnd={handleWidgetDragEnd}
        onDragOver={handleWidgetDragOver}
        onDrop={(e) => handleWidgetDrop(e, widget.id)}
      >
        <div className="bg-neutral-50 border-b px-4 py-2 flex items-center justify-between widget-drag-handle cursor-grab">
          <div className="font-medium flex items-center">
            <span className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </span>
            {widget.title}
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => toggleWidgetCollapse(widget.id)}
              className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
              title={widget.isCollapsed ? "Expand" : "Collapse"}
            >
              {widget.isCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
            <button 
              onClick={() => removeWidget(widget.id)}
              className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
              title="Remove widget"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {!widget.isCollapsed && (
          <div className="p-4">
            {renderWidgetContent()}
          </div>
        )}
      </div>
    );
  };

  // Modify the renderTabContent function to include the action button changes
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
            {/* Remove the Add Row button */}
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
                            <button 
                              className="rounded bg-blue-100 p-1 text-blue-700 hover:bg-blue-200" 
                              title="View Ticket"
                              onClick={() => initializeTicketDialog(row)}
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

  // Add this effect to keep the widget field values in sync with ticket form
  useEffect(() => {
    // Update any field widgets when the ticket form changes
    setWidgets(prevWidgets => 
      prevWidgets.map(widget => {
        if (widget.fieldName) {
          // Only update widgets with fieldName property
          const fieldName = widget.fieldName as keyof typeof ticketForm;
          
          if (fieldName in ticketForm) {
            return {
              ...widget,
              fieldValue: ticketForm[fieldName]
            };
          }
        }
        return widget;
      })
    );
  }, [ticketForm]);

  // Also add this effect to update the layouts when widgets change
  useEffect(() => {
    // This ensures that newly added widgets have proper layout entries
    const widgetIds = widgets.map(w => w.id);
    const layoutWidgetIds = widgetLayouts.lg.map(l => l.i);
    
    // Check if there are widgets without layouts
    const needsLayoutUpdate = widgetIds.some(id => !layoutWidgetIds.includes(id));
    
    if (needsLayoutUpdate) {
      const newLayouts = { ...widgetLayouts };
      
      // Add missing widgets to layouts
      widgets.forEach(widget => {
        if (!layoutWidgetIds.includes(widget.id)) {
          // Calculate the next position based on existing widgets
          const y = newLayouts.lg.reduce((maxY, layout) => {
            return Math.max(maxY, layout.y + layout.h);
          }, 0);
          
          const wSize = widget.width;
          const hSize = widget.height;
          
          // Add to layouts for each breakpoint
          newLayouts.lg.push({ 
            i: widget.id, 
            x: 0, 
            y, 
            w: wSize, 
            h: hSize, 
            minW: 2, 
            minH: 1 
          });
          
          newLayouts.md.push({ 
            i: widget.id, 
            x: 0, 
            y, 
            w: Math.min(6, wSize), 
            h: hSize, 
            minW: 2, 
            minH: 1 
          });
          
          newLayouts.sm.push({ 
            i: widget.id, 
            x: 0, 
            y, 
            w: 4, 
            h: hSize, 
            minW: 2, 
            minH: 1 
          });
        }
      });
      
      setWidgetLayouts(newLayouts);
    }
  }, [widgets, widgetLayouts]);

  return (
    <div className="space-y-4">
      {/* Add the style tag to hide scrollbars */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Add react-grid-layout styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .react-grid-layout {
          position: relative;
          transition: height 200ms ease;
          width: 100%;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
          background: #fff;
          box-sizing: border-box;
          border-radius: 0.5rem;
          display: flex;
          overflow: hidden;
        }
        .react-grid-item > * {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        .react-grid-item.resizing {
          z-index: 1;
          will-change: width, height;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          will-change: transform;
        }
        .react-grid-item.react-grid-placeholder {
          background: rgba(0, 120, 240, 0.1);
          border: 2px dashed #0078f0;
          opacity: 0.7;
          transition-duration: 100ms;
          z-index: 2;
          border-radius: 0.5rem;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -o-user-select: none;
          user-select: none;
        }
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 4px;
          bottom: 4px;
          width: 12px;
          height: 12px;
          border-right: 2px solid rgba(0, 0, 0, 0.3);
          border-bottom: 2px solid rgba(0, 0, 0, 0.3);
        }
      `}} />
      
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
      
      {/* Custom dialog for ticket view - modify to show Add Widget button for non-Engineering presets */}
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
                              <TicketWidget widget={widget} />
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
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.DETAILS);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Ticket Details
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.ASSIGNEES);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Team Members
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.TIME_ENTRIES);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Time Entries
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.ATTACHMENTS);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Attachments
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.NOTES);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Notes
                              </button>
                              
                              <div className="my-1 border-t border-neutral-200"></div>
                              <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">Individual Fields</div>
                              
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.FIELD_STATUS);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Status Field
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Customer Name Field
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.FIELD_DATE_CREATED);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Date Created Field
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Last Modified Field
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Billable Hours Field
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Total Hours Field
                              </button>
                              <button 
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                onClick={() => {
                                  addWidget(WIDGET_TYPES.FIELD_DESCRIPTION);
                                  document.getElementById('widget-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Description Field
                              </button>
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
                              onClick={() => addWidget('details')}
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
                                addWidget(WIDGET_TYPES.FIELD_STATUS);
                                
                                // Add customer name field
                                addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME);
                                
                                // Add date fields in a row
                                addWidget(WIDGET_TYPES.FIELD_DATE_CREATED);
                                addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED);
                                
                                // Add hour fields
                                addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS);
                                addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS);
                                
                                // Add description
                                addWidget(WIDGET_TYPES.FIELD_DESCRIPTION);
                                
                                // Add larger widgets
                                addWidget(WIDGET_TYPES.ASSIGNEES);
                                addWidget(WIDGET_TYPES.TIME_ENTRIES);
                                addWidget(WIDGET_TYPES.ATTACHMENTS);
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
                              onClick={() => addWidget(WIDGET_TYPES.FIELD_STATUS)}
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
                onClick={saveTicketChanges}
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