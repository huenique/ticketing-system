import { Layouts } from "react-grid-layout";
import { Widget } from "../types/tickets";

export const defaultTicketWidgets: Widget[] = [
  {
    id: "widget-1747758922081-status",
    type: "field_status",
    title: "Status",
    field: "status",
    fieldType: "select",
    options: [
      "Completed",
      "Awaiting for Parts",
      "New",
      "Open",
      "Awaiting Customer Response",
      "Declined",
      "In Progress"
    ],
    collapsed: false
  },
  {
    id: "widget-1747758922081-customer",
    type: "field_customer_name",
    title: "Customer",
    field: "customerName",
    fieldType: "text-readonly",
    collapsed: false,
    value: "AT Hydraulics (WA) Pty Limited"
  },
  {
    id: "widget-1747758922082-date-created",
    type: "field_date_created",
    title: "Date Created",
    field: "dateCreated",
    fieldType: "text-readonly",
    collapsed: false,
    value: "Juan de la Cruz"
  },
  {
    id: "widget-1747758922082-last-modified",
    type: "field_last_modified",
    title: "Last Modified",
    field: "lastModified",
    fieldType: "text-readonly",
    collapsed: false,
    value: "5/21/2025"
  },
  {
    id: "widget-1747758922082-billable-hours",
    type: "field_billable_hours",
    title: "Billable Hours",
    field: "billableHours",
    fieldType: "number",
    collapsed: false,
    value: "6"
  },
  {
    id: "widget-1747758922082-total-hours",
    type: "field_total_hours",
    title: "Total Hours",
    field: "totalHours",
    fieldType: "number",
    collapsed: false,
    value: "7"
  },
  {
    id: "widget-1747758922082-description",
    type: "field_description",
    title: "Description",
    field: "description",
    fieldType: "textarea",
    collapsed: false,
    value: "test"
  },
  {
    id: "widget-1747758922082-assignee-table",
    type: "field_assignee_table",
    title: "Team Members",
    field: "assigneeTable",
    fieldType: "table",
    collapsed: false
  },
  {
    id: "widget-1747758922082-time-entries-table",
    type: "field_time_entries_table",
    title: "Time Entries",
    field: "timeEntriesTable",
    fieldType: "table",
    collapsed: false
  },
  {
    id: "widget-1747758922082-attachments-gallery",
    type: "field_attachments_gallery",
    title: "Attachments",
    field: "attachmentsGallery",
    fieldType: "gallery",
    collapsed: false
  },
  {
    id: "widget-1747758922082-parts",
    type: "field_parts",
    title: "Parts Used",
    field: "parts",
    fieldType: "parts",
    collapsed: false
  }
];

export const defaultTicketLayouts: Layouts = {
  lg: [
    {
      w: 4,
      h: 4,
      x: 0,
      y: 0,
      i: "widget-1747758922082-description",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      w: 12,
      h: 7,
      x: 0,
      y: 4,
      i: "widget-1747758922082-assignee-table",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      w: 12,
      h: 5,
      x: 0,
      y: 11,
      i: "widget-1747758922082-time-entries-table",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      w: 4,
      h: 4,
      x: 4,
      y: 0,
      i: "widget-1747758922082-attachments-gallery",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      w: 4,
      h: 4,
      x: 8,
      y: 0,
      i: "widget-1747758922082-parts",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    }
  ],
  md: [
    {
      w: 4,
      h: 5,
      x: 0,
      y: 0,
      i: "widget-1747758922082-description",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: [
        "s",
        "w",
        "e",
        "n",
        "sw",
        "nw",
        "se",
        "ne"
      ]
    },
    {
      w: 12,
      h: 9,
      x: 0,
      y: 5,
      i: "widget-1747758922082-assignee-table",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: [
        "s",
        "w",
        "e",
        "n",
        "sw",
        "nw",
        "se",
        "ne"
      ]
    },
    {
      w: 12,
      h: 6,
      x: 0,
      y: 14,
      i: "widget-1747758922082-time-entries-table",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: [
        "s",
        "w",
        "e",
        "n",
        "sw",
        "nw",
        "se",
        "ne"
      ]
    },
    {
      w: 4,
      h: 5,
      x: 4,
      y: 0,
      i: "widget-1747758922082-attachments-gallery",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: [
        "s",
        "w",
        "e",
        "n",
        "sw",
        "nw",
        "se",
        "ne"
      ]
    },
    {
      w: 4,
      h: 5,
      x: 8,
      y: 0,
      i: "widget-1747758922082-parts",
      minW: 2,
      minH: 2,
      static: false,
      resizeHandles: [
        "s",
        "w",
        "e",
        "n",
        "sw",
        "nw",
        "se",
        "ne"
      ]
    }
  ],
  sm: [
    {
      i: "widget-1747758922082-description",
      x: 0,
      y: 0,
      w: 12,
      h: 3,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-assignee-table",
      x: 0,
      y: 3,
      w: 12,
      h: 5,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-time-entries-table",
      x: 0,
      y: 8,
      w: 12,
      h: 5,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-attachments-gallery",
      x: 0,
      y: 13,
      w: 12,
      h: 3,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-parts",
      x: 0,
      y: 16,
      w: 12,
      h: 3,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    }
  ],
  xs: [
    {
      i: "widget-1747758922082-description",
      x: 0,
      y: 0,
      w: 12,
      h: 3,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-assignee-table",
      x: 0,
      y: 3,
      w: 12,
      h: 5,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-time-entries-table",
      x: 0,
      y: 8,
      w: 12,
      h: 5,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-attachments-gallery",
      x: 0,
      y: 13,
      w: 12,
      h: 3,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    },
    {
      i: "widget-1747758922082-parts",
      x: 0,
      y: 16,
      w: 12,
      h: 3,
      minW: 2,
      minH: 2,
      resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
    }
  ]
};

