import { MOCK_CUSTOMERS, MOCK_PARTS, MOCK_STATUSES, MOCK_ASSIGNEES } from '../constants/tickets'

/**
 * Generate mock data for a table row
 */
export function generateMockRowData(rowIndex: number): Record<string, string> {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  
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

/**
 * Generate a random date between two dates
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

/**
 * Format a date to a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Get saved tabs data from localStorage
 */
export function getSavedTabsData() {
  if (typeof window === "undefined") return { tabs: null, activeTab: null }
  
  const savedTabs = localStorage.getItem("ticket-tabs")
  const savedActiveTab = localStorage.getItem("ticket-active-tab")
  
  return {
    tabs: savedTabs ? JSON.parse(savedTabs) : null,
    activeTab: savedActiveTab || null,
  }
}

/**
 * Get grid styles for React Grid Layout
 */
export function getGridStyles(): string {
  return `
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
  `
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
  `
} 