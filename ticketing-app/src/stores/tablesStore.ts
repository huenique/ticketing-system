import { create } from "zustand";

import { PRESET_TABLES } from "../constants/tickets";
import { Row, Table, TicketForm } from "../types/tickets";
import { generateMockRowData } from "../utils/ticketUtils";
import { persist } from "./middleware";
import useTabsStore from "./tabsStore";
import useUserStore from "./userStore";

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
    isCompleted?: boolean,
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

        // Get tab info to check if it has status info
        const tabsStore = useTabsStore.getState();
        const tabInfo = tabsStore.tabs.find((tab) => tab.id === tabId);
        const tabStatus = tabInfo?.status;

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

          // If the tab has a status, use it for the 'Status' column
          if (tabStatus && cells["col-7"]) {
            cells["col-7"] = tabStatus;
          }
        } else {
          // Simple table, just set Ticket ID and action buttons
          table.columns.forEach((column) => {
            if (column.id === "col-1") {
              cells[column.id] = `TK-${1000 + rowIndex}`;
            } else if (column.id === "col-11" || column.title === "Actions") {
              cells[column.id] = "action_buttons";
            } else if (column.id === "col-7" && tabStatus) {
              cells[column.id] = tabStatus;
            } else {
              cells[column.id] = "";
            }
          });
        }

        const newRow: Row = {
          id: newRowId,
          // Set completed state based on status
          completed: tabStatus === "Completed" || tabStatus === "Done",
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

        // Get current user
        const currentUser = useUserStore.getState().currentUser;
        const currentUserName = currentUser?.name || "John Doe";

        // Get tab info to check if it has status info
        const tabsStore = useTabsStore.getState();
        const tabInfo = tabsStore.tabs.find((tab) => tab.id === tabId);
        const tabStatus = tabInfo?.status;

        // Create a few mock rows
        const mockRows: Row[] = [];
        for (let i = 0; i < 5; i++) {
          const rowData = generateMockRowData(i + 1);

          // For the Engineering preset, ensure the first 3 tickets are assigned to the current user
          if (presetKey === "Engineering" && i < 3) {
            rowData["col-5"] = currentUserName; // Assign first 3 tickets to current user
          }

          // If the tab has a status, use it for the 'Status' column
          if (tabStatus) {
            rowData["col-7"] = tabStatus;

            // Set completed state based on status
            if (tabStatus === "Completed" || tabStatus === "Done") {
              rowData["completed"] = "true";
            }
          }

          mockRows.push({
            id: `row-${i + 1}`,
            completed: rowData["completed"] === "true",
            cells: rowData,
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
        const updatedTabs = tabsStore.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, appliedPreset: presetKey } : tab,
        );

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

      saveTicketChanges: (
        currentTicket,
        ticketForm,
        setViewDialogOpen,
        tabId,
        isCompleted = false,
      ) => {
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

            // Update status column if it exists based on completion
            if (isCompleted) {
              updatedCells["col-7"] = "Completed";
            }

            return {
              ...row,
              completed: isCompleted,
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
