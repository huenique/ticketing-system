import { useState, useEffect } from 'react' 
import { Layout, Layouts } from "react-grid-layout"
import { Tab, Table, Row, Assignee, TimeEntry, Widget, TicketForm } from '../types/tickets'
import { WIDGET_TYPES, PRESET_TABLES } from '../constants/tickets'
import { generateMockRowData, getSavedTabsData } from '../utils/ticketUtils'

/**
 * Custom hook to manage ticket state and actions
 */
export function useTickets() {
  // Initialize tabs from localStorage or defaults
  const initialData = (() => {
    const { tabs, activeTab } = getSavedTabsData()
    return {
      tabs: tabs || [{ id: "tab-1", title: "All Tickets", content: "all" }],
      activeTab: activeTab || "tab-1"
    }
  })()

  // State for tabs
  const [tabs, setTabs] = useState<Tab[]>(initialData.tabs)
  const [activeTab, setActiveTab] = useState(initialData.activeTab)
  const [tabsSaved, setTabsSaved] = useState(false)
  const [showPresetsMenu, setShowPresetsMenu] = useState(false)

  // State for tables (indexed by tab ID)
  const [tables, setTables] = useState<Record<string, Table | null>>({})

  // Effect to load tables from localStorage on initial render
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
    const newColumn = {
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

  // Apply preset table to current tab
  const applyPreset = (presetKey: string, tabId: string) => {
    if (!tabId) return
    
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
    
    // Update tables with the new preset table
    const updatedTables = {
      ...tables,
      [tabId]: {
        columns: [...presetTable.columns],
        rows: mockRows
      }
    };
    
    // Update tabs with the applied preset
    const updatedTabs = tabs.map(tab => 
      tab.id === tabId
        ? { ...tab, appliedPreset: presetKey }
        : tab
    );
    
    // Set state
    setTables(updatedTables);
    setTabs(updatedTabs);
    
    // Important: Save changes to localStorage immediately when applying a preset
    // This ensures that when we open dialogs, they will use the correct preset
    localStorage.setItem("ticket-tables", JSON.stringify(updatedTables));
    localStorage.setItem("ticket-tabs", JSON.stringify(updatedTabs));
    
    setShowPresetsMenu(false);
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

  // Handle initializing the ticket view dialog
  const initializeTicketDialog = (
    ticket: Row,
    setCurrentTicket: React.Dispatch<React.SetStateAction<Row | null>>,
    setTicketForm: React.Dispatch<React.SetStateAction<TicketForm>>,
    setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>,
    setAssignees: React.Dispatch<React.SetStateAction<Assignee[]>>,
    setTimeEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>,
    setAssigneeTableTitle: React.Dispatch<React.SetStateAction<string>>,
    setWidgets: React.Dispatch<React.SetStateAction<Widget[]>>,
    setWidgetLayouts: React.Dispatch<React.SetStateAction<Layouts>>,
    setViewDialogOpen: React.Dispatch<React.SetStateAction<boolean>>,
    currentTabs: Tab[],
    currentActiveTab: string
  ) => {
    setCurrentTicket(ticket)
    
    // Find current tab and its preset using the passed tabs and activeTab
    const currentTab = currentTabs.find(tab => tab.id === currentActiveTab);
    
    // Only check if the tab has the Engineering preset applied
    // We trust that if the preset was applied, the table structure is correct
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
          field: "status",
          value: ticket.cells['col-7'] || 'New',
          width: 6,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-customer", 
          type: WIDGET_TYPES.FIELD_CUSTOMER_NAME, 
          title: "Customer Name", 
          fieldType: "text-readonly",
          field: "customerName",
          value: ticket.cells['col-3'] || "",
          width: 6,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-date", 
          type: WIDGET_TYPES.FIELD_DATE_CREATED, 
          title: "Date Created", 
          fieldType: "text-readonly",
          field: "dateCreated",
          value: ticket.cells['col-2'] || "",
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-modified", 
          type: WIDGET_TYPES.FIELD_LAST_MODIFIED, 
          title: "Last Modified", 
          fieldType: "text-readonly",
          field: "lastModified",
          value: ticket.cells['col-10'] || "",
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-billable", 
          type: WIDGET_TYPES.FIELD_BILLABLE_HOURS, 
          title: "Billable Hours", 
          fieldType: "number",
          field: "billableHours",
          value: ticket.cells['col-9'] || "0.0",
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-total", 
          type: WIDGET_TYPES.FIELD_TOTAL_HOURS, 
          title: "Total Hours", 
          fieldType: "number",
          field: "totalHours",
          value: ticket.cells['col-8'] || "0.0",
          width: 4,
          height: 2,
          isCollapsed: false
        },
        { 
          id: "widget-description", 
          type: WIDGET_TYPES.FIELD_DESCRIPTION, 
          title: "Description", 
          fieldType: "textarea",
          field: "description",
          value: ticket.cells['col-4'] || "",
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
        const wSize = widget.width as number;
        const hSize = widget.height as number;
        
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
  const saveTicketChanges = (
    currentTicket: Row | null, 
    ticketForm: TicketForm,
    setViewDialogOpen: React.Dispatch<React.SetStateAction<boolean>>,
    tabId: string
  ) => {
    if (!currentTicket || !tabId) return
    
    // Update the ticket in the table
    const updatedTicket = {
      ...currentTicket,
      cells: {
        ...currentTicket.cells,
        'col-7': ticketForm.status,
        'col-4': ticketForm.description,
        'col-9': ticketForm.billableHours,
        'col-8': ticketForm.totalHours,
      }
    }
    
    setTables(prev => {
      const table = prev[tabId]
      if (!table) return prev
      
      return {
        ...prev,
        [tabId]: {
          ...table,
          rows: table.rows.map(row => 
            row.id === currentTicket.id ? updatedTicket : row
          )
        }
      }
    })
    
    setViewDialogOpen(false)
  }

  return {
    tabs,
    setTabs,
    activeTab,
    setActiveTab,
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
  }
} 