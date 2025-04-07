import { Layout, Layouts } from "react-grid-layout";
import { create } from "zustand";

import { WIDGET_TYPES } from "../constants/tickets";
import { Row, TicketForm,Widget } from "../types/tickets";
import { persist } from "./middleware";

interface WidgetsState {
  widgets: Widget[];
  widgetLayouts: Layouts;

  // Actions
  setWidgets: (widgets: Widget[]) => void;
  setWidgetLayouts: (layouts: Layouts) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  addWidget: (widgetType: string, currentTicket: Row | null) => void;
  removeWidget: (widgetId: string) => void;
  onLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  handleFieldChange: (field: string, value: string, widgetId?: string) => void;
  resetWidgets: () => void;
}

const useWidgetsStore = create<WidgetsState>()(
  persist(
    (set, get) => ({
      // State
      widgets: [],
      widgetLayouts: {},

      // Actions
      setWidgets: (widgets) => set({ widgets }),
      setWidgetLayouts: (widgetLayouts) => set({ widgetLayouts }),

      toggleWidgetCollapse: (widgetId) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === widgetId
              ? { ...widget, collapsed: !widget.collapsed }
              : widget,
          ),
        }));
      },

      addWidget: (widgetType, currentTicket) => {
        const { widgets } = get();

        // Check if this widget type already exists for unique widgets
        if (
          widgetType === WIDGET_TYPES.DETAILS ||
          widgetType === WIDGET_TYPES.ASSIGNEES ||
          widgetType === WIDGET_TYPES.TIME_ENTRIES ||
          widgetType === WIDGET_TYPES.ATTACHMENTS ||
          widgetType === WIDGET_TYPES.NOTES ||
          widgetType === WIDGET_TYPES.FIELD_ASSIGNEE_TABLE ||
          widgetType === WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE ||
          widgetType === WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY
        ) {
          // For group widgets, check if we already have one of this type
          if (widgets.some((widget) => widget.type === widgetType)) {
            return; // Don't add duplicate group widgets
          }
        }

        // For field widgets, check if we already have one that manipulates the same field
        const fieldMapping: Record<string, string> = {
          [WIDGET_TYPES.FIELD_STATUS]: "status",
          [WIDGET_TYPES.FIELD_CUSTOMER_NAME]: "customerName",
          [WIDGET_TYPES.FIELD_DATE_CREATED]: "dateCreated",
          [WIDGET_TYPES.FIELD_LAST_MODIFIED]: "lastModified",
          [WIDGET_TYPES.FIELD_BILLABLE_HOURS]: "billableHours",
          [WIDGET_TYPES.FIELD_TOTAL_HOURS]: "totalHours",
          [WIDGET_TYPES.FIELD_DESCRIPTION]: "description",
          [WIDGET_TYPES.FIELD_ASSIGNEE_TABLE]: "assigneeTable",
          [WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE]: "timeEntriesTable",
          [WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY]: "attachmentsGallery",
        };

        const fieldToManipulate = fieldMapping[widgetType];
        if (
          fieldToManipulate &&
          widgets.some((widget) => widget.field === fieldToManipulate)
        ) {
          return; // Don't add duplicate field widgets
        }

        // Create a new widget with default values based on type
        let newWidget: Widget;

        switch (widgetType) {
          case WIDGET_TYPES.DETAILS:
            newWidget = {
              id: `widget-${Date.now()}-details`,
              type: WIDGET_TYPES.DETAILS,
              title: "Ticket Details",
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.ASSIGNEES:
            newWidget = {
              id: `widget-${Date.now()}-assignees`,
              type: WIDGET_TYPES.ASSIGNEES,
              title: "Team Members",
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.TIME_ENTRIES:
            newWidget = {
              id: `widget-${Date.now()}-time-entries`,
              type: WIDGET_TYPES.TIME_ENTRIES,
              title: "Time Entries",
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.ATTACHMENTS:
            newWidget = {
              id: `widget-${Date.now()}-attachments`,
              type: WIDGET_TYPES.ATTACHMENTS,
              title: "Attachments",
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.NOTES:
            newWidget = {
              id: `widget-${Date.now()}-notes`,
              type: WIDGET_TYPES.NOTES,
              title: "Notes",
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.FIELD_STATUS:
            newWidget = {
              id: `widget-${Date.now()}-status`,
              type: WIDGET_TYPES.FIELD_STATUS,
              title: "Status",
              field: "status",
              fieldType: "select",
              options: ["New", "In Progress", "Pending", "Completed", "Cancelled"],
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.FIELD_CUSTOMER_NAME:
            newWidget = {
              id: `widget-${Date.now()}-customer`,
              type: WIDGET_TYPES.FIELD_CUSTOMER_NAME,
              title: "Customer",
              field: "customerName",
              fieldType: "text-readonly", // Assuming this field is read-only in our implementation
              collapsed: false,
              value: currentTicket?.cells["col-3"] || "",
            };
            break;

          case WIDGET_TYPES.FIELD_DATE_CREATED:
            newWidget = {
              id: `widget-${Date.now()}-date-created`,
              type: WIDGET_TYPES.FIELD_DATE_CREATED,
              title: "Date Created",
              field: "dateCreated",
              fieldType: "text-readonly",
              collapsed: false,
              value: currentTicket?.cells["col-5"] || new Date().toLocaleDateString(),
            };
            break;

          case WIDGET_TYPES.FIELD_LAST_MODIFIED:
            newWidget = {
              id: `widget-${Date.now()}-last-modified`,
              type: WIDGET_TYPES.FIELD_LAST_MODIFIED,
              title: "Last Modified",
              field: "lastModified",
              fieldType: "text-readonly",
              collapsed: false,
              value: new Date().toLocaleDateString(),
            };
            break;

          case WIDGET_TYPES.FIELD_BILLABLE_HOURS:
            newWidget = {
              id: `widget-${Date.now()}-billable-hours`,
              type: WIDGET_TYPES.FIELD_BILLABLE_HOURS,
              title: "Billable Hours",
              field: "billableHours",
              fieldType: "number",
              collapsed: false,
              value: currentTicket?.cells["col-9"] || "0.0",
            };
            break;

          case WIDGET_TYPES.FIELD_TOTAL_HOURS:
            newWidget = {
              id: `widget-${Date.now()}-total-hours`,
              type: WIDGET_TYPES.FIELD_TOTAL_HOURS,
              title: "Total Hours",
              field: "totalHours",
              fieldType: "number",
              collapsed: false,
              value: currentTicket?.cells["col-8"] || "0.0",
            };
            break;

          case WIDGET_TYPES.FIELD_DESCRIPTION:
            newWidget = {
              id: `widget-${Date.now()}-description`,
              type: WIDGET_TYPES.FIELD_DESCRIPTION,
              title: "Description",
              field: "description",
              fieldType: "textarea",
              collapsed: false,
              value: currentTicket?.cells["col-4"] || "",
            };
            break;

          case WIDGET_TYPES.FIELD_ASSIGNEE_TABLE:
            newWidget = {
              id: `widget-${Date.now()}-assignee-table`,
              type: WIDGET_TYPES.FIELD_ASSIGNEE_TABLE,
              title: "Team Members",
              field: "assigneeTable",
              fieldType: "table",
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE:
            newWidget = {
              id: `widget-${Date.now()}-time-entries-table`,
              type: WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE,
              title: "Time Entries",
              field: "timeEntriesTable",
              fieldType: "table",
              collapsed: false,
            };
            break;

          case WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY:
            newWidget = {
              id: `widget-${Date.now()}-attachments-gallery`,
              type: WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY,
              title: "Attachments",
              field: "attachmentsGallery",
              fieldType: "gallery",
              collapsed: false,
            };
            break;

          default:
            // Default field widget
            newWidget = {
              id: `widget-${Date.now()}-${widgetType}`,
              type: widgetType,
              title: widgetType.replace(/-/g, " "),
              collapsed: false,
            };
        }

        // Add the new widget
        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      removeWidget: (widgetId) => {
        set((state) => ({
          widgets: state.widgets.filter((widget) => widget.id !== widgetId),
        }));
      },

      onLayoutChange: (currentLayout, allLayouts) => {
        // Save the new layouts
        set({ widgetLayouts: allLayouts });
      },

      handleFieldChange: (field, value, widgetId) => {
        // Update the relevant field in the form
        set((state) => {
          // If widgetId is provided, we also want to update the widget's value
          if (widgetId) {
            return {
              widgets: state.widgets.map((widget) =>
                widget.id === widgetId ? { ...widget, value } : widget,
              ),
            };
          }

          // Otherwise, just update any widget that uses this field
          return {
            widgets: state.widgets.map((widget) =>
              widget.field === field ? { ...widget, value } : widget,
            ),
          };
        });
      },

      resetWidgets: () => {
        set({
          widgets: [],
          widgetLayouts: {},
        });
      },
    }),
    {
      name: "ticket-widgets-storage",
      partialize: (state) => ({
        widgets: state.widgets,
        widgetLayouts: state.widgetLayouts,
      }),
    },
  ),
);

export default useWidgetsStore;
