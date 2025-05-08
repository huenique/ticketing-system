"use client";

import { UserPlus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Customer as AppwriteCustomer } from "@/services/customersService";
import { Customer as CommonCustomer } from "@/types/common";
import { 
  createActionsColumn, 
  createIdColumn, 
  createStandardColumn, 
  createUpdatedAtColumn,
  getDocumentId,
  DataTableActions
} from "@/components/ui/data-table";

// Create a union type for both Customer types
export type CustomerType = CommonCustomer | AppwriteCustomer;

export interface CustomerActions extends DataTableActions<CustomerType> {
  onViewContacts?: (customer: CustomerType) => void;
}

export const getCustomersColumns = (actions: CustomerActions): ColumnDef<CustomerType>[] => {
  // Create an array of columns
  const columns: ColumnDef<CustomerType>[] = [
    createIdColumn<CustomerType>("Customer ID"),
    createStandardColumn<CustomerType>("name", "Name"),
    createStandardColumn<CustomerType>("address", "Address"),
    createStandardColumn<CustomerType>("primary_contact_name", "Primary Contact"),
    createStandardColumn<CustomerType>("primary_contact_number", "Primary Contact Number"),
    createStandardColumn<CustomerType>("primary_email", "Primary Email"),
    {
      accessorFn: (customer) => customer.abn || "N/A",
      header: "ABN",
      id: "abn",
    },
    createUpdatedAtColumn<CustomerType>(),
  ];

  // Add a custom actions column with the contacts button
  const actionsColumn = createActionsColumn<CustomerType>({
    onEdit: actions.onEdit,
    onDelete: actions.onDelete,
    extraActions: actions.onViewContacts ? [
      {
        icon: UserPlus,
        label: "View Contacts",
        onClick: (customer) => actions.onViewContacts!(customer),
        className: "p-1 text-gray-600 hover:text-gray-800"
      }
    ] : undefined
  });

  return [...columns, actionsColumn];
}; 