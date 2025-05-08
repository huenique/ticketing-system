"use client";

import { Edit, Trash2, UserPlus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Customer as AppwriteCustomer } from "@/services/customersService";
import { Customer as CommonCustomer } from "@/types/common";

// Create a union type for both Customer types
type CustomerType = CommonCustomer | AppwriteCustomer;

// Helper function to get customer ID regardless of type
const getCustomerId = (customer: CustomerType): string => {
  if ("$id" in customer) {
    return customer.$id;
  }
  return customer.id;
};

// Helper function to get updated timestamp
const getUpdatedTimestamp = (customer: CustomerType): string | undefined => {
  if ("$updatedAt" in customer) {
    return customer.$updatedAt;
  }
  return undefined;
};

// Helper function to format date
export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

// Generic ID getter function for Appwrite documents
export const getDocumentId = <T extends { id?: string; $id?: string }>(item: T): string => {
  if ("$id" in item && item.$id) {
    return item.$id;
  }
  if ("id" in item && item.id) {
    return item.id;
  }
  return "";
};

// Generic timestamp getter function
export const getDocumentTimestamp = <T extends { updatedAt?: string; $updatedAt?: string }>(
  item: T
): string | undefined => {
  if ("$updatedAt" in item && item.$updatedAt) {
    return item.$updatedAt;
  }
  if ("updatedAt" in item && item.updatedAt) {
    return item.updatedAt;
  }
  return undefined;
};

export type CustomerActions = {
  onViewContacts: (customer: CustomerType) => void;
  onEdit: (customer: CustomerType) => void;
  onDelete: (customerId: string) => void;
};

export const columns = (actions: CustomerActions): ColumnDef<CustomerType>[] => [
  {
    accessorFn: (customer) => getCustomerId(customer),
    header: "Customer ID",
    id: "id",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "address",
    header: "Address",
  },
  {
    accessorKey: "primary_contact_name",
    header: "Primary Contact",
  },
  {
    accessorKey: "primary_contact_number",
    header: "Primary Contact Number",
  },
  {
    accessorKey: "primary_email",
    header: "Primary Email",
  },
  {
    accessorFn: (customer) => customer.abn || "N/A",
    header: "ABN",
    id: "abn",
  },
  {
    accessorFn: (customer) => formatDate(getUpdatedTimestamp(customer)),
    header: "Last Modified",
    id: "updated",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.onViewContacts(customer);
            }}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="View Contacts"
          >
            <UserPlus size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.onEdit(customer);
            }}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit Customer"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.onDelete(getCustomerId(customer));
            }}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete Customer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      );
    },
  },
]; 