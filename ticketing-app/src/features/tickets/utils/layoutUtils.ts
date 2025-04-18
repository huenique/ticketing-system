// Layout/Grid utilities for Tickets
import { Layouts } from "react-grid-layout";

import { WIDGET_TYPES } from "../../../constants/tickets";
import { Row, Tab, Widget } from "../../../types/tickets";
import { getFromLS } from "../../../utils/ticketUtils";

// Generate responsive layouts for widgets similar to bootstrap style
export const generateResponsiveLayouts = (
  widgets: Widget[],
  activeTab: string,
  tabs: Tab[],
  currentTicket: Row,
) => {
  // Check if this tab has the Engineering preset applied
  const currentTabData = tabs.find((tab) => tab.id === activeTab);
  const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

  // Determine the appropriate storage key
  const engineeringLayoutKey = "engineering-layouts";
  let tabSpecificLayoutKey = "";

  if (currentTicket) {
    tabSpecificLayoutKey = `tab-${activeTab}`;
  }

  // Get saved layout state from appropriate storage location
  const storageKey = hasEngineeringPreset ? engineeringLayoutKey : tabSpecificLayoutKey;
  const savedState = getFromLS(storageKey) as
    | { widgets?: Widget[]; layouts?: Layouts }
    | undefined;

  // Check if we have saved layouts in localStorage
  const savedLayouts = savedState?.layouts;

  // If we have saved layouts, use them
  if (savedLayouts && Object.keys(savedLayouts).length > 0) {
    console.log(`Using saved layouts from ${storageKey}`);

    // Make sure we have layouts for each widget
    const allWidgetsHaveLayouts = widgets.every((widget) =>
      Object.keys(savedLayouts).some(
        (breakpoint) =>
          Array.isArray(savedLayouts[breakpoint]) &&
          savedLayouts[breakpoint].some((layout) => layout.i === widget.id),
      ),
    );

    if (allWidgetsHaveLayouts) {
      return savedLayouts;
    } else {
      console.log(
        "Some widgets are missing layouts in saved state, generating new layouts",
      );
    }
  }

  console.log("Generating new layouts from scratch");
  if (!widgets.length) return { lg: [], md: [], sm: [], xs: [], xxs: [] };

  // Define width ratios for different breakpoints
  const widths = { lg: 3, md: 4, sm: 6, xs: 6, xxs: 4 };

  // Create layouts for each breakpoint
  return Object.keys(widths).reduce(
    (memo, breakpoint) => {
      // const width = widths[breakpoint as keyof typeof widths]
      const cols = breakpoint === "xxs" ? 4 : breakpoint === "xs" ? 6 : 12;

      // Group widgets by type for layout placement
      const statusWidget = widgets.find((w) => w.type === WIDGET_TYPES.FIELD_STATUS);
      const customerWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_CUSTOMER_NAME,
      );
      const dateCreatedWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_DATE_CREATED,
      );
      const lastModifiedWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_LAST_MODIFIED,
      );
      const billableHoursWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_BILLABLE_HOURS,
      );
      const totalHoursWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_TOTAL_HOURS,
      );
      const descriptionWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_DESCRIPTION,
      );
      const assigneeTableWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_ASSIGNEE_TABLE,
      );
      const timeEntriesTableWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE,
      );
      const attachmentsGalleryWidget = widgets.find(
        (w) => w.type === WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY,
      );

      // Filter out the widgets we've already positioned to get "other" widgets
      const otherWidgets = widgets.filter(
        (w) =>
          w.type !== WIDGET_TYPES.FIELD_STATUS &&
          w.type !== WIDGET_TYPES.FIELD_CUSTOMER_NAME &&
          w.type !== WIDGET_TYPES.FIELD_DATE_CREATED &&
          w.type !== WIDGET_TYPES.FIELD_LAST_MODIFIED &&
          w.type !== WIDGET_TYPES.FIELD_BILLABLE_HOURS &&
          w.type !== WIDGET_TYPES.FIELD_TOTAL_HOURS &&
          w.type !== WIDGET_TYPES.FIELD_DESCRIPTION &&
          w.type !== WIDGET_TYPES.FIELD_ASSIGNEE_TABLE &&
          w.type !== WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE &&
          w.type !== WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY,
      );

      // Initialize layouts
      const layouts: {
        i: string;
        x: number;
        y: number;
        w: number;
        h: number;
        minW: number;
        minH: number;
        resizeHandles: string[];
      }[] = [];

      // Define column spans for different screen sizes
      const halfCol = breakpoint === "xxs" || breakpoint === "xs" ? cols : 6;
      const fullCol = cols;

      // Position the widgets
      let yPos = 0;

      // Row 1: Status (left) and Customer (right)
      if (statusWidget) {
        layouts.push({
          i: statusWidget.id,
          x: 0,
          y: yPos,
          w: halfCol,
          h: 2,
          minW: 2,
          minH: 2,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      if (customerWidget) {
        layouts.push({
          i: customerWidget.id,
          x: halfCol,
          y: yPos,
          w: halfCol,
          h: 2,
          minW: 2,
          minH: 2,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      yPos += 2;

      // Row 2: Date Created (left) and Last Modified (right)
      if (dateCreatedWidget) {
        layouts.push({
          i: dateCreatedWidget.id,
          x: 0,
          y: yPos,
          w: halfCol,
          h: 2,
          minW: 2,
          minH: 2,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      if (lastModifiedWidget) {
        layouts.push({
          i: lastModifiedWidget.id,
          x: halfCol,
          y: yPos,
          w: halfCol,
          h: 2,
          minW: 2,
          minH: 2,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      yPos += 2;

      // Row 3: Billable Hours (left) and Total Hours (right)
      if (billableHoursWidget) {
        layouts.push({
          i: billableHoursWidget.id,
          x: 0,
          y: yPos,
          w: halfCol,
          h: 2,
          minW: 2,
          minH: 2,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      if (totalHoursWidget) {
        layouts.push({
          i: totalHoursWidget.id,
          x: halfCol,
          y: yPos,
          w: halfCol,
          h: 2,
          minW: 2,
          minH: 2,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      yPos += 2;

      // Row 4: Description (full width)
      if (descriptionWidget) {
        layouts.push({
          i: descriptionWidget.id,
          x: 0,
          y: yPos,
          w: fullCol,
          h: 4,
          minW: 2,
          minH: 3,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      yPos += 4;

      // Row 5: Assignee Table (full width)
      if (assigneeTableWidget) {
        layouts.push({
          i: assigneeTableWidget.id,
          x: 0,
          y: yPos,
          w: fullCol,
          h: 5,
          minW: 4,
          minH: 4,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      yPos += 5;

      // Row 6: Time Entries Table (full width)
      if (timeEntriesTableWidget) {
        layouts.push({
          i: timeEntriesTableWidget.id,
          x: 0,
          y: yPos,
          w: fullCol,
          h: 5,
          minW: 4,
          minH: 4,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      yPos += 5;

      // Row 7: Attachments Gallery (full width)
      if (attachmentsGalleryWidget) {
        layouts.push({
          i: attachmentsGalleryWidget.id,
          x: 0,
          y: yPos,
          w: fullCol,
          h: 5,
          minW: 4,
          minH: 4,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });
      }

      yPos += 5;

      // Position any other widgets below
      let otherX = 0;
      let otherY = yPos;

      otherWidgets.forEach((widget) => {
        const w = breakpoint === "xxs" ? cols : breakpoint === "xs" ? 3 : 3;
        const h = 2;

        // If otherX + w exceeds cols, move to next row
        if (otherX + w > cols) {
          otherX = 0;
          otherY += h;
        }

        layouts.push({
          i: widget.id,
          x: otherX,
          y: otherY,
          w,
          h,
          minW: 2,
          minH: 2,
          resizeHandles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
        });

        otherX += w;
      });

      memo[breakpoint] = layouts;

      return memo;
    },
    {} as {
      [key: string]: { i: string; x: number; y: number; w: number; h: number }[];
    },
  );
};
