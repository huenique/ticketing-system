import { useState, useEffect, useCallback } from "react";
import { Layout, Layouts } from "react-grid-layout";
import { Widget, TicketForm } from "../types/tickets";
import { WIDGET_TYPES } from "../constants/tickets";

/**
 * Custom hook to manage widget operations
 */
export function useWidgets(ticketForm: TicketForm) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);

  // State for grid layout
  const [widgetLayouts, setWidgetLayouts] = useState<Layouts>({
    lg: [],
    md: [],
    sm: [],
  });

  // Widget drag handlers
  // const handleWidgetDragStart = (e: React.DragEvent, widgetId: string) => {
  //   setIsDraggingWidget(true)
  //   setDraggedWidget(widgetId)
  //   e.dataTransfer.setData("widget", widgetId)

  //   // Apply visual effect to the dragged widget
  //   setTimeout(() => {
  //     setWidgets(prev =>
  //       prev.map(widget => widget.id === widgetId
  //         ? { ...widget, isDragging: true }
  //         : widget
  //       )
  //     )
  //   }, 0)
  // }

  // const handleWidgetDragEnd = () => {
  //   setIsDraggingWidget(false)
  //   setDraggedWidget(null)
  //   setWidgets(prev => prev.map(widget => ({ ...widget, isDragging: false })))
  // }

  // const handleWidgetDragOver = (e: React.DragEvent) => {
  //   e.preventDefault()
  // }

  // const handleWidgetDrop = (e: React.DragEvent, targetWidgetId: string) => {
  //   e.preventDefault()
  //   if (!draggedWidget || draggedWidget === targetWidgetId) return

  //   const draggedWidgetIndex = widgets.findIndex(widget => widget.id === draggedWidget)
  //   const targetWidgetIndex = widgets.findIndex(widget => widget.id === targetWidgetId)

  //   if (draggedWidgetIndex === -1 || targetWidgetIndex === -1) return

  //   // Reorder widgets
  //   const newWidgets = [...widgets]
  //   const [draggedWidgetItem] = newWidgets.splice(draggedWidgetIndex, 1)
  //   newWidgets.splice(targetWidgetIndex, 0, draggedWidgetItem)

  //   setWidgets(newWidgets)
  //   setIsDraggingWidget(false)
  //   setDraggedWidget(null)
  // }

  // Toggle widget collapse state
  const toggleWidgetCollapse = useCallback((widgetId: string) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId
          ? { ...widget, isCollapsed: !widget.isCollapsed }
          : widget,
      ),
    );
  }, []);

  // Add a new widget to the dialog
  const addWidget = (type: string, currentTicket?: Record<string, any>) => {
    const newWidgetId = `widget-${Date.now()}`;
    let title = "New Widget";
    let width = 12;
    let height = 4;
    let fieldType = "";
    let fieldName = "";
    let fieldValue = null;

    // Configure widget based on type
    switch (type) {
      // Group widgets
      case WIDGET_TYPES.DETAILS:
        title = "Ticket Details";
        width = 12;
        height = 4;
        break;
      case WIDGET_TYPES.ASSIGNEES:
        title = "Team Members";
        width = 12;
        height = 5;
        break;
      case WIDGET_TYPES.TIME_ENTRIES:
        title = "Time Entries";
        width = 12;
        height = 5;
        break;
      case WIDGET_TYPES.NOTES:
        title = "Notes";
        width = 6;
        height = 3;
        break;
      case WIDGET_TYPES.ATTACHMENTS:
        title = "Attachments";
        width = 6;
        height = 3;
        break;

      // Individual field widgets
      case WIDGET_TYPES.FIELD_STATUS:
        title = "Status";
        fieldType = "select";
        fieldName = "status";
        fieldValue = ticketForm.status;
        width = 6;
        height = 4;
        break;
      // title = "Description"
      // fieldType = "textarea"
      // fieldName = "description"
      // fieldValue = ticketForm.description
      // width = 12
      // height = 3
      // break
      case WIDGET_TYPES.FIELD_CUSTOMER_NAME:
        title = "Customer Name";
        fieldType = "text-readonly";
        fieldName = "customerName";
        fieldValue = currentTicket?.cells["col-3"] || "";
        width = 6;
        height = 2;
        break;
      case WIDGET_TYPES.FIELD_DATE_CREATED:
        title = "Date Created";
        fieldType = "text-readonly";
        fieldName = "dateCreated";
        fieldValue = currentTicket?.cells["col-2"] || "";
        width = 4;
        height = 2;
        break;
      case WIDGET_TYPES.FIELD_LAST_MODIFIED:
        title = "Last Modified";
        fieldType = "text-readonly";
        fieldName = "lastModified";
        fieldValue = currentTicket?.cells["col-10"] || "";
        width = 4;
        height = 2;
        break;
      case WIDGET_TYPES.FIELD_BILLABLE_HOURS:
        title = "Billable Hours";
        fieldType = "number";
        fieldName = "billableHours";
        fieldValue = ticketForm.billableHours;
        width = 4;
        height = 2;
        break;
      case WIDGET_TYPES.FIELD_TOTAL_HOURS:
        title = "Total Hours";
        fieldType = "number";
        fieldName = "totalHours";
        fieldValue = ticketForm.totalHours;
        width = 4;
        height = 2;
        break;
      case WIDGET_TYPES.FIELD_DESCRIPTION:
        title = "Description";
        fieldType = "textarea";
        fieldName = "description";
        fieldValue = ticketForm.description;
        width = 12;
        height = 3;
        break;
    }

    const newWidget: Widget = {
      id: newWidgetId,
      type,
      title,
      isCollapsed: false,
      fieldType,
      fieldName,
      fieldValue,
      width,
      height,
    };

    // Add the widget to the state
    setWidgets((prev) => [...prev, newWidget]);

    // Calculate the next position based on existing widgets
    const y = widgetLayouts.lg.reduce((maxY, layout) => {
      return Math.max(maxY, layout.y + layout.h);
    }, 0);

    // Add layouts for each breakpoint
    const newLayouts = { ...widgetLayouts };

    // For large screens
    newLayouts.lg = [
      ...newLayouts.lg,
      { i: newWidgetId, x: 0, y, w: width, h: height, minW: 2, minH: 1 },
    ];

    // For medium screens (adjust width)
    newLayouts.md = [
      ...newLayouts.md,
      { i: newWidgetId, x: 0, y, w: Math.min(6, width), h: height, minW: 2, minH: 1 },
    ];

    // For small screens (full width)
    newLayouts.sm = [
      ...newLayouts.sm,
      { i: newWidgetId, x: 0, y, w: 4, h: height, minW: 2, minH: 1 },
    ];

    setWidgetLayouts(newLayouts);
  };

  // Remove a widget
  const removeWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId));
  };

  // Handle layout changes
  const onLayoutChange = useCallback((layout: Layout[], layouts: Layouts) => {
    // Save the user-modified layouts when they change
    setWidgetLayouts(layouts);
  }, []);

  // Update layouts when widgets change
  useEffect(() => {
    // Only update if we have layouts saved (from user modifications)
    // Otherwise the generateResponsiveLayouts function in the Tickets component will handle it
  }, [widgets]);

  // Field change handler
  const handleFieldChange = (fieldName: string, value: any) => {
    if (!fieldName) return;

    // Update the widget's fieldValue
    setWidgets((prev) =>
      prev.map((w) => (w.fieldName === fieldName ? { ...w, fieldValue: value } : w)),
    );
  };

  // Add this effect to update the layouts when widgets change
  useEffect(() => {
    // This ensures that newly added widgets have proper layout entries
    const widgetIds = widgets.map((w) => w.id);
    const layoutWidgetIds = widgetLayouts.lg.map((l) => l.i);

    // Check if there are widgets without layouts
    const needsLayoutUpdate = widgetIds.some((id) => !layoutWidgetIds.includes(id));

    if (needsLayoutUpdate) {
      const newLayouts = { ...widgetLayouts };

      // Add missing widgets to layouts
      widgets.forEach((widget) => {
        if (!layoutWidgetIds.includes(widget.id)) {
          // Calculate the next position based on existing widgets
          const y = newLayouts.lg.reduce((maxY, layout) => {
            return Math.max(maxY, layout.y + layout.h);
          }, 0);

          const wSize = widget.width;
          const hSize = widget.height;

          // Add to layouts for each breakpoint
          newLayouts.lg.push({
            i: widget.id,
            x: 0,
            y,
            w: wSize,
            h: hSize,
            minW: 2,
            minH: 1,
          });

          newLayouts.md.push({
            i: widget.id,
            x: 0,
            y,
            w: Math.min(6, wSize),
            h: hSize,
            minW: 2,
            minH: 1,
          });

          newLayouts.sm.push({
            i: widget.id,
            x: 0,
            y,
            w: 4,
            h: hSize,
            minW: 2,
            minH: 1,
          });
        }
      });

      setWidgetLayouts(newLayouts);
    }
  }, [widgets, widgetLayouts]);

  // Update widget field values when ticket form changes
  useEffect(() => {
    // Update any field widgets when the ticket form changes
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) => {
        if (widget.fieldName) {
          // Only update widgets with fieldName property
          const fieldName = widget.fieldName as keyof typeof ticketForm;

          if (fieldName in ticketForm) {
            return {
              ...widget,
              fieldValue: ticketForm[fieldName],
            };
          }
        }
        return widget;
      }),
    );
  }, [ticketForm]);

  return {
    widgets,
    setWidgets,
    widgetLayouts,
    setWidgetLayouts,
    toggleWidgetCollapse,
    addWidget,
    removeWidget,
    onLayoutChange,
    handleFieldChange,
  };
}
