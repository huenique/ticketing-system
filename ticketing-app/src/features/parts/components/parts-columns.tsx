"use client";

import { ColumnDef } from "@tanstack/react-table";
import { 
  createActionsColumn, 
  createIdColumn, 
  createStandardColumn, 
  createUpdatedAtColumn,
  DataTableActions
} from "@/components/ui/data-table";

// Update Part interface based on the actual Part type in the application
export interface Part {
  $id: string;
  description: string;
  quantity: string;
  price: string;
  vendor: string;
  $createdAt: string;
  $updatedAt?: string;
  // Add additional Appwrite document properties
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
}

export interface PartActions extends DataTableActions<Part> {}

export const getPartsColumns = (actions: PartActions): ColumnDef<Part>[] => {
  // Create an array of columns
  const columns: ColumnDef<Part>[] = [
    createStandardColumn<Part>("description", "Description"),
    createStandardColumn<Part>("quantity", "Quantity"),
    createStandardColumn<Part>("price", "Price"),
    createStandardColumn<Part>("vendor", "Vendor"),
    createUpdatedAtColumn<Part>(),
  ];

  // Add the actions column
  const actionsColumn = createActionsColumn<Part>({
    onEdit: actions.onEdit,
    onDelete: actions.onDelete,
  });

  return [...columns, actionsColumn];
}; 