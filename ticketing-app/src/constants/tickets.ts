import { Table } from "../types/tickets";

// Widget types - expanded to include individual form fields
export const WIDGET_TYPES = {
  // Groups
  DETAILS: "details",
  ASSIGNEES: "assignees",
  TIME_ENTRIES: "timeEntries",
  ATTACHMENTS: "attachments",
  NOTES: "notes",
  COMPOSITE: "composite",

  // Individual form fields
  FIELD_STATUS: "field_status",
  FIELD_CUSTOMER_NAME: "field_customer_name",
  FIELD_DATE_CREATED: "field_date_created",
  FIELD_LAST_MODIFIED: "field_last_modified",
  FIELD_BILLABLE_HOURS: "field_billable_hours",
  FIELD_TOTAL_HOURS: "field_total_hours",
  FIELD_DESCRIPTION: "field_description",

  // Additional individual widgets
  FIELD_ASSIGNEE_TABLE: "field_assignee_table",
  FIELD_TIME_ENTRIES_TABLE: "field_time_entries_table",
  FIELD_ATTACHMENTS_GALLERY: "field_attachments_gallery",
};

// Presets for tables
export const PRESET_TABLES: Record<string, Table> = {
  Engineering: {
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
    rows: [],
  },
};

// Define some mock data constants
export const MOCK_CUSTOMERS = [
  "John Smith",
  "Emma Johnson",
  "Michael Williams",
  "Olivia Brown",
  "Robert Jones",
  "Sophia Miller",
  "William Davis",
  "Ava Wilson",
  "James Anderson",
  "Isabella Martinez",
];

export const MOCK_ASSIGNEES = [
  "John Doe",
  "Sarah Lewis",
  "Thomas Walker",
  "Jennifer Hall",
  "Richard Young",
  "Elizabeth Allen",
  "Charles King",
  "Mary Wright",
  "Joseph Scott",
  "Patricia Green",
];

export const MOCK_STATUSES = [
  "Open",
  "In Progress",
  "Waiting for Parts",
  "Pending Approval",
  "Completed",
];

export const MOCK_PARTS = [
  "Compressor A-101",
  "Valve Set B-200",
  "Filter Unit C-300",
  "Circuit Board D-400",
  "Pressure Gauge E-500",
  "Thermostat F-600",
  "Bearing Assembly G-700",
  "Motor H-800",
];
