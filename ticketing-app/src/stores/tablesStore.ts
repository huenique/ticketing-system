import { create } from "zustand";

import { PRESET_TABLES } from "../constants/tickets";
import { Row, Tab, Table, TicketForm } from "../types/tickets";
import { generateMockRowData } from "../utils/ticketUtils";
import { persist } from "./middleware";
import useTabsStore from "./tabsStore";

interface TablesState {
  tables: Record<string, Table | null>;
  tabsSaved: boolean;
  showPresetsMenu: boolean;

  // Actions
  setTables: (tables: Record<string, Table | null>) => void;
  setTabsSaved: (saved: boolean) => void;
  setShowPresetsMenu: (show: boolean) => void;
  saveTabs: () => void;
  resetTabs: () => void;
  createNewTable: (tabId: string) => void;
  addColumn: (tabId: string) => void;
  addRow: (tabId: string) => void;
  applyPreset: (presetKey: string, tabId: string) => void;
  removeColumn: (tabId: string, columnId: string) => void;
  saveTicketChanges: (
    currentTicket: Row | null,
    ticketForm: TicketForm,
    setViewDialogOpen: React.Dispatch<React.SetStateAction<boolean>>,
    tabId: string,
  ) => void;
}

const useTablesStore = create<TablesState>()(
  persist(
    (set, get) => ({
      // State
      tables: {},
      tabsSaved: false,
      showPresetsMenu: false,

      // Actions
      setTables: (tables) => set({ tables }),
      setTabsSaved: (tabsSaved) => set({ tabsSaved }),
      setShowPresetsMenu: (showPresetsMenu) => set({ showPresetsMenu }),

      saveTabs: () => {
        set({ tabsSaved: true });
        // The persist middleware will automatically save to localStorage

        // Reset notification after 3 seconds
        setTimeout(() => set({ tabsSaved: false }), 3000);
      },

      resetTabs: () => {
        const defaultTables = {};
        set({ tables: defaultTables });

        // Also reset the tabs store
        const tabsStore = useTabsStore.getState();
        tabsStore.setTabs([{ id: "tab-1", title: "All Tickets", content: "all" }]);
        tabsStore.setActiveTab("tab-1");
      },

      createNewTable: (tabId) => {
        const newTable: Table = {
          columns: [
            { id: "col-1", title: "Ticket ID", width: "150px" },
            { id: "col-2", title: "Actions", width: "100px" },
          ],
          rows: [],
        };

        set((state) => ({
          tables: {
            ...state.tables,
            [tabId]: newTable,
          },
        }));
      },

      addColumn: (tabId) => {
        const { tables } = get();
        const table = tables[tabId];
        if (!table) return;

        const newColumnId = `col-${table.columns.length + 1}`;
        const newColumn = {
          id: newColumnId,
          title: `Column ${table.columns.length + 1}`,
          width: "150px",
        };

        set((state) => ({
          tables: {
            ...state.tables,
            [tabId]: {
              ...table,
              columns: [...table.columns, newColumn],
            },
          },
        }));
      },

      addRow: (tabId) => {
        const { tables } = get();
        const table = tables[tabId];
        if (!table) return;

        const newRowId = `row-${table.rows.length + 1}`;
        const rowIndex = table.rows.length + 1;

        // Generate mock data based on existing columns
        const cells: Record<string, string> = {};

        // If we have engineering columns, generate mock data
        if (
          table.columns.some(
            (col) => col.title === "Customer Name" || col.title === "Work Description",
          )
        ) {
          // This appears to be the engineering table format, generate structured mock data
          const mockData = generateMockRowData(rowIndex);

          // Map the mock data to the actual columns we have
          table.columns.forEach((column) => {
            // Try to match by column ID first, then by title if exists in mock data
            if (mockData[column.id]) {
              cells[column.id] = mockData[column.id];
            } else {
              // Default empty string
              cells[column.id] = "";
            }
          });
        } else {
          // Simple table, just set Ticket ID and action buttons
          table.columns.forEach((column) => {
            if (column.id === "col-1") {
              cells[column.id] = `TK-${1000 + rowIndex}`;
            } else if (column.id === "col-11" || column.title === "Actions") {
              cells[column.id] = "action_buttons";
            } else {
              cells[column.id] = "";
            }
          });
        }

        const newRow: Row = {
          id: newRowId,
          cells,
        };

        set((state) => ({
          tables: {
            ...state.tables,
            [tabId]: {
              ...table,
              rows: [...table.rows, newRow],
            },
          },
        }));
      },

      applyPreset: (presetKey, tabId) => {
        if (!tabId) return;

        const presetTable = PRESET_TABLES[presetKey];
        if (!presetTable) return;

        // Create a few mock rows
        const mockRows: Row[] = [];
        for (let i = 0; i < 5; i++) {
          mockRows.push({
            id: `row-${i + 1}`,
            cells: generateMockRowData(i + 1),
          });
        }

        // Update tables with the new preset table
        set((state) => ({
          tables: {
            ...state.tables,
            [tabId]: {
              columns: [...presetTable.columns],
              rows: mockRows,
            },
          },
          showPresetsMenu: false,
        }));

        // Update the tabs store to mark this tab with the applied preset
        const tabsStore = useTabsStore.getState();
        const updatedTabs = tabsStore.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, appliedPreset: presetKey, title: "All Tickets" } : tab,
        );

        // For Engineering preset, also create a Tasks tab
        if (presetKey === "Engineering") {
          // Find if a "Tasks" tab already exists
          const existingTasksTab = tabsStore.tabs.find(tab => tab.title === "Tasks");
          
          if (!existingTasksTab) {
            // Create a new Tasks tab
            const tasksTabId = `tab-${updatedTabs.length + 1}`;
            const tasksTab: Tab = {
              id: tasksTabId,
              title: "Tasks",
              content: "tasks",
              appliedPreset: presetKey
            };
            
            updatedTabs.push(tasksTab);
            
            // Create a table specifically for the Tasks tab
            const tasksTable: Table = {
              columns: [
                { id: "col-1", title: "Ticket ID", width: "120px" },
                { id: "col-2", title: "Name", width: "150px" },
                { id: "col-3", title: "Work Description", width: "200px" },
                { id: "col-4", title: "Total Hours", width: "100px" },
                { id: "col-5", title: "Est. Time", width: "100px" },
                { id: "col-6", title: "Action", width: "100px" },
              ],
              rows: []
            };
            
            // Generate task rows based on the ticket rows
            const taskRows: Row[] = mockRows.map((ticketRow, index) => {
              return {
                id: `task-row-${index + 1}`,
                cells: {
                  "col-1": ticketRow.cells["col-1"], // Ticket ID
                  "col-2": ticketRow.cells["col-5"] || `Team Member ${index + 1}`, // Name from Assign To or default
                  "col-3": ticketRow.cells["col-4"] || "", // Work Description
                  "col-4": ticketRow.cells["col-8"] || "0", // Total Hours
                  "col-5": (parseFloat(ticketRow.cells["col-8"] || "0") * 1.5).toFixed(1), // Est. Time as 1.5x Total Hours
                  "col-6": "action_buttons" // Action button
                }
              };
            });
            
            // Add the tasks table to state
            set((state) => ({
              tables: {
                ...state.tables,
                [tasksTabId]: {
                  ...tasksTable,
                  rows: taskRows
                }
              }
            }));
          }
        }
        
        tabsStore.setTabs(updatedTabs);
      },

      removeColumn: (tabId, columnId) => {
        const { tables } = get();
        const table = tables[tabId];
        if (!table) return;

        // Don't allow removing if there's only one column left
        if (table.columns.length <= 1) return;

        // Remove the column
        const newColumns = table.columns.filter((col) => col.id !== columnId);

        // Update rows to remove the cell data for this column
        const newRows = table.rows.map((row) => {
          const newCells = { ...row.cells };
          delete newCells[columnId];
          return { ...row, cells: newCells };
        });

        set((state) => ({
          tables: {
            ...state.tables,
            [tabId]: {
              columns: newColumns,
              rows: newRows,
            },
          },
        }));
      },

      saveTicketChanges: (currentTicket, ticketForm, setViewDialogOpen, tabId) => {
        if (!currentTicket) return;

        const { tables } = get();
        const table = tables[tabId];
        if (!table) return;

        // Update the row with new ticket form data
        const updatedRows = table.rows.map((row) => {
          if (row.id === currentTicket.id) {
            const updatedCells = { ...row.cells };

            // Map form data to cells
            if (ticketForm.status) updatedCells["col-7"] = ticketForm.status;
            if (ticketForm.description) updatedCells["col-4"] = ticketForm.description;
            if (ticketForm.billableHours)
              updatedCells["col-9"] = ticketForm.billableHours;
            if (ticketForm.totalHours) updatedCells["col-8"] = ticketForm.totalHours;

            return {
              ...row,
              cells: updatedCells,
            };
          }
          return row;
        });

        // Update the table
        set((state) => ({
          tables: {
            ...state.tables,
            [tabId]: {
              ...table,
              rows: updatedRows,
            },
          },
        }));

        // Close the dialog
        setViewDialogOpen(false);
      },
    }),
    {
      name: "ticket-tables-storage",
      partialize: (state) => ({
        tables: state.tables,
      }),
    },
  ),
);

export default useTablesStore;
