import { useState } from "react";

import { EditingColumn } from "../types/tickets";

/**
 * Custom hook to manage column operations
 */
export function useColumns() {
  const [editingColumn, setEditingColumn] = useState<EditingColumn | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);

  // Handle column rename
  const handleColumnDoubleClick = (
    tabId: string,
    columnId: string,
    tables: Record<string, any>,
  ) => {
    const table = tables[tabId];
    if (!table) return;

    const column = table.columns.find((col: any) => col.id === columnId);
    if (!column) return;

    setEditingColumn({ tabId, columnId });
    setEditingColumnTitle(column.title);
  };

  const saveColumnName = (
    tables: Record<string, any>,
    setTables: (tables: Record<string, any>) => void,
  ) => {
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
        columns: table.columns.map((col: any) =>
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
    tables: Record<string, any>,
    setTables: (tables: Record<string, any>) => void,
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
    tables: Record<string, any>,
    setTables: (tables: Record<string, any>) => void,
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
          columns: table.columns.map((col: any) =>
            col.id === columnId ? { ...col, isDragging: true } : col,
          ),
        },
      });
    }, 0);
  };

  const handleColumnDragEnd = (
    tabId: string,
    tables: Record<string, any>,
    setTables: (tables: Record<string, any>) => void,
  ) => {
    setIsDraggingColumn(false);
    setDraggedColumn(null);

    const table = tables[tabId];
    if (!table) return;

    setTables({
      ...tables,
      [tabId]: {
        ...table,
        columns: table.columns.map((col: any) => ({ ...col, isDragging: false })),
      },
    });
  };

  const handleColumnDragOver = (
    e: React.DragEvent<HTMLTableHeaderCellElement>,
    tabId: string,
    columnId: string,
  ) => {
    e.preventDefault();
    // We only need to prevent default to allow dropping
  };

  const handleColumnDrop = (
    e: React.DragEvent,
    tabId: string,
    targetColumnId: string,
    tables: Record<string, any>,
    setTables: (tables: Record<string, any>) => void,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const table = tables[tabId];
    if (!table) return;

    const draggedColumnIndex = table.columns.findIndex(
      (col: any) => col.id === draggedColumn,
    );
    const targetColumnIndex = table.columns.findIndex(
      (col: any) => col.id === targetColumnId,
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
