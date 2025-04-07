// Define the Tab type
export interface Tab {
  id: string;
  title: string;
  content: string;
  isDragging?: boolean;
  appliedPreset?: string; // Track which preset is applied to this tab
}

// Define column and table types
export interface Column {
  id: string;
  title: string;
  width?: string;
  isDragging?: boolean;
}

export interface Row {
  id: string;
  cells: Record<string, string>;
}

export interface Table {
  columns: Column[];
  rows: Row[];
}

// Define assignee and time entry types
export interface Assignee {
  id: string;
  name: string;
  workDescription: string;
  totalHours: string;
  estTime: string;
  priority: string; // Priority from 1 (highest) to 5 (lowest)
}

export interface TimeEntry {
  id: string;
  assigneeId: string;
  assigneeName: string;
  startTime: string;
  stopTime: string;
  duration: string;
  dateCreated: string;
  remarks: string;
}

// Define widget type for draggable dialog sections
export interface Widget {
  id: string;
  type: string; // Type of widget
  title: string;
  content?: string;
  field?: string; // Field name this widget is associated with
  fieldType?: string; // Added to identify specific input type (text, select, etc)
  value?: string; // Current value of the field
  options?: string[]; // Options for select fields
  width?: number; // Width hint for the layout
  height?: number; // Height hint for the layout
  isDragging?: boolean;
  isCollapsed?: boolean; // Should be renamed to be consistent with usage in code
  collapsed?: boolean; // Alternative name used in some places
  layouts?: Record<string, never>;
  fieldName?: string; // Field name for the widget
  fieldValue?: string | null; // Value for the field
}

export interface TicketForm {
  status: string;
  description: string;
  billableHours: string;
  totalHours: string;
}

export interface EditingColumn {
  tabId: string;
  columnId: string;
}
