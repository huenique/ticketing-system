import { useState } from "react";

import { Tables } from "@/types/tables";
import { EditingColumn } from "@/types/tickets";

/**
 * Custom hook to manage column operations
 */
export function useColumns() {
  const [editingColumn, setEditingColumn] = useState<EditingColumn | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);

  // Handle column rename
  const handleColumnDoubleClick = (tabId: string, columnId: string, tables: Tables) => {
    const table = tables[tabId];
    if (!table) return;

    const column = table.columns.find(
      (col: Record<string, string>) => col.id === columnId,
    );
    if (!column) return;

    setEditingColumn({ tabId, columnId });
    setEditingColumnTitle(column.title);
  };

  const saveColumnName = (tables: Tables, setTables: (tables: Tables) => void) => {
    if (!editingColumn) return;

    const { tabId, columnId } = editingColumn;
    const table = tables[tabId];
    if (!table) return;

    // Don't save empty titles
    if (editingColumnTitle.trim() === "") {
      cancelColumnRename();
      return;
    }

    setTables({
      ...tables,
      [tabId]: {
        ...table,
        columns: table.columns.map((col) =>
          col.id === columnId ? { ...col, title: editingColumnTitle.trim() } : col,
        ),
      },
    });

    setEditingColumn(null);
    setEditingColumnTitle("");
  };

  const cancelColumnRename = () => {
    setEditingColumn(null);
    setEditingColumnTitle("");
  };

  const handleColumnRenameKeyDown = (
    e: React.KeyboardEvent,
    tables: Tables,
    setTables: (tables: Tables) => void,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveColumnName(tables, setTables);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelColumnRename();
    }
  };

  // Column dragging handlers
  const handleColumnDragStart = (
    e: React.DragEvent,
    tabId: string,
    columnId: string,
    tables: Tables,
    setTables: (tables: Tables) => void,
  ) => {
    e.stopPropagation();
    setIsDraggingColumn(true);
    setDraggedColumn(columnId);
    e.dataTransfer.setData("text/plain", columnId);

    // Using setTimeout to allow the drag effect to show before applying styles
    setTimeout(() => {
      const table = tables[tabId];
      if (!table) return;

      setTables({
        ...tables,
        [tabId]: {
          ...table,
          columns: table.columns.map((col) =>
            col.id === columnId ? { ...col, isDragging: true } : col,
          ),
        },
      });
    }, 0);
  };

  const handleColumnDragEnd = (
    tabId: string,
    tables: Tables,
    setTables: (tables: Tables) => void,
  ) => {
    setIsDraggingColumn(false);
    setDraggedColumn(null);

    const table = tables[tabId];
    if (!table) return;

    setTables({
      ...tables,
      [tabId]: {
        ...table,
        columns: table.columns.map((col) => ({ ...col, isDragging: false })),
      },
    });
  };

  const handleColumnDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
    e.preventDefault();
    // We only need to prevent default to allow dropping
  };

  const handleColumnDrop = (
    e: React.DragEvent,
    tabId: string,
    targetColumnId: string,
    tables: Tables,
    setTables: (tables: Tables) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const table = tables[tabId];
    if (!table) return;

    const draggedColumnIndex = table.columns.findIndex(
      (col) => col.id === draggedColumn,
    );
    const targetColumnIndex = table.columns.findIndex(
      (col) => col.id === targetColumnId,
    );

    if (draggedColumnIndex === -1 || targetColumnIndex === -1) return;

    // Reorder columns
    const newColumns = [...table.columns];
    const [draggedColumnItem] = newColumns.splice(draggedColumnIndex, 1);

    // Simple swap - just place at target index
    newColumns.splice(targetColumnIndex, 0, draggedColumnItem);

    setTables({
      ...tables,
      [tabId]: {
        ...table,
        columns: newColumns,
      },
    });

    setIsDraggingColumn(false);
    setDraggedColumn(null);
  };

  return {
    editingColumn,
    setEditingColumn,
    editingColumnTitle,
    setEditingColumnTitle,
    draggedColumn,
    setDraggedColumn,
    isDraggingColumn,
    setIsDraggingColumn,
    handleColumnDoubleClick,
    saveColumnName,
    cancelColumnRename,
    handleColumnRenameKeyDown,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  };
}
