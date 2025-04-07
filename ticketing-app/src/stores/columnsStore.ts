import { create } from "zustand";
import useTablesStore from "./tablesStore";

interface EditingColumn {
  tabId: string;
  columnId: string;
}

interface ColumnsState {
  editingColumn: EditingColumn | null;
  editingColumnTitle: string;

  // Actions
  setEditingColumn: (column: EditingColumn | null) => void;
  setEditingColumnTitle: (title: string) => void;
  handleColumnDoubleClick: (tabId: string, columnId: string) => void;
  saveColumnName: () => void;
  handleColumnRenameKeyDown: (e: React.KeyboardEvent) => void;
  handleColumnDragStart: (e: React.DragEvent, tabId: string, columnId: string) => void;
  handleColumnDragEnd: () => void;
  handleColumnDragOver: (e: React.DragEvent, tabId: string, columnId: string) => void;
  handleColumnDrop: (e: React.DragEvent, tabId: string, columnId: string) => void;
}

const useColumnsStore = create<ColumnsState>()((set, get) => {
  return {
    // State
    editingColumn: null,
    editingColumnTitle: "",

    // Actions
    setEditingColumn: (editingColumn) => set({ editingColumn }),
    setEditingColumnTitle: (editingColumnTitle) => set({ editingColumnTitle }),

    handleColumnDoubleClick: (tabId, columnId) => {
      const tables = useTablesStore.getState().tables;
      const table = tables[tabId];
      if (!table) return;

      const column = table.columns.find((col) => col.id === columnId);
      if (!column) return;

      set({
        editingColumn: { tabId, columnId },
        editingColumnTitle: column.title,
      });
    },

    saveColumnName: () => {
      const { editingColumn, editingColumnTitle } = get();
      if (!editingColumn) return;

      const { tabId, columnId } = editingColumn;
      const tablesStore = useTablesStore.getState();
      const tables = tablesStore.tables;

      const table = tables[tabId];
      if (!table) return;

      // Don't save empty titles
      if (editingColumnTitle.trim() === "") {
        set({
          editingColumn: null,
          editingColumnTitle: "",
        });
        return;
      }

      // Update the column title
      const updatedTable = {
        ...table,
        columns: table.columns.map((col) =>
          col.id === columnId ? { ...col, title: editingColumnTitle.trim() } : col,
        ),
      };

      // Update the table in the tables store
      tablesStore.setTables({
        ...tables,
        [tabId]: updatedTable,
      });

      // Reset editing state
      set({
        editingColumn: null,
        editingColumnTitle: "",
      });
    },

    handleColumnRenameKeyDown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        get().saveColumnName();
      } else if (e.key === "Escape") {
        e.preventDefault();
        set({
          editingColumn: null,
          editingColumnTitle: "",
        });
      }
    },

    handleColumnDragStart: (e, tabId, columnId) => {
      const tablesStore = useTablesStore.getState();
      const tables = tablesStore.tables;

      // Mark the column as being dragged
      const table = tables[tabId];
      if (!table) return;

      const updatedColumns = table.columns.map((col) =>
        col.id === columnId ? { ...col, isDragging: true } : col,
      );

      tablesStore.setTables({
        ...tables,
        [tabId]: {
          ...table,
          columns: updatedColumns,
        },
      });

      // Set data for drag operation
      e.dataTransfer.setData("text/column", JSON.stringify({ tabId, columnId }));
    },

    handleColumnDragEnd: () => {
      const tablesStore = useTablesStore.getState();
      const tables = tablesStore.tables;

      // Remove dragging state from all columns in all tables
      const updatedTables = Object.entries(tables).reduce((acc, [tabId, table]) => {
        if (!table) return { ...acc, [tabId]: table };

        const updatedColumns = table.columns.map((col) => ({
          ...col,
          isDragging: false,
        }));

        return {
          ...acc,
          [tabId]: {
            ...table,
            columns: updatedColumns,
          },
        };
      }, {});

      tablesStore.setTables(updatedTables);
    },

    handleColumnDragOver: (e, tabId, columnId) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },

    handleColumnDrop: (e, targetTabId, targetColumnId) => {
      e.preventDefault();

      try {
        const data = e.dataTransfer.getData("text/column");
        if (!data) return;

        const { tabId: sourceTabId, columnId: sourceColumnId } = JSON.parse(data);

        // Only handle drops within the same table for now
        if (sourceTabId !== targetTabId) return;
        if (sourceColumnId === targetColumnId) return;

        const tablesStore = useTablesStore.getState();
        const tables = tablesStore.tables;
        const table = tables[sourceTabId];

        if (!table) return;

        // Find the source and target column indices
        const sourceIndex = table.columns.findIndex((col) => col.id === sourceColumnId);
        const targetIndex = table.columns.findIndex((col) => col.id === targetColumnId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        // Reorder the columns
        const newColumns = [...table.columns];
        const [movedColumn] = newColumns.splice(sourceIndex, 1);
        newColumns.splice(targetIndex, 0, movedColumn);

        // Update the table
        tablesStore.setTables({
          ...tables,
          [sourceTabId]: {
            ...table,
            columns: newColumns,
          },
        });
      } catch (error) {
        console.error("Error handling column drop:", error);
      }
    },
  };
});

export default useColumnsStore;
