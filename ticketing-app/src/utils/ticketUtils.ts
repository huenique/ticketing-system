import { Layouts } from "react-grid-layout";

import { Customer, Row, Status, Ticket, User } from "@/types/tickets";

import {
  MOCK_ASSIGNEES,
  MOCK_CUSTOMERS,
  MOCK_PARTS,
  MOCK_STATUSES,
} from "../constants/tickets";

/**
 * Helper function to determine which status to display based on user permissions
 * @param ticket - The ticket object
 * @param isAdmin - Whether the current user is an admin
 * @returns The effective status object to display
 */
export function getEffectiveStatus(ticket: any, isAdmin: boolean): any {
  // For admin users: always use status_id (ignore task_status_id)
  if (isAdmin) {
    return typeof ticket.status_id === "object" ? ticket.status_id : ticket.status;
  }
  
  // For non-admin users:
  // If task_status exists and has a value, use task_status_id
  // Otherwise, use status_id
  const taskStatus = typeof ticket.task_status_id === "object" ? ticket.task_status_id : ticket.task_status;
  const regularStatus = typeof ticket.status_id === "object" ? ticket.status_id : ticket.status;
  
  // Check if task_status exists and has a meaningful value
  if (taskStatus && (taskStatus.label || taskStatus.$id)) {
    console.log("Using task_status for non-admin user:", taskStatus);
    return taskStatus;
  }
  
  console.log("Using regular status for non-admin user:", regularStatus);
  return regularStatus;
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
  // Make billable hours 70-100% of total hours for more realistic values
  const billablePercentage = Math.random() * 0.3 + 0.7; // 70-100%
  const billableHours = (parseFloat(totalHours) * billablePercentage).toFixed(1);

  // Randomly select an assignee from the list of mock assignees
  const assignTo = MOCK_ASSIGNEES[Math.floor(Math.random() * MOCK_ASSIGNEES.length)];

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

/**
 * Convert an Appwrite Ticket with relationships to a Row for display
 */
export function convertTicketToRow(
  ticket: any, // Use 'any' temporarily to handle the unexpected response structure
  isAdmin: boolean = true, // Default to admin view for backward compatibility
): Row {
  // Format timestamps if they exist
  const dateCreated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Handle the case where relationship fields are already expanded objects
  // Use the effective status based on user permissions
  const status = getEffectiveStatus(ticket, isAdmin);
  const customer =
    typeof ticket.customer_id === "object" ? ticket.customer_id : ticket.customer;

  // Handle assignees - could be expanded objects in assignee_ids or separate assignees field
  let assigneesList = ticket.assignees || [];
  if (Array.isArray(ticket.assignee_ids) && ticket.assignee_ids.length > 0) {
    // If assignee_ids contains objects (expanded relation), use those
    if (typeof ticket.assignee_ids[0] === "object") {
      assigneesList = ticket.assignee_ids;
    }
  }

  // Format assignee names
  let assigneeNames = "";
  if (assigneesList && assigneesList.length > 0) {
    assigneeNames = assigneesList
      .map((user: any) =>
        user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "",
      )
      .filter((name: string) => name !== "")
      .join(", ");
  }

  // Handle attachments - ensure it's an array of file IDs as strings
  let attachmentsStr = "";
  if (ticket.attachments) {
    try {
      // If attachments is already a string, use it directly
      if (typeof ticket.attachments === "string") {
        attachmentsStr = ticket.attachments;
      }
      // If it's an array, process each element
      else if (Array.isArray(ticket.attachments)) {
        // First, try to recover the original attachment data
        const processedAttachments = ticket.attachments.map((attachment: unknown) => {
          // If we have a string '[object Object]', try to recover from rawData
          if (typeof attachment === 'string' && attachment === '[object Object]') {
            // Try to get the original attachment from rawData
            if (ticket.rawData?.attachments?.[0]) {
              const rawAttachment = ticket.rawData.attachments[0];
              if (typeof rawAttachment === 'object' && rawAttachment !== null) {
                return (rawAttachment as any).$id || (rawAttachment as any).id || '';
              }
            }
            return null;
          }
          // If it's a string, use it directly
          if (typeof attachment === 'string') {
            return attachment;
          }
          // If it's an object, try to get its ID
          if (typeof attachment === 'object' && attachment !== null) {
            return (attachment as any).$id || (attachment as any).id || '';
          }
          return null;
        }).filter((id: unknown): id is string => id !== null && id !== '');

        attachmentsStr = processedAttachments.join(", ");
      }
      // If it's an object, try to convert it to a string
      else if (typeof ticket.attachments === "object" && ticket.attachments !== null) {
        // If it has an $id field (Appwrite document), use that
        if ("$id" in ticket.attachments) {
          attachmentsStr = (ticket.attachments as any).$id;
        }
        // Otherwise try to stringify it
        else {
          attachmentsStr = JSON.stringify(ticket.attachments);
        }
      }

    } catch (error) {
      console.error("Error processing attachments:", error);
      attachmentsStr = "";
    }
  }

  // Use $id for Appwrite's document ID if available
  const documentId = ticket.$id || ticket.id || `generated-${Date.now()}`;

  // Store the status label directly in the cells, while keeping both status IDs in rawData
  const statusLabel = status?.label || "";
  const statusId = status?.$id || status?.id || "";
  
  // Also get the original status IDs for rawData
  const originalStatus = typeof ticket.status_id === "object" ? ticket.status_id : ticket.status;
  const originalTaskStatus = typeof ticket.task_status_id === "object" ? ticket.task_status_id : ticket.task_status;
  const originalStatusId = originalStatus?.$id || originalStatus?.id || "";
  const originalTaskStatusId = originalTaskStatus?.$id || originalTaskStatus?.id || "";

  const cells = {
    "col-1": `TK-${documentId.substring(0, 8)}`, // Ticket ID (shortened for display)
    "col-2": dateCreated, // Date Created
    "col-3": customer?.name || "", // Customer Name
    "col-4": ticket.description || "", // Work Description
    "col-5": assigneeNames, // Assign To
    "col-6": ticket.part_ids ? ticket.part_ids.join(", ") : "", // Parts Used
    "col-7": statusLabel, // Status (now using the label directly)
    "col-8": ticket.total_hours?.toString() || "0", // Total Hours
    "col-9": ticket.billable_hours?.toString() || "0", // Billable Hours
    "col-10": dateCreated, // Last Modified (reuse date created for now)
    "col-11": "action_buttons", // Actions
    "attachments": attachmentsStr, // Store attachments as a string
  };

  return {
    id: documentId,
    completed: statusLabel === "Completed" || statusLabel === "Done",
    cells,
    rawData: {
      ...ticket,
      status_id: originalStatusId, // Keep the original status_id relationship field
      task_status_id: originalTaskStatusId, // Keep the task_status_id relationship field
      effective_status_id: statusId, // Store which status was actually used for display
    },
  };
}