// Initialize the localStorage with default layouts
export const initializeDefaultLayouts = () => {
  if (typeof window !== 'undefined') {
    // Create the complete structure with both engineering-layouts and tab-tab-1
    const layouts = {
      "engineering-layouts": {
        widgets: defaultTicketWidgets,
        layouts: defaultTicketLayouts
      },
      "tab-tab-1": {
        widgets: [
          {
            id: "widget-1747758922082-description",
            type: "field_description",
            title: "Description",
            field: "description",
            fieldType: "textarea",
            collapsed: false,
            value: "test"
          },
          {
            id: "widget-1747758922082-assignee-table",
            type: "field_assignee_table",
            title: "Team Members",
            field: "assigneeTable",
            fieldType: "table",
            collapsed: false
          },
          {
            id: "widget-1747758922082-time-entries-table",
            type: "field_time_entries_table",
            title: "Time Entries",
            field: "timeEntriesTable",
            fieldType: "table",
            collapsed: false
          },
          {
            id: "widget-1747758922082-attachments-gallery",
            type: "field_attachments_gallery",
            title: "Attachments",
            field: "attachmentsGallery",
            fieldType: "gallery",
            collapsed: false
          },
          {
            id: "widget-1747758922082-parts",
            type: "field_parts",
            title: "Parts Used",
            field: "parts",
            fieldType: "parts",
            collapsed: false
          }
        ],
        layouts: {
          lg: [
            {
              w: 12,
              h: 3,
              x: 0,
              y: 0,
              i: "widget-1747758922082-description",
              minW: 2,
              minH: 2,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              w: 12,
              h: 5,
              x: 0,
              y: 3,
              i: "widget-1747758922082-assignee-table",
              minW: 2,
              minH: 2,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              w: 12,
              h: 5,
              x: 0,
              y: 8,
              i: "widget-1747758922082-time-entries-table",
              minW: 2,
              minH: 2,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              w: 6,
              h: 3,
              x: 0,
              y: 13,
              i: "widget-1747758922082-attachments-gallery",
              minW: 2,
              minH: 2,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              w: 6,
              h: 3,
              x: 6,
              y: 13,
              i: "widget-1747758922082-parts",
              minW: 2,
              minH: 2,
              static: false,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            }
          ],
          md: [
            {
              i: "widget-1747758922082-description",
              x: 0,
              y: 0,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-assignee-table",
              x: 0,
              y: 3,
              w: 12,
              h: 5,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-time-entries-table",
              x: 0,
              y: 8,
              w: 12,
              h: 5,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-attachments-gallery",
              x: 0,
              y: 13,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-parts",
              x: 0,
              y: 16,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            }
          ],
          sm: [
            {
              i: "widget-1747758922082-description",
              x: 0,
              y: 0,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-assignee-table",
              x: 0,
              y: 3,
              w: 12,
              h: 5,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-time-entries-table",
              x: 0,
              y: 8,
              w: 12,
              h: 5,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-attachments-gallery",
              x: 0,
              y: 13,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-parts",
              x: 0,
              y: 16,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            }
          ],
          xs: [
            {
              i: "widget-1747758922082-description",
              x: 0,
              y: 0,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-assignee-table",
              x: 0,
              y: 3,
              w: 12,
              h: 5,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-time-entries-table",
              x: 0,
              y: 8,
              w: 12,
              h: 5,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-attachments-gallery",
              x: 0,
              y: 13,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            },
            {
              i: "widget-1747758922082-parts",
              x: 0,
              y: 16,
              w: 12,
              h: 3,
              minW: 2,
              minH: 2,
              resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"]
            }
          ]
        }
      }
    };
    
    // Save to localStorage
    window.localStorage.setItem("rgl-ticket-layouts", JSON.stringify(layouts));
  }
}; 