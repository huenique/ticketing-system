"use client";

import { UserPlus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Customer as AppwriteCustomer, CustomerContact as AppwriteCustomerContact } from "@/services/customersService";
import { Customer as CommonCustomer, CustomerContact } from "@/types/common";
import { 
  createActionsColumn, 
  createIdColumn, 
  createStandardColumn, 
  createUpdatedAtColumn,
  getDocumentId,
  DataTableActions
} from "@/components/ui/data-table";

// Create a union type for both Customer types
export type CustomerType = (CommonCustomer | AppwriteCustomer) & {
  contacts?: CustomerContact[];
};

export interface CustomerActions extends DataTableActions<CustomerType> {
  onViewContacts?: (customer: CustomerType) => void;
}

export const getCustomersColumns = (actions: CustomerActions): ColumnDef<CustomerType>[] => {
  // Create an array of columns
  const columns: ColumnDef<CustomerType>[] = [
    createStandardColumn<CustomerType>("name", "Name"),
    createStandardColumn<CustomerType>("address", "Address"),
    {
      accessorFn: (customer) => {
        const firstContact = customer.contacts?.[0];
        return firstContact ? `${firstContact.first_name} ${firstContact.last_name}`.trim() : "No Contact";
      },
      header: "Primary Contact",
      id: "primary_contact_name",
    },
    {
      accessorFn: (customer) => {
        const firstContact = customer.contacts?.[0];
        return firstContact?.contact_number || "No Contact Number";
      },
      header: "Primary Contact Number",
      id: "primary_contact_number",
    },
    {
      accessorFn: (customer) => {
        const firstContact = customer.contacts?.[0];
        return firstContact?.email || "No Email";
      },
      header: "Primary Email",
      id: "primary_email",
    },
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