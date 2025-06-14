import { Layouts } from "react-grid-layout";

import {
  MOCK_ASSIGNEES,
  MOCK_CUSTOMERS,
  MOCK_PARTS,
  MOCK_STATUSES,
} from "../constants/tickets";

// Define interfaces based on Appwrite schema
export interface Ticket {
  id: string;
  status_id: string; // Relationship field to statuses collection
  customer_id: string; // Relationship field to customers collection
  billable_hours: number;
  total_hours: number;
  description: string;
  assignee_ids: string[]; // Relationship field to users collection
  attachments?: string[];
  assignment_id?: string[]; // Relationship field to ticket_assignments collection
  part_ids?: string[]; // Relationship field to parts collection
  workflow?: string; // Workflow category for filtering tickets
}

// Customer interface based on Appwrite schema
export interface Customer {
  $id: string;
  id: string;
  name: string;
  address: string;
  abn?: string;
  $createdAt: string;
  $updatedAt: string;
}

// User interface based on Appwrite schema
export interface User {
  $id: string;
  id: string;
  first_name: string;
  last_name: string;
  user_type_id: string;
}

// Status interface (already defined in ticketsService.ts)
export interface Status {
  $id: string;
  id: string;
  label: string;
}

// Define missing type interfaces
export interface Assignee {
  id: string;
  name: string;
  workDescription: string;  // Maps to work_description in database
  totalHours: string;       // Maps to actual_time in database
  estTime: string;          // Maps to estimated_time in database
  priority: string;         // Used for UI sorting
  is_done?: boolean;        // Maps to is_done in database
  user_id?: string;         // Relationship with Users collection - stores the user's ID
  ticket_id?: string;       // Relationship with Tickets collection
}

// Define Tab interface
export interface Tab {
  id: string;
  title: string;
  content?: string;
  status?: string;
  isDragging?: boolean;
  appliedPreset?: string;
  isEngineeringPreset?: boolean; // Add this property for Engineering preset tabs
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
  files?: string[]; // Added to match our database schema
  ticket_id?: string; // Relationship with Tickets collection
  user_id?: string; // Relationship with Users collection
}

// Ticket Form Structure
export interface TicketForm {
  status: string;
  customerId: string;
  description: string;
  billableHours: number | null;
  totalHours: number | null;
  assigneeIds: string[];
  attachments?: string[]; // Add attachments property

  // Appwrite relationship fields (optional since they're derived)
  status_id?: string;
  customer_id?: string;
  assignee_ids?: string[];
}

// Define Row interface for tables
export interface Row {
  id: string;
  cells: {
    [key: string]: any;
  };
  rawData?: any; // Add rawData property to store original Appwrite data
  completed?: boolean; // Flag for completed tickets
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  collapsed?: boolean;
  fieldType?: string;
  field?: string;
  value?: string;
  width?: number;
  height?: number;
  data?: never;
  options?: string[];
  isCollapsed?: boolean;
  
  // For composite widgets
  children?: Widget[];
  groupTitle?: string;
}

export interface Column {
  id: string;
  title: string;
  width: string;
  isDragging?: boolean;
}

export interface Table {
  columns: Column[];
  rows: Row[];
}

// Interface for storing layout data
export interface LayoutStorage {
  widgets: Widget[];
  layouts: Layouts;
}

// Add TicketAssignment interface based on database schema
export interface TicketAssignment {
  id: string;
  work_description: string;
  estimated_time: string;
  actual_time: string;
  user_id: string; // Relationship with Users collection
  ticket_id?: string; // Relationship with Tickets collection
  is_done?: boolean; // Completion status
  priority?: string; // Priority of the assignment (1 being highest)
}

/**
 * Generate mock data for a table row
 */
export function generateMockRowData(rowIndex: number): Record<string, string> {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const dateCreated = randomDate(weekAgo, today);
  const lastModified = randomDate(dateCreated, today);

  const randomCustomer =
    MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)];
  const randomStatus = MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)];

  // Generate 1-3 random parts
  const randomPartCount = Math.floor(Math.random() * 3) + 1;
  const randomParts = Array(randomPartCount)
    .fill(0)
    .map(() => MOCK_PARTS[Math.floor(Math.random() * MOCK_PARTS.length)])
    .join(", ");

  // Generate random hours
  const totalHours = (Math.random() * 10 + 1).toFixed(1);
  const billableHours = (Math.random() * parseFloat(totalHours)).toFixed(1);

  // For Assign To column, make "John Doe" appear more frequently (50% chance)
  let assignTo;
  if (rowIndex <= 3 || Math.random() < 0.5) {
    // For first 3 rows or with 50% probability, assign to John Doe
    assignTo = "John Doe";
  } else {
    // Randomly select from other assignees (excluding John Doe)
    const otherAssignees = MOCK_ASSIGNEES.filter((name) => name !== "John Doe");
    assignTo = otherAssignees[Math.floor(Math.random() * otherAssignees.length)];
  }

  return {
    "col-1": `TK-${1000 + rowIndex}`, // Ticket ID
    "col-2": formatDate(dateCreated), // Date Created
    "col-3": randomCustomer, // Customer Name
    "col-4": `Lorem ipsum dolor sit amet...`, // Work Description
    "col-5": assignTo, // Assign To
    "col-6": randomParts, // Parts Used
    "col-7": randomStatus, // Status
    "col-8": totalHours, // Total Hours
    "col-9": billableHours, // Billable Hours
    "col-10": formatDate(lastModified), // Last Modified
    "col-11": "action_buttons", // Actions
  };
}

/**
 * Generate a random date between two dates
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Format a date to a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get saved tabs data from localStorage
 */
export function getSavedTabsData() {
  if (typeof window === "undefined") return { tabs: null, activeTab: null };

  const savedTabs = localStorage.getItem("ticket-tabs");
  const savedActiveTab = localStorage.getItem("ticket-active-tab");

  return {
    tabs: savedTabs ? JSON.parse(savedTabs) : null,
    activeTab: savedActiveTab || null,
  };
}

/**
 * Get layout data from localStorage
 * @param key The key to retrieve from localStorage
 * @returns The retrieved object or undefined if not found
 */
export function getFromLS(key: string) {
  let ls: Record<string, never> = {};
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storedData = window.localStorage.getItem("rgl-ticket-layouts");
      ls = storedData ? JSON.parse(storedData) : {};
    } catch (e) {
      // Ignore errors in localStorage
      console.error("Error loading layout from localStorage:", e);
    }
  }
  return ls[key];
}

/**
 * Save layout data to localStorage
 * @param key The key to save under
 * @param value The value to save
 */
export function saveToLS<T>(key: string, value: T): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storedData = window.localStorage.getItem("rgl-ticket-layouts");
      const ls: Record<string, T> = storedData ? JSON.parse(storedData) : {};
      ls[key] = value;
      window.localStorage.setItem("rgl-ticket-layouts", JSON.stringify(ls));
    } catch (e) {
      console.error("Error saving layout to localStorage:", e);
    }
  }
}

/**
 * Get grid styles for React Grid Layout
 */
export function getGridStyles() {
  return `
    .widget-container {
      padding: 0 !important;
      position: relative;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .widget-content {
      height: 100%;
      width: 100%;
      overflow: auto;
      flex: 1;
    }
    
    .react-grid-item.react-grid-placeholder {
      background: #d4e6f7;
      border: 1px dashed #94b8d7;
      border-radius: 0.375rem;
      opacity: 0.4;
    }
    
    .react-grid-item > .widget-container > * {
      height: 100%;
      width: 100%;
    }
    
    /* Static mode styles - apply when not in edit mode */
    .react-grid-item.static {
      background: none;
      cursor: default;
    }
    
    .react-grid-item.static .react-resizable-handle {
      display: none;
    }
    
    /* Styling for all resize handles */
    .react-resizable-handle {
      position: absolute;
      width: 14px;
      height: 14px;
      opacity: 0.6;
      background-repeat: no-repeat;
      background-origin: content-box;
      box-sizing: border-box;
      background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSA2IDYgTCAwIDYgTCAwIDQuMiBMIDQgNC4yIEwgNC4yIDQuMiBMIDQuMiAwIEwgNiAwIEwgNiA2IEwgNiA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
      background-position: bottom right;
      padding: 0 3px 3px 0;
    }
    
    .react-resizable-handle:hover {
      opacity: 1;
    }
    
    /* Handle positioning */
    .react-resizable-handle-sw {
      bottom: 0;
      left: 0;
      cursor: sw-resize;
      transform: rotate(90deg);
    }
    
    .react-resizable-handle-se {
      bottom: 0;
      right: 0;
      cursor: se-resize;
    }
    
    .react-resizable-handle-nw {
      top: 0;
      left: 0;
      cursor: nw-resize;
      transform: rotate(180deg);
    }
    
    .react-resizable-handle-ne {
      top: 0;
      right: 0;
      cursor: ne-resize;
      transform: rotate(270deg);
    }
    
    .react-resizable-handle-w,
    .react-resizable-handle-e {
      top: 50%;
      margin-top: -7px;
      cursor: ew-resize;
    }
    
    .react-resizable-handle-w {
      left: 0;
      transform: rotate(135deg);
    }
    
    .react-resizable-handle-e {
      right: 0;
      transform: rotate(315deg);
    }
    
    .react-resizable-handle-n,
    .react-resizable-handle-s {
      left: 50%;
      margin-left: -7px;
      cursor: ns-resize;
    }
    
    .react-resizable-handle-n {
      top: 0;
      transform: rotate(225deg);
    }
    
    .react-resizable-handle-s {
      bottom: 0;
      transform: rotate(45deg);
    }
    
    .react-grid-dragHandle {
      position: relative;
      cursor: move;
    }
    
    .react-grid-dragHandle::before {
      content: "";
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 10px;
      background-image: radial-gradient(circle, #ccc 1px, transparent 1px);
      background-size: 3px 3px;
      opacity: 0.7;
    }
    
    .react-grid-dragHandle:hover::before {
      opacity: 1;
    }
  `;
}

/**
 * Get CSS for hiding scrollbars
 */
export function getScrollbarStyles(): string {
  return `
    /* Add custom style to remove scrollbars */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;
}
