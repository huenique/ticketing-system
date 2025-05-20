import { Layout, Layouts } from "react-grid-layout";
import { WIDGET_TYPES } from "../../../constants/tickets";
import { Row, Tab, Widget } from "../../../types/tickets";

// Optimize layout generation for the ticket dialog
export const generateResponsiveLayouts = (
  widgets: Widget[],
  activeTab: string,
  tabs: Tab[],
  currentTicket: Row
): Layouts => {
  // Find the current tab
  const currentTabData = tabs.find((tab) => tab.id === activeTab);
  const isEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

  // Default layouts for different breakpoints
  const layouts: Layouts = {
    lg: [],
    md: [],
    sm: [],
    xs: [],
    xxs: [],
  };

  // Group widgets by type for optimization
  const statusWidget = widgets.find(w => w.type === WIDGET_TYPES.FIELD_STATUS);
  const customerWidget = widgets.find(w => w.type === WIDGET_TYPES.FIELD_CUSTOMER_NAME);
  const dateCreatedWidget = widgets.find(w => w.type === WIDGET_TYPES.FIELD_DATE_CREATED);
  const lastModifiedWidget = widgets.find(w => w.type === WIDGET_TYPES.FIELD_LAST_MODIFIED);
  const billableHoursWidget = widgets.find(w => w.type === WIDGET_TYPES.FIELD_BILLABLE_HOURS);
  const totalHoursWidget = widgets.find(w => w.type === WIDGET_TYPES.FIELD_TOTAL_HOURS);
  const descriptionWidget = widgets.find(w => w.type === WIDGET_TYPES.FIELD_DESCRIPTION);
  const assigneesWidget = widgets.find(w => w.type === WIDGET_TYPES.ASSIGNEES || w.type === WIDGET_TYPES.FIELD_ASSIGNEE_TABLE);
  const timeEntriesWidget = widgets.find(w => w.type === WIDGET_TYPES.TIME_ENTRIES || w.type === WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE);
  const attachmentsWidget = widgets.find(w => w.type === WIDGET_TYPES.ATTACHMENTS || w.type === WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY);

  // Group related widgets to save space
  let row = 0;
  
  // First group: Info & Status widgets (all in first row)
  if (statusWidget && customerWidget) {
    // Place status and customer on same row
    addToLayouts(layouts, statusWidget.id, 0, row, 3, 1);
    addToLayouts(layouts, customerWidget.id, 3, row, 9, 1);
  } else if (statusWidget) {
    addToLayouts(layouts, statusWidget.id, 0, row, 12, 1);
  } else if (customerWidget) {
    addToLayouts(layouts, customerWidget.id, 0, row, 12, 1);
  }
  
  // Second row: Dates group
  row++;
  if (dateCreatedWidget && lastModifiedWidget) {
    addToLayouts(layouts, dateCreatedWidget.id, 0, row, 6, 1);
    addToLayouts(layouts, lastModifiedWidget.id, 6, row, 6, 1);
  } else if (dateCreatedWidget) {
    addToLayouts(layouts, dateCreatedWidget.id, 0, row, 12, 1);
  } else if (lastModifiedWidget) {
    addToLayouts(layouts, lastModifiedWidget.id, 0, row, 12, 1);
  }
  
  // Third row: Hours group
  row++;
  if (billableHoursWidget && totalHoursWidget) {
    addToLayouts(layouts, billableHoursWidget.id, 0, row, 6, 1);
    addToLayouts(layouts, totalHoursWidget.id, 6, row, 6, 1);
  } else if (billableHoursWidget) {
    addToLayouts(layouts, billableHoursWidget.id, 0, row, 12, 1);
  } else if (totalHoursWidget) {
    addToLayouts(layouts, totalHoursWidget.id, 0, row, 12, 1);
  }
  
  // Fourth row: Description (takes up more vertical space)
  row++;
  if (descriptionWidget) {
    addToLayouts(layouts, descriptionWidget.id, 0, row, 12, 3);
    row += 2; // Description spans 3 rows
  }
  
  // Fifth row: Team Members/Assignees (takes significant vertical space)
  if (assigneesWidget) {
    addToLayouts(layouts, assigneesWidget.id, 0, row, 12, 5);
    row += 5;
  }
  
  // Sixth row: Time Entries
  if (timeEntriesWidget) {
    addToLayouts(layouts, timeEntriesWidget.id, 0, row, 12, 4);
    row += 4;
  }
  
  // Seventh row: Attachments
  if (attachmentsWidget) {
    addToLayouts(layouts, attachmentsWidget.id, 0, row, 12, 3);
    row += 3;
  }
  
  // Handle remaining widgets (if any)
  const handledWidgetIds = [
    statusWidget?.id, customerWidget?.id, dateCreatedWidget?.id, 
    lastModifiedWidget?.id, billableHoursWidget?.id, totalHoursWidget?.id,
    descriptionWidget?.id, assigneesWidget?.id, timeEntriesWidget?.id,
    attachmentsWidget?.id
  ].filter(Boolean) as string[];
  
  const remainingWidgets = widgets.filter(w => !handledWidgetIds.includes(w.id));
  
  if (remainingWidgets.length > 0) {
    // Start remaining widgets after the last positioned widget
    remainingWidgets.forEach((widget, index) => {
      // Place 4 widgets per row (3 columns each)
      const colPosition = (index % 4) * 3;
      const rowPosition = row + Math.floor(index / 4);
      
      addToLayouts(layouts, widget.id, colPosition, rowPosition, 3, 1);
    });
  }

  return layouts;
};

// Helper function to add layout settings to all breakpoints
function addToLayouts(
  layouts: Layouts,
  widgetId: string,
  x: number,
  y: number, 
  w: number,
  h: number
) {
  const baseLayout: Layout = {
    i: widgetId,
    x,
    y,
    w,
    h,
    minW: 1,
    minH: 1,
  };
  
  // Add to lg (same as base)
  layouts.lg.push({ ...baseLayout });
  
  // For md, adjust if needed
  layouts.md.push({ ...baseLayout });
  
  // For sm, stack more vertically
  layouts.sm.push({
    ...baseLayout,
    x: x > 6 ? 6 : x,
    w: Math.min(w, 6),
  });
  
  // For xs, take full width
  layouts.xs.push({
    ...baseLayout,
    x: 0,
    w: 6,
  });
  
  // For xxs, take full width
  layouts.xxs.push({
    ...baseLayout,
    x: 0,
    w: 4,
  });
} 