"use client";

import { ColumnDef } from "@tanstack/react-table";
import { LucideIcon } from "lucide-react";

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

// Generic interface for action handlers
export interface DataTableActions<T> {
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (itemId: string) => void;
  extraActions?: ExtraAction<T>[];
}

// Define interface for extra action buttons
export interface ExtraAction<T> {
  icon: LucideIcon;
  label: string;
  onClick: (item: T) => void;
  className?: string;
}

// Generic function to create an actions column
export function createActionsColumn<T extends { id?: string; $id?: string }>(
  actions: DataTableActions<T>
): ColumnDef<T> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const item = row.original;
      const itemId = getDocumentId(item);
      
      return (
        <div className="flex space-x-2">
          {actions.extraActions?.map((extraAction, index) => {
            const Icon = extraAction.icon;
            return (
              <button
                key={`extra-action-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  extraAction.onClick(item);
                }}
                className={extraAction.className || "p-1 text-gray-600 hover:text-gray-800"}
                title={extraAction.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
          
          {actions.onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onEdit!(item);
              }}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          
          {actions.onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                actions.onDelete!(itemId);
              }}
              className="p-1 text-red-600 hover:text-red-800"
              title="Delete"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
      );
    },
  };
}

// Create standard columns for common fields
export const createIdColumn = <T extends { id?: string; $id?: string }>(header: string = "ID"): ColumnDef<T> => ({
  accessorFn: (item) => getDocumentId(item),
  header,
  id: "id",
});

export const createUpdatedAtColumn = <T extends { updatedAt?: string; $updatedAt?: string }>(
  header: string = "Last Modified"
): ColumnDef<T> => ({
  accessorFn: (item) => formatDate(getDocumentTimestamp(item)),
  header,
  id: "updated",
});

export const createStandardColumn = <T,>(
  accessorKey: keyof T | string,
  header: string
): ColumnDef<T> => ({
  accessorKey: accessorKey as string,
  header,
}); 