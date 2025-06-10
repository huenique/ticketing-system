"use client";

import { ColumnDef } from "@tanstack/react-table";
import { 
  createActionsColumn, 
  createIdColumn, 
  createStandardColumn, 
  createUpdatedAtColumn,
  DataTableActions
} from "@/components/ui/data-table";

// UserType interface based on the existing data structure
export interface UserType {
  $id: string;
  label: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface UserTypeActions extends DataTableActions<UserType> {}

export const getUserTypesColumns = (actions: UserTypeActions): ColumnDef<UserType>[] => {
  // Create an array of columns
  const columns: ColumnDef<UserType>[] = [
    createStandardColumn<UserType>("label", "Label"),
    {
      accessorFn: (userType) => userType.$createdAt 
        ? new Date(userType.$createdAt).toLocaleDateString() 
        : "Unknown",
      header: "Created At",
      id: "created",
    },
    createUpdatedAtColumn<UserType>(),
  ];

  // Add the actions column
  const actionsColumn = createActionsColumn<UserType>({
    onEdit: actions.onEdit,
    onDelete: actions.onDelete,
  });

  return [...columns, actionsColumn];
}; 