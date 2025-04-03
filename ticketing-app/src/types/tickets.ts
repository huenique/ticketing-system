// Define the Tab type
export interface Tab {
  id: string
  title: string
  content: string
  isDragging?: boolean
  appliedPreset?: string  // Track which preset is applied to this tab
}

// Define column and table types
export interface Column {
  id: string
  title: string
  width?: string
  isDragging?: boolean
}

export interface Row {
  id: string
  cells: Record<string, string>
}

export interface Table {
  columns: Column[]
  rows: Row[]
}

// Define assignee and time entry types
export interface Assignee {
  id: string
  name: string
  workDescription: string
  totalHours: string
  estTime: string
}

export interface TimeEntry {
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
export interface Widget {
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
  layouts?: Record<string, any>
}

export interface TicketForm {
  status: string
  description: string
  billableHours: string
  totalHours: string
}

export interface EditingColumn {
  tabId: string
  columnId: string
} 