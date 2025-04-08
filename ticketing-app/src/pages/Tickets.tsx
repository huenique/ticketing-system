import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Fragment, useEffect, useState } from "react";
import { Layout, Layouts, Responsive, WidthProvider } from "react-grid-layout";

// Import components
import TabNavigation from "../components/TabNavigation";
import TicketWidget from "../components/TicketWidget";
import { WIDGET_TYPES } from "../constants/tickets";
import useColumnsStore from "../stores/columnsStore";
import useTablesStore from "../stores/tablesStore";
// Import Zustand stores
import useTabsStore from "../stores/tabsStore";
import useUserStore from "../stores/userStore";
import useWidgetsStore from "../stores/widgetsStore";
// Import types, constants and utilities
import { Assignee, Row, TicketForm, TimeEntry, Widget } from "../types/tickets";
import {
  getFromLS,
  getGridStyles,
  getSavedTabsData,
  getScrollbarStyles,
  saveToLS,
} from "../utils/ticketUtils";

const ResponsiveGridLayout = WidthProvider(Responsive);

function Tickets() {
  // Use Zustand stores
  const {
    tabs,
    activeTab,
    editingTab,
    editingTitle,
    setEditingTitle,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    addTab,
    closeTab,
    handleDoubleClick,
    handleRenameKeyDown,
  } = useTabsStore();

  const {
    tables,
    tabsSaved,
    showPresetsMenu,
    saveTabs,
    resetTabs,
    createNewTable,
    addColumn,
    addRow,
    applyPreset,
    removeColumn,
    saveTicketChanges,
  } = useTablesStore();

  const {
    editingColumn,
    editingColumnTitle,
    setEditingColumnTitle,
    handleColumnDoubleClick,
    saveColumnName,
    handleColumnRenameKeyDown,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  } = useColumnsStore();

  const {
    widgets,
    widgetLayouts,
    setWidgets,
    setWidgetLayouts,
    toggleWidgetCollapse,
    addWidget,
    removeWidget,
    onLayoutChange,
    handleFieldChange,
  } = useWidgetsStore();

  const { currentUser } = useUserStore();

  // State for ticket view dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Row | null>(null);
  const [currentTicketPreset, setCurrentTicketPreset] = useState<string | undefined>(
    undefined,
  );
  const [ticketForm, setTicketForm] = useState<TicketForm>({
    status: "",
    description: "",
    billableHours: "",
    totalHours: "",
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [, setAssigneeTableTitle] = useState("Assigned Team Members");
  const [newAssignee, setNewAssignee] = useState<Assignee>({
    id: "",
    name: "",
    workDescription: "",
    totalHours: "0",
    estTime: "0",
    priority: "3",
  });
  const [showAssigneeForm, setShowAssigneeForm] = useState(false);
  const [isEditLayoutMode, setIsEditLayoutMode] = useState(false);

  // Initialize data from localStorage
  (() => {
    const { tabs, activeTab } = getSavedTabsData();
    if (tabs) {
      useTabsStore.getState().setTabs(tabs);
    }
    if (activeTab) {
      useTabsStore.getState().setActiveTab(activeTab);
    }
  })();

  // Load tables from localStorage on initial render
  useEffect(() => {
    const savedTables = localStorage.getItem("ticket-tables");
    if (savedTables) {
      useTablesStore.getState().setTables(JSON.parse(savedTables));
    }
  }, []);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // In a real app, you would upload these files to a server
    // For demo purposes, we'll just create URLs for the images
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file));
    setUploadedImages((prev) => [...prev, ...newImages]);
  };

  // Handle adding a new assignee
  const handleAddAssignee = () => {
    if (newAssignee.name.trim() === "") return;

    const assigneeId = `a${Date.now()}`;
    const assigneeToAdd: Assignee = {
      ...newAssignee,
      id: assigneeId,
    };

    setAssignees((prev) => [...prev, assigneeToAdd]);
    setNewAssignee({
      id: "",
      name: "",
      workDescription: "",
      totalHours: "0",
      estTime: "0",
      priority: "3",
    });
    setShowAssigneeForm(false);
  };

  // Handle removing an assignee
  const handleRemoveAssignee = (id: string) => {
    setAssignees((prev) => prev.filter((a) => a.id !== id));
    // Also remove related time entries
    setTimeEntries((prev) => prev.filter((t) => t.assigneeId !== id));
  };

  // Handle updating an assignee
  const handleUpdateAssignee = (id: string, field: string, value: string) => {
    setAssignees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  };

  // Handle adding a time entry for an assignee
  const handleAddTimeEntry = (assigneeId: string) => {
    const assignee = assignees.find((a) => a.id === assigneeId);
    if (!assignee) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedDate = now.toLocaleDateString();

    const newTimeEntry: TimeEntry = {
      id: `t${Date.now()}`,
      assigneeId,
      assigneeName: assignee.name,
      startTime: formattedTime,
      stopTime: "",
      duration: "0",
      dateCreated: formattedDate,
      remarks: "",
    };

    setTimeEntries((prev) => [...prev, newTimeEntry]);
  };

  // Handle updating a time entry
  const handleUpdateTimeEntry = (id: string, field: string, value: string) => {
    setTimeEntries((prev) =>
      prev.map((entry) => {
        if (entry.id === id) {
          const updatedEntry = { ...entry, [field]: value };

          // Recalculate duration if start or stop time changes
          if (field === "startTime" || field === "stopTime") {
            if (updatedEntry.startTime && updatedEntry.stopTime) {
              // Parse times (assuming format is HH:MM)
              const [startHours, startMinutes] = updatedEntry.startTime
                .split(":")
                .map(Number);
              const [stopHours, stopMinutes] = updatedEntry.stopTime
                .split(":")
                .map(Number);

              // Calculate duration in hours
              let durationHours = stopHours - startHours;
              let durationMinutes = stopMinutes - startMinutes;

              if (durationMinutes < 0) {
                durationHours -= 1;
                durationMinutes += 60;
              }

              if (durationHours < 0) {
                // Assuming stop time is next day if it's earlier than start time
                durationHours += 24;
              }

              const totalDuration = durationHours + durationMinutes / 60;
              updatedEntry.duration = totalDuration.toFixed(1);
            }
          }

          return updatedEntry;
        }
        return entry;
      }),
    );
  };

  // Handle removing a time entry
  const handleRemoveTimeEntry = (id: string) => {
    setTimeEntries(timeEntries.filter((entry) => entry.id !== id));
  };

  // Update widget title
  const updateWidgetTitle = (widgetId: string, newTitle: string) => {
    const updatedWidgets = widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, title: newTitle } : widget,
    );
    setWidgets(updatedWidgets);
  };

  // Add a new function to apply a custom widget layout
  // const applyCustomWidgetLayout = (ticket: Row) => {
  //   // Clear any existing widgets first
  //   setWidgets([]);
  //   setWidgetLayouts({});

  //   // Add individual widgets in a specific order to create a logical layout

  //   // Status field
  //   addWidget(WIDGET_TYPES.FIELD_STATUS, ticket);

  //   // Customer name field
  //   addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME, ticket);

  //   // Date fields
  //   addWidget(WIDGET_TYPES.FIELD_DATE_CREATED, ticket);
  //   addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED, ticket);

  //   // Description field
  //   addWidget(WIDGET_TYPES.FIELD_DESCRIPTION, ticket);

  //   // Hours fields
  //   addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS, ticket);
  //   addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS, ticket);

  //   // Individual versions of the larger widgets
  //   addWidget(WIDGET_TYPES.FIELD_ASSIGNEE_TABLE, ticket);
  //   addWidget(WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE, ticket);
  //   addWidget(WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY, ticket);
  // };

  // Generate responsive layouts for widgets similar to bootstrap style
  const generateResponsiveLayouts = () => {
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
    const storageKey = hasEngineeringPreset
      ? engineeringLayoutKey
      : tabSpecificLayoutKey;
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

  // Initialize the ticket dialog
  const handleInitializeTicketDialog = (ticket: Row) => {
    // Find the current tab and store its preset
    const currentTabData = tabs.find((tab) => tab.id === activeTab);

    // Set the current ticket preset for use in rendering
    setCurrentTicketPreset(currentTabData?.appliedPreset);

    // Set the current ticket
    setCurrentTicket(ticket);

    // Reset form data based on ticket
    setTicketForm({
      status: ticket.cells["col-7"] || "New",
      description: ticket.cells["col-4"] || "",
      billableHours: ticket.cells["col-9"] || "0.0",
      totalHours: ticket.cells["col-8"] || "0.0",
    });

    // Reset uploaded images
    setUploadedImages([]);

    // Reset assignee table title
    setAssigneeTableTitle("Assigned Team Members");

    // Check if this tab has the Engineering preset applied
    const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

    // Create appropriate storage keys based on preset and tab ID
    const engineeringLayoutKey = "engineering-layouts";
    const ticketId = ticket.cells["col-1"];
    const tabSpecificLayoutKey = `tab-${activeTab}`;

    // Get saved layouts from appropriate storage location
    const savedEngineeringState = getFromLS(engineeringLayoutKey) as {
      widgets?: Widget[];
      layouts?: Layouts;
    };
    const savedTabSpecificState = getFromLS(tabSpecificLayoutKey) as {
      widgets?: Widget[];
      layouts?: Layouts;
    };

    console.log("Loading saved widget layout state");

    // Open dialog
    setViewDialogOpen(true);

    // --- Check if this ticket has a completed status in the Tasks tab ---
    let assigneeCompletedStatus = false;
    // Find the Tasks tab
    const tasksTab = tabs.find((tab) => tab.title === "Tasks");
    if (tasksTab && tables[tasksTab.id]) {
      // Find the corresponding task in the Tasks tab based on ticket ID
      const correspondingTask = tables[tasksTab.id]?.rows.find(
        row => row.cells["col-1"] === ticketId
      );
      if (correspondingTask) {
        assigneeCompletedStatus = !!correspondingTask.completed;
      }
    }

    // --- Added code to populate assignees from the ticket row ---
    // Assuming assignee data is in specific columns of the ticket row
    const assigneeFromRow: Assignee = {
      id: `assignee-${ticket.id}-${ticket.cells["col-5"] || "default"}`.replace(
        /\s+/g,
        "-",
      ), // Create a unique ID
      name: ticket.cells["col-5"] || "N/A", // Assignee Name from col-5
      workDescription: ticket.cells["col-6"] || "", // Work Description from col-6
      totalHours: ticket.cells["col-7"] || "0", // Total Hours from col-7
      estTime: ticket.cells["col-8"] || "0", // Est Time from col-8
      priority: "3", // Default to medium priority
      completed: assigneeCompletedStatus, // Set completed status based on task status
    };

    // Set the assignees state for the dialog with only the assignee from the row
    // If col-5 doesn't exist or is empty, set an empty array
    if (assigneeFromRow.name && assigneeFromRow.name !== "N/A") {
      setAssignees([assigneeFromRow]);
    } else {
      setAssignees([]); // Clear assignees if no name is found in col-5
    }

    // Clear time entries
    setTimeEntries([]);

    // Set edit layout mode to false when initially opening a ticket
    setIsEditLayoutMode(false);

    // Check if Engineering state has saved widgets and layouts
    const hasEngineeringSavedWidgets =
      savedEngineeringState &&
      Array.isArray(savedEngineeringState.widgets) &&
      savedEngineeringState.widgets.length > 0;

    const hasEngineeringSavedLayouts =
      savedEngineeringState &&
      savedEngineeringState.layouts &&
      Object.keys(savedEngineeringState.layouts).length > 0;

    // Check if tab-specific state has saved widgets and layouts
    const hasTabSpecificSavedWidgets =
      savedTabSpecificState &&
      Array.isArray(savedTabSpecificState.widgets) &&
      savedTabSpecificState.widgets.length > 0;

    const hasTabSpecificSavedLayouts =
      savedTabSpecificState &&
      savedTabSpecificState.layouts &&
      Object.keys(savedTabSpecificState.layouts).length > 0;

    // Handle different scenarios based on preset and saved state
    if (hasEngineeringPreset) {
      // For Engineering preset tabs, use Engineering-specific layouts or create defaults
      if (hasEngineeringSavedWidgets && hasEngineeringSavedLayouts) {
        // We have saved Engineering widgets and layouts
        console.log("Restoring Engineering widget layout state");

        // First set the widgets
        setWidgets(savedEngineeringState.widgets!);

        // Immediately set the layouts to ensure they're ready when the grid renders
        setWidgetLayouts(savedEngineeringState.layouts!);
      } else {
        // No saved state, create default widgets
        console.log(
          "Creating default widgets for Engineering preset - no saved state found",
        );

        // Reset widgets and layouts
        setWidgets([]);
        setWidgetLayouts({});

        // Add default widgets after a short delay
        setTimeout(() => {
          // Status field
          addWidget(WIDGET_TYPES.FIELD_STATUS, ticket);

          // Customer name field
          addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME, ticket);

          // Date fields
          addWidget(WIDGET_TYPES.FIELD_DATE_CREATED, ticket);
          addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED, ticket);

          // Hours fields
          addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS, ticket);
          addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS, ticket);

          // Description field
          addWidget(WIDGET_TYPES.FIELD_DESCRIPTION, ticket);

          // Add tables as individual widgets
          addWidget(WIDGET_TYPES.FIELD_ASSIGNEE_TABLE, ticket);
          addWidget(WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE, ticket);
          addWidget(WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY, ticket);
        }, 100);
      }
    } else {
      // For non-Engineering preset tabs, check for tab-specific layouts
      if (hasTabSpecificSavedWidgets && hasTabSpecificSavedLayouts) {
        // We have tab-specific saved widgets and layouts
        console.log("Restoring tab-specific widget layout state");

        // First set the widgets
        setWidgets(savedTabSpecificState.widgets!);

        // Immediately set the layouts to ensure they're ready when the grid renders
        setWidgetLayouts(savedTabSpecificState.layouts!);
      } else {
        // Check if there's an old-format layout saved with ticket ID
        const oldFormatKey = `tab-${activeTab}-${ticketId}`;
        const oldSavedState = getFromLS(oldFormatKey) as {
          widgets?: Widget[];
          layouts?: Layouts;
        };
        const hasOldSavedWidgets =
          oldSavedState &&
          Array.isArray(oldSavedState.widgets) &&
          oldSavedState.widgets.length > 0;
        const hasOldSavedLayouts =
          oldSavedState &&
          oldSavedState.layouts &&
          Object.keys(oldSavedState.layouts).length > 0;

        if (hasOldSavedWidgets && hasOldSavedLayouts) {
          // We found a layout in the old format, use it and save it in the new format
          console.log("Found old format layout, migrating to new format");
          setWidgets(oldSavedState.widgets!);
          setWidgetLayouts(oldSavedState.layouts!);

          // Save in new format
          const completeState = {
            widgets: oldSavedState.widgets,
            layouts: oldSavedState.layouts,
          };
          saveToLS(tabSpecificLayoutKey, completeState);
        } else {
          // No saved ticket-specific state, show empty customize layout
          console.log("No saved tab-specific layout, showing empty customize view");
          setWidgets([]);
          setWidgetLayouts({});
        }
      }
    }
  };

  // Handle layout change from react-grid-layout
  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
    console.log("Layout changed:", currentLayout.length, "items in current layout");

    // Only update if there are actual layouts
    if (currentLayout.length > 0) {
      // Save the user-modified layouts using the Zustand store
      setWidgetLayouts(allLayouts);

      // Pass the layout change to the store
      onLayoutChange(currentLayout, allLayouts);

      // Close any open widget dropdowns
      const dropdowns = [
        document.getElementById("widget-dropdown"),
        document.getElementById("customize-widget-dropdown"),
      ];

      dropdowns.forEach((dropdown) => {
        if (dropdown && !dropdown.classList.contains("hidden")) {
          dropdown.classList.add("hidden");
        }
      });

      // Also save to localStorage with the complete state
      if (currentTicket && widgets.length > 0) {
        const completeState = {
          widgets: widgets,
          layouts: allLayouts,
        };

        // Find current tab to determine if it has Engineering preset
        const currentTabData = tabs.find((tab) => tab.id === activeTab);
        const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

        // Use appropriate storage key based on tab type
        const ticketId = currentTicket.cells["col-1"];
        if (hasEngineeringPreset) {
          // Save Engineering preset layouts to Engineering-specific key
          saveToLS("engineering-layouts", completeState);
          console.log("Saved Engineering layout changes for ticket:", ticketId);
        } else {
          // Save non-Engineering layouts to tab-specific key
          const tabSpecificLayoutKey = `tab-${activeTab}`;
          saveToLS(tabSpecificLayoutKey, completeState);
          console.log(
            "Saved tab-specific layout changes for tab",
            activeTab,
            "and ticket:",
            ticketId,
          );
        }
      }
    }
  };

  // Modified renderTabContent function to use the Zustand stores
  const renderTabContent = () => {
    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    const { currentUser } = useUserStore();
    
    if (!activeTabData) return null;

    const table = tables[activeTab];

    return (
      <div className="p-4">
        {table && (
          <div className="rounded-lg border overflow-x-auto relative">
            <table className="w-full">
              <thead className="bg-neutral-50 text-sm text-neutral-600">
                <tr className="relative">
                  {table.columns.map((column, index) => (
                    <Fragment key={column.id}>
                      <th
                        className={`group border-b px-4 py-2 text-left font-medium cursor-grab ${column.isDragging ? "opacity-50 bg-neutral-100" : ""}`}
                        style={{ width: column.width }}
                        onDoubleClick={() =>
                          handleColumnDoubleClick(activeTab, column.id)
                        }
                        draggable={
                          !editingColumn || editingColumn.columnId !== column.id
                        }
                        onDragStart={(e) =>
                          handleColumnDragStart(e, activeTab, column.id)
                        }
                        onDragEnd={() => handleColumnDragEnd()}
                        onDragOver={(e) =>
                          handleColumnDragOver(e, activeTab, column.id)
                        }
                        onDrop={(e) => handleColumnDrop(e, activeTab, column.id)}
                      >
                        {editingColumn &&
                        editingColumn.tabId === activeTab &&
                        editingColumn.columnId === column.id ? (
                          <input
                            type="text"
                            value={editingColumnTitle}
                            onChange={(e) => setEditingColumnTitle(e.target.value)}
                            onBlur={() => saveColumnName()}
                            onKeyDown={(e) => handleColumnRenameKeyDown(e)}
                            className="w-full min-w-[80px] bg-transparent px-0 py-0 outline-none focus:ring-0 border-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onDragStart={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <span className="mr-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 text-neutral-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                                  />
                                </svg>
                              </span>
                              {column.title}
                            </div>

                            <div className="flex items-center space-x-1">
                              {/* Remove column button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  removeColumn(activeTab, column.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 h-4 w-4 text-neutral-400 hover:text-red-500 transition-colors"
                                title="Remove column"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>

                              {/* Add column button (only on last column) */}
                              {index === table.columns.length - 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    addColumn(activeTab);
                                  }}
                                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-500 hover:bg-blue-100 hover:text-blue-600 transition-colors shadow-sm border border-neutral-200"
                                  title="Add column"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
<<<<<<< HEAD
                {(() => {
                  // For Tasks tab, sort rows so current user's tasks appear first
                  if (activeTabData.title === "Tasks" && currentUser) {
                    const sortedRows = [...table.rows].sort((a, b) => {
                      const aIsAssignedToUser = a.cells["col-2"] === currentUser.name;
                      const bIsAssignedToUser = b.cells["col-2"] === currentUser.name;
                      
                      if (aIsAssignedToUser && !bIsAssignedToUser) return -1;
                      if (!aIsAssignedToUser && bIsAssignedToUser) return 1;
                      return 0;
                    });
                    
                    return sortedRows.map((row) => {
                      const isAssignedToUser = row.cells["col-2"] === currentUser.name;
                      
                      return (
                        <tr 
                          key={row.id} 
                          className={`border-b hover:bg-neutral-50 ${!isAssignedToUser ? 'opacity-50 pointer-events-none' : ''} ${row.completed ? 'opacity-60 bg-neutral-50' : ''}`}
                        >
                          {table.columns.map((column) => (
                            <td key={`${row.id}-${column.id}`} className="px-4 py-3">
                              {column.id === "col-11" ||
                              column.title === "Actions" ||
                              column.title === "Action" ||
                              row.cells[column.id] === "action_buttons" ? (
                                <div className="flex space-x-2">
                                  <button
                                    className={`rounded bg-blue-100 p-1 text-blue-700 hover:bg-blue-200 ${!isAssignedToUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="View Ticket"
                                    onClick={() => {
                                      // Check if we're in the Tasks tab
                                      const currentTabData = tabs.find((tab) => tab.id === activeTab);
                                      if (currentTabData?.title === "Tasks") {
                                        // Find the All Tickets tab
                                        const allTicketsTab = tabs.find((tab) => tab.title === "All Tickets");
                                        if (allTicketsTab) {
                                          // Get the ticket ID from the row
                                          const ticketId = row.cells["col-1"];
                                          
                                          // Switch to the All Tickets tab
                                          useTabsStore.getState().setActiveTab(allTicketsTab.id);
                                          
                                          // Find the corresponding ticket in the All Tickets tab
                                          const allTicketsTable = tables[allTicketsTab.id];
                                          if (allTicketsTable) {
                                            const correspondingTicket = allTicketsTable.rows.find(
                                              (ticketRow) => ticketRow.cells["col-1"] === ticketId
                                            );
                                            
                                            if (correspondingTicket) {
                                              // Open the ticket dialog
                                              setTimeout(() => {
                                                handleInitializeTicketDialog(correspondingTicket);
                                              }, 100); // Small delay to ensure tab switch completes
                                            }
                                          }
                                        }
                                      } else {
                                        // Regular behavior for other tabs
                                        handleInitializeTicketDialog(row);
=======
                {table.rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-neutral-50">
                    {table.columns.map((column) => (
                      <td key={`${row.id}-${column.id}`} className="px-4 py-3">
                        {column.id === "col-11" ||
                        column.title === "Actions" ||
                        row.cells[column.id] === "action_buttons" ? (
                          <div className="flex space-x-2">
                            <button
                              className="rounded bg-blue-100 p-1 text-blue-700 hover:bg-blue-200"
                              title="View Ticket"
                              onClick={() => {
                                // Check if we're in the Tasks tab
                                const currentTabData = tabs.find(
                                  (tab) => tab.id === activeTab,
                                );
                                if (currentTabData?.title === "Tasks") {
                                  // Find the All Tickets tab
                                  const allTicketsTab = tabs.find(
                                    (tab) => tab.title === "All Tickets",
                                  );
                                  if (allTicketsTab) {
                                    // Get the ticket ID from the row
                                    const ticketId = row.cells["col-1"];

                                    // Switch to the All Tickets tab
                                    useTabsStore
                                      .getState()
                                      .setActiveTab(allTicketsTab.id);

                                    // Find the corresponding ticket in the All Tickets tab
                                    const allTicketsTable = tables[allTicketsTab.id];
                                    if (allTicketsTable) {
                                      const correspondingTicket =
                                        allTicketsTable.rows.find(
                                          (ticketRow) =>
                                            ticketRow.cells["col-1"] === ticketId,
                                        );

                                      if (correspondingTicket) {
                                        // Open the ticket dialog
                                        setTimeout(() => {
                                          handleInitializeTicketDialog(
                                            correspondingTicket,
                                          );
                                        }, 100); // Small delay to ensure tab switch completes
>>>>>>> e86268116023486ce00734fcad0cf06c35d42fd1
                                      }
                                    }}
                                    disabled={!isAssignedToUser}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                  </button>
                                  
                                  {/* Mark as Done button - only show in Tasks tab */}
                                  {activeTabData.title === "Tasks" && (
                                    <button
                                      className={`rounded p-1 ${row.completed 
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} 
                                        ${!isAssignedToUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title={row.completed ? "Mark as Not Done" : "Mark as Done"}
                                      onClick={() => markTaskAsDone(activeTab, row.id, !row.completed)}
                                      disabled={!isAssignedToUser}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ) : column.title === "Status" ? (
                                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  row.completed 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {row.completed ? 'Completed' : 'In Progress'}
                                </div>
                              ) : (
                                row.cells[column.id] || ""
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  } else {
                    // For non-Tasks tabs, render rows normally
                    return table.rows.map((row) => (
                      <tr 
                        key={row.id} 
                        className={`border-b hover:bg-neutral-50 ${row.completed ? 'opacity-60 bg-neutral-50' : ''}`}
                      >
                        {table.columns.map((column) => (
                          <td key={`${row.id}-${column.id}`} className="px-4 py-3">
                            {column.id === "col-11" ||
                            column.title === "Actions" ||
                            column.title === "Action" ||
                            row.cells[column.id] === "action_buttons" ? (
                              <div className="flex space-x-2">
                                <button
                                  className="rounded bg-blue-100 p-1 text-blue-700 hover:bg-blue-200"
                                  title="View Ticket"
                                  onClick={() => handleInitializeTicketDialog(row)}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              row.cells[column.id] || ""
                            )}
                          </td>
                        ))}
                      </tr>
                    ));
                  }
                })()}
                {table.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={table.columns.length}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No rows yet. Click "Add Row" to create a new row.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Use an effect to create a table when a new tab is added without a table
  useEffect(() => {
    if (activeTab && !tables[activeTab]) {
      createNewTable(activeTab);
    }
  }, [activeTab, tables, createNewTable]);

  // Save ticket changes
  const handleSaveTicketChanges = () => {
    // Save ticket details using the tablesStore function
    saveTicketChanges(currentTicket, ticketForm, setViewDialogOpen, activeTab);

    // Now sync the completed status between tabs if needed
    if (currentTicket) {
      const ticketId = currentTicket.cells["col-1"];
      const assigneeName = currentTicket.cells["col-5"]; // Assuming assignee name is in col-5
      
      // Find any completed status from assignees
      const completedAssignee = assignees.find(a => a.name === assigneeName && a.completed);
      
      // If we have a completed assignee, sync this to the Tasks tab
      if (completedAssignee) {
        // Find the Tasks tab
        const tasksTab = tabs.find((tab) => tab.title === "Tasks");
        if (tasksTab && tables[tasksTab.id]) {
          // Update the Tasks tab with the completed status
          const updatedTables = { ...tables };
          const taskTable = updatedTables[tasksTab.id];
          
          if (taskTable && taskTable.rows) {
            const updatedRows = taskTable.rows.map(row => {
              if (row.cells["col-1"] === ticketId) {
                return {
                  ...row,
                  completed: !!completedAssignee.completed
                };
              }
              return row;
            });
            
            updatedTables[tasksTab.id] = {
              ...taskTable,
              rows: updatedRows
            };
            
            // Update the global tables state
            useTablesStore.getState().setTables(updatedTables);
            
            // Save to localStorage
            localStorage.setItem("ticket-tables", JSON.stringify(updatedTables));
          }
        }
      }
    }

    // Save widget layouts to localStorage
    if (currentTicket && widgets.length > 0) {
      // Create a complete widget state object that includes both widget data and layout
      const completeState = {
        widgets: widgets,
        layouts: widgetLayouts,
      };

      // Find current tab to determine if it has Engineering preset
      const currentTabData = tabs.find((tab) => tab.id === activeTab);
      const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

      // Use the appropriate storage key based on tab type
      const ticketId = currentTicket.cells["col-1"];
      if (hasEngineeringPreset) {
        // For Engineering preset tabs, save to Engineering-specific key
        saveToLS("engineering-layouts", completeState);
        console.log(
          "Saved Engineering widget layout with",
          widgets.length,
          "widgets and layouts for",
          Object.keys(widgetLayouts).length,
          "breakpoints",
        );
      } else {
        // For non-Engineering tabs, save to tab-specific key
        const tabSpecificLayoutKey = `tab-${activeTab}`;
        saveToLS(tabSpecificLayoutKey, completeState);
        console.log(
          "Saved tab-specific layout for tab",
          activeTab,
          "and ticket:",
          ticketId,
        );
      }
    }

    // Reset the current ticket preset
    setCurrentTicketPreset(undefined);
  };

  // Function to mark a row/task as done
  const markTaskAsDone = (tabId: string, rowId: string, completed: boolean) => {
    // Create a new tables object with the updated row
    const updatedTables = { ...tables };
    
    if (updatedTables[tabId]) {
      // Find and update the row
      updatedTables[tabId].rows = updatedTables[tabId].rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            completed: completed,
            cells: {
              ...row.cells,
              "col-6": completed ? "Completed" : "In Progress" // Update Status column
            }
          };
        }
        return row;
      });
      
      // Update the global tables state
      useTablesStore.getState().setTables(updatedTables);
      
      // Save to localStorage
      localStorage.setItem("ticket-tables", JSON.stringify(updatedTables));
      
      // If this is the Tasks tab, also update the corresponding team member in the All Tickets tab
      const currentTabData = tabs.find((tab) => tab.id === tabId);
      if (currentTabData?.title === "Tasks") {
        // Find the All Tickets tab
        const allTicketsTab = tabs.find((tab) => tab.title === "All Tickets");
        if (allTicketsTab) {
          // Get the ticket ID and assignee name from the row
          const taskRow = updatedTables[tabId].rows.find(row => row.id === rowId);
          if (taskRow) {
            const ticketId = taskRow.cells["col-1"];
            const assigneeName = taskRow.cells["col-2"]; // Assuming assignee name is in col-2
            
            // Update the corresponding assignee in the current assignees state (if open in dialog)
            if (currentTicket && currentTicket.cells["col-1"] === ticketId) {
              setAssignees(prev => 
                prev.map(assignee => 
                  assignee.name === assigneeName 
                    ? { ...assignee, completed: completed }
                    : assignee
                )
              );
            }
          }
        }
      }
    }
  };

  // Function to update assignee completion status
  const markAssigneeCompleted = (assigneeId: string, completed: boolean | string) => {
    // Convert to boolean regardless of input type
    const isCompleted = completed === true || completed === "true";
    
    // Update the assignees state
    setAssignees(prev => 
      prev.map(assignee => 
        assignee.id === assigneeId 
          ? { ...assignee, completed: isCompleted }
          : assignee
      )
    );
    
    // Find the assignee that was updated
    const updatedAssignee = assignees.find(assignee => assignee.id === assigneeId);
    if (updatedAssignee && currentTicket) {
      const ticketId = currentTicket.cells["col-1"];
      
      // Find the Tasks tab
      const tasksTab = tabs.find((tab) => tab.title === "Tasks");
      if (tasksTab && tables[tasksTab.id]) {
        // Find the corresponding task in the Tasks tab
        const updatedTables = { ...tables };
        const taskTable = updatedTables[tasksTab.id];
        
        if (taskTable && taskTable.rows) {
          // Look for the task that matches this ticket and assignee
          const updatedRows = taskTable.rows.map(row => {
            // Check if this row corresponds to our ticket and assignee
            if (row.cells["col-1"] === ticketId && 
                row.cells["col-2"] === updatedAssignee.name) {
              return {
                ...row,
                completed: isCompleted,
                cells: {
                  ...row.cells,
                  "col-6": isCompleted ? "Completed" : "In Progress"  // Update Status column
                }
              };
            }
            return row;
          });
          
          updatedTables[tasksTab.id] = {
            ...taskTable,
            rows: updatedRows
          };
          
          // Update the global tables state
          useTablesStore.getState().setTables(updatedTables);
          
          // Save to localStorage
          localStorage.setItem("ticket-tables", JSON.stringify(updatedTables));
        }
      }
    }
  };

  // Main component render
  return (
    <div className="space-y-4">
      {/* Add the style tags for scrollbar hiding and grid layout */}
      <style dangerouslySetInnerHTML={{ __html: getScrollbarStyles() }} />
      <style dangerouslySetInnerHTML={{ __html: getGridStyles() }} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-neutral-500">Manage your support tickets</p>
        </div>
        <div className="flex space-x-2">
          {/* Add new Ticket button with plus icon */}
          <button
            onClick={() => (activeTab && tables[activeTab] ? addRow(activeTab) : null)}
            className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 flex items-center"
            disabled={!activeTab || !tables[activeTab]}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Ticket
          </button>

          {/* Presets dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                const tablesStore = useTablesStore.getState();
                tablesStore.setShowPresetsMenu(!tablesStore.showPresetsMenu);
              }}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Presets
            </button>

            {showPresetsMenu && (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-neutral-200 bg-white shadow-lg">
                <div className="p-2">
                  <div className="mb-2 border-b border-neutral-200 pb-1 pt-1 text-sm font-medium">
                    Table Presets
                  </div>
                  <button
                    onClick={() => applyPreset("Engineering", activeTab)}
                    className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                  >
                    Engineering
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={saveTabs}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            {tabsSaved ? "✓ Tabs Saved!" : "Save Tabs"}
          </button>

          <button
            onClick={resetTabs}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Reset Tabs
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        {/* Tab bar - using the TabNavigation component */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          editingTab={editingTab}
          editingTitle={editingTitle}
          onTabClick={useTabsStore.getState().setActiveTab}
          onAddTabClick={addTab}
          onCloseTabClick={(id, e) => closeTab(id, e)}
          onDoubleClick={handleDoubleClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onEditingTitleChange={(e) => setEditingTitle(e.target.value)}
          onRenameKeyDown={handleRenameKeyDown}
          onRenameBlur={useTabsStore.getState().saveTabName}
        />

        {/* Tab content */}
        {renderTabContent()}
      </div>

      {/* Custom dialog for ticket view */}
      {viewDialogOpen && currentTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/30 p-4 overflow-y-auto"
          onClick={() => setViewDialogOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          >
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Ticket Details (ID: {currentTicket.cells["col-1"]})
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                {/* Add Edit Layout toggle button */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-neutral-600">Edit Layout</span>
                  <button
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEditLayoutMode ? "bg-blue-600" : "bg-neutral-200"}`}
                    onClick={() => setIsEditLayoutMode(!isEditLayoutMode)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEditLayoutMode ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Add Reset Layout button */}
                {isEditLayoutMode && (
                  <button
                    onClick={() => {
                      // Find current tab to determine if it has Engineering preset
                      const currentTabData = tabs.find((tab) => tab.id === activeTab);
                      const hasEngineeringPreset =
                        currentTabData?.appliedPreset === "Engineering";

                      if (hasEngineeringPreset) {
                        // Clear saved Engineering layouts
                        saveToLS("engineering-layouts", { widgets: [], layouts: {} });
                        console.log("Reset Engineering widget layout");
                      } else if (currentTicket) {
                        // Clear tab-specific layouts
                        const ticketId = currentTicket.cells["col-1"];
                        const tabSpecificLayoutKey = `tab-${activeTab}`;
                        saveToLS(tabSpecificLayoutKey, { widgets: [], layouts: {} });
                        console.log(
                          "Reset tab-specific layout for tab",
                          activeTab,
                          "and ticket:",
                          ticketId,
                        );
                      }

                      // First clear existing widgets and layouts
                      setWidgets([]);
                      setWidgetLayouts({});

                      // Wait for state to clear, then add default widgets
                      setTimeout(() => {
                        if (currentTicket) {
                          // Status field
                          addWidget(WIDGET_TYPES.FIELD_STATUS, currentTicket);

                          // Customer name field
                          addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME, currentTicket);

                          // Date fields
                          addWidget(WIDGET_TYPES.FIELD_DATE_CREATED, currentTicket);
                          addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED, currentTicket);

                          // Hours fields
                          addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS, currentTicket);
                          addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS, currentTicket);

                          // Description field
                          addWidget(WIDGET_TYPES.FIELD_DESCRIPTION, currentTicket);

                          // Add tables as individual widgets
                          addWidget(WIDGET_TYPES.FIELD_ASSIGNEE_TABLE, currentTicket);
                          addWidget(
                            WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE,
                            currentTicket,
                          );
                          addWidget(
                            WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY,
                            currentTicket,
                          );
                        }
                      }, 100);
                    }}
                    className="mr-2 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-sm hover:bg-red-100"
                  >
                    Reset Layout
                  </button>
                )}

                {/* Add widget button */}
                {isEditLayoutMode && (
                  <div className="relative">
                    <button
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center"
                      onClick={(e) => {
                        const dropdown = document.getElementById("widget-dropdown");
                        if (dropdown) {
                          dropdown.classList.toggle("hidden");
                          // Position the dropdown below the button
                          const rect = e.currentTarget.getBoundingClientRect();
                          dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
                          dropdown.style.left = `${rect.left + window.scrollX}px`;
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <span>Add Widget</span>
                    </button>

                    <div
                      id="widget-dropdown"
                      className="fixed hidden rounded-md border border-neutral-200 bg-white shadow-lg z-50 w-48 max-h-80 overflow-y-auto"
                    >
                      <div className="py-1">
                        <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
                          Groups
                        </div>
                        {/* Widget type buttons for group widgets */}
                        {[
                          { type: WIDGET_TYPES.DETAILS, label: "Ticket Details" },
                          { type: WIDGET_TYPES.ASSIGNEES, label: "Team Members" },
                          { type: WIDGET_TYPES.TIME_ENTRIES, label: "Time Entries" },
                          { type: WIDGET_TYPES.ATTACHMENTS, label: "Attachments" },
                          { type: WIDGET_TYPES.NOTES, label: "Notes" },
                        ].map((item) => (
                          <button
                            key={item.type}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                            onClick={() => {
                              addWidget(item.type, currentTicket);
                              document
                                .getElementById("widget-dropdown")
                                ?.classList.add("hidden");
                            }}
                          >
                            {item.label}
                          </button>
                        ))}

                        <div className="my-1 border-t border-neutral-200"></div>
                        <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
                          Individual Fields
                        </div>

                        {/* Widget type buttons for field widgets */}
                        {[
                          { type: WIDGET_TYPES.FIELD_STATUS, label: "Status Field" },
                          {
                            type: WIDGET_TYPES.FIELD_CUSTOMER_NAME,
                            label: "Customer Name Field",
                          },
                          {
                            type: WIDGET_TYPES.FIELD_DATE_CREATED,
                            label: "Date Created Field",
                          },
                          {
                            type: WIDGET_TYPES.FIELD_LAST_MODIFIED,
                            label: "Last Modified Field",
                          },
                          {
                            type: WIDGET_TYPES.FIELD_BILLABLE_HOURS,
                            label: "Billable Hours Field",
                          },
                          {
                            type: WIDGET_TYPES.FIELD_TOTAL_HOURS,
                            label: "Total Hours Field",
                          },
                          {
                            type: WIDGET_TYPES.FIELD_DESCRIPTION,
                            label: "Description Field",
                          },
                        ].map((item) => (
                          <button
                            key={item.type}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                            onClick={() => {
                              addWidget(item.type, currentTicket);
                              document
                                .getElementById("widget-dropdown")
                                ?.classList.add("hidden");
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setViewDialogOpen(false);
                    setCurrentTicketPreset(undefined);
                  }}
                  className="rounded-full h-8 w-8 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {(() => {
                // Use the stored ticket preset directly instead of checking tab data
                const hasEngineeringPreset = currentTicketPreset === "Engineering";

                if (hasEngineeringPreset) {
                  // Show widget grid layout if preset is "Engineering"
                  return (
                    <>
                      {/* ResponsiveGridLayout for widgets with dynamic layout generation */}
                      <div className="w-full relative">
                        <ResponsiveGridLayout
                          className={`layout ${!isEditLayoutMode ? "non-editable" : ""}`}
                          layouts={generateResponsiveLayouts()}
                          breakpoints={{
                            lg: 1200,
                            md: 996,
                            sm: 768,
                            xs: 480,
                            xxs: 320,
                          }}
                          cols={{ lg: 12, md: 12, sm: 12, xs: 6, xxs: 4 }}
                          rowHeight={40}
                          onLayoutChange={handleLayoutChange}
                          isDraggable={isEditLayoutMode}
                          isResizable={isEditLayoutMode}
                          margin={[8, 8]}
                          containerPadding={[0, 0]}
                          preventCollision={false}
                          compactType="vertical"
                          useCSSTransforms={true}
                          draggableHandle=".react-grid-dragHandle"
                          // Force key refresh when widgets change to ensure layout is applied
                          key={`grid-${widgets.map((w) => w.id).join("-")}`}
                        >
                          {widgets.map((widget) => (
                            <div
                              key={widget.id}
                              className={`widget-container ${!isEditLayoutMode ? "static pointer-events-auto" : ""}`}
                            >
                              <TicketWidget
                                widget={widget}
                                ticketForm={ticketForm}
                                currentTicket={currentTicket}
                                handleFieldChange={handleFieldChange}
                                toggleWidgetCollapse={toggleWidgetCollapse}
                                removeWidget={removeWidget}
                                updateWidgetTitle={updateWidgetTitle}
                                assignees={assignees}
                                timeEntries={timeEntries}
                                uploadedImages={uploadedImages}
                                handleAddAssignee={handleAddAssignee}
                                handleRemoveAssignee={handleRemoveAssignee}
                                handleUpdateAssignee={handleUpdateAssignee}
                                handleAddTimeEntry={handleAddTimeEntry}
                                handleRemoveTimeEntry={handleRemoveTimeEntry}
                                handleUpdateTimeEntry={handleUpdateTimeEntry}
                                setTicketForm={setTicketForm}
                                handleImageUpload={handleImageUpload}
                                setUploadedImages={setUploadedImages}
                                showAssigneeForm={showAssigneeForm}
                                setShowAssigneeForm={setShowAssigneeForm}
                                newAssignee={newAssignee}
                                setNewAssignee={setNewAssignee}
                                isEditMode={isEditLayoutMode}
                                markAssigneeCompleted={markAssigneeCompleted}
                              />
                            </div>
                          ))}
                        </ResponsiveGridLayout>
                      </div>
                    </>
                  );
                } else {
                  // For non-Engineering preset tabs (or if no preset), show the "Customize" view
                  return (
                    <div className="h-full flex flex-col">
                      {widgets.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                          <div className="p-6 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 max-w-md">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-12 w-12 mx-auto text-neutral-400 mb-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                            <h3 className="text-lg font-medium text-neutral-700 mb-2">
                              Customize Your Ticket Layout
                            </h3>
                            <p className="text-neutral-500 mb-6">
                              This ticket doesn't have any widgets yet. Add widgets to
                              create your custom layout.
                            </p>
                            <div className="flex justify-center">
                              <div className="relative">
                                <button
                                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center"
                                  onClick={(e) => {
                                    const dropdown = document.getElementById(
                                      "customize-widget-dropdown",
                                    );
                                    if (dropdown) {
                                      dropdown.classList.toggle("hidden");
                                      // Position the dropdown below the button
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
                                      dropdown.style.left = `${rect.left + window.scrollX}px`;
                                    }
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                  </svg>
                                  Add Widget
                                </button>

                                <div
                                  id="customize-widget-dropdown"
                                  className="fixed hidden rounded-md border border-neutral-200 bg-white shadow-lg z-50 w-48 text-left max-h-80 overflow-y-auto"
                                >
                                  <div className="py-1">
                                    <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
                                      Groups
                                    </div>
                                    {/* Widget type buttons for group widgets */}
                                    {[
                                      {
                                        type: WIDGET_TYPES.DETAILS,
                                        label: "Ticket Details",
                                      },
                                      {
                                        type: WIDGET_TYPES.ASSIGNEES,
                                        label: "Team Members",
                                      },
                                      {
                                        type: WIDGET_TYPES.TIME_ENTRIES,
                                        label: "Time Entries",
                                      },
                                      {
                                        type: WIDGET_TYPES.ATTACHMENTS,
                                        label: "Attachments",
                                      },
                                      { type: WIDGET_TYPES.NOTES, label: "Notes" },
                                    ].map((item) => (
                                      <button
                                        key={item.type}
                                        className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                        onClick={() => {
                                          addWidget(item.type, currentTicket);
                                          document
                                            .getElementById("customize-widget-dropdown")
                                            ?.classList.add("hidden");
                                        }}
                                      >
                                        {item.label}
                                      </button>
                                    ))}

                                    <div className="my-1 border-t border-neutral-200"></div>
                                    <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
                                      Individual Fields
                                    </div>

                                    {/* Widget type buttons for field widgets */}
                                    {[
                                      {
                                        type: WIDGET_TYPES.FIELD_STATUS,
                                        label: "Status Field",
                                      },
                                      {
                                        type: WIDGET_TYPES.FIELD_CUSTOMER_NAME,
                                        label: "Customer Name Field",
                                      },
                                      {
                                        type: WIDGET_TYPES.FIELD_DATE_CREATED,
                                        label: "Date Created Field",
                                      },
                                      {
                                        type: WIDGET_TYPES.FIELD_LAST_MODIFIED,
                                        label: "Last Modified Field",
                                      },
                                      {
                                        type: WIDGET_TYPES.FIELD_BILLABLE_HOURS,
                                        label: "Billable Hours Field",
                                      },
                                      {
                                        type: WIDGET_TYPES.FIELD_TOTAL_HOURS,
                                        label: "Total Hours Field",
                                      },
                                      {
                                        type: WIDGET_TYPES.FIELD_DESCRIPTION,
                                        label: "Description Field",
                                      },
                                    ].map((item) => (
                                      <button
                                        key={item.type}
                                        className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
                                        onClick={() => {
                                          addWidget(item.type, currentTicket);
                                          document
                                            .getElementById("customize-widget-dropdown")
                                            ?.classList.add("hidden");
                                        }}
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Display added widgets with a similar layout to the Engineering preset
                        <div className="w-full relative p-4">
                          <ResponsiveGridLayout
                            className={`layout ${!isEditLayoutMode ? "non-editable" : ""}`}
                            layouts={generateResponsiveLayouts()}
                            breakpoints={{
                              lg: 1200,
                              md: 996,
                              sm: 768,
                              xs: 480,
                              xxs: 320,
                            }}
                            cols={{ lg: 12, md: 12, sm: 12, xs: 6, xxs: 4 }}
                            rowHeight={40}
                            onLayoutChange={handleLayoutChange}
                            isDraggable={isEditLayoutMode}
                            isResizable={isEditLayoutMode}
                            margin={[8, 8]}
                            containerPadding={[0, 0]}
                            preventCollision={false}
                            compactType="vertical"
                            useCSSTransforms={true}
                            draggableHandle=".react-grid-dragHandle"
                            // Force key refresh when widgets change to ensure layout is applied
                            key={`grid-${widgets.map((w) => w.id).join("-")}`}
                          >
                            {widgets.map((widget) => (
                              <div key={widget.id} className="widget-container">
                                <TicketWidget
                                  widget={widget}
                                  ticketForm={ticketForm}
                                  currentTicket={currentTicket}
                                  handleFieldChange={handleFieldChange}
                                  toggleWidgetCollapse={toggleWidgetCollapse}
                                  removeWidget={removeWidget}
                                  updateWidgetTitle={updateWidgetTitle}
                                  assignees={assignees}
                                  timeEntries={timeEntries}
                                  uploadedImages={uploadedImages}
                                  handleAddAssignee={handleAddAssignee}
                                  handleRemoveAssignee={handleRemoveAssignee}
                                  handleUpdateAssignee={handleUpdateAssignee}
                                  handleAddTimeEntry={handleAddTimeEntry}
                                  handleRemoveTimeEntry={handleRemoveTimeEntry}
                                  handleUpdateTimeEntry={handleUpdateTimeEntry}
                                  setTicketForm={setTicketForm}
                                  handleImageUpload={handleImageUpload}
                                  setUploadedImages={setUploadedImages}
                                  showAssigneeForm={showAssigneeForm}
                                  setShowAssigneeForm={setShowAssigneeForm}
                                  newAssignee={newAssignee}
                                  setNewAssignee={setNewAssignee}
                                  isEditMode={isEditLayoutMode}
                                  markAssigneeCompleted={markAssigneeCompleted}
                                />
                              </div>
                            ))}
                          </ResponsiveGridLayout>
                        </div>
                      )}
                    </div>
                  );
                }
              })()}
            </div>

            <div className="border-t p-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setViewDialogOpen(false);
                  setCurrentTicketPreset(undefined);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTicketChanges}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tickets;
