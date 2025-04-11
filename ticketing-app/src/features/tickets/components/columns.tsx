"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Calendar } from "lucide-react"
import { Row } from "@/types/tickets"

// Helper function to format dates
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return dateStr;
  }
};

export const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "cells.col-1",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Ticket ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "cells.col-2",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      // Access the date directly from cells object to avoid accessor issues
      const date = row.original.cells["col-2"];
      if (!date) return "";
      return formatDate(date);
    },
  },
  {
    accessorKey: "cells.col-6",
    header: "Customer Name",
  },
  {
    accessorKey: "cells.col-3",
    header: "Work Description",
  },
  {
    accessorKey: "cells.col-5",
    header: "Assign To",
  },
  {
    accessorKey: "cells.col-8",
    header: "Parts Used",
  },
  {
    accessorKey: "cells.col-7",
    header: "Status",
    cell: ({ row }) => {
      // Access status directly from cells object for reliability
      const status = row.original.cells["col-7"];
      
      if (!status) return "N/A";
      
      let bgColor = "";
      let textColor = "";
      
      switch(status) {
        case "New":
          bgColor = "bg-blue-100";
          textColor = "text-blue-800";
          break;
        case "Open":
          bgColor = "bg-indigo-100";
          textColor = "text-indigo-800";
          break;
        case "In Progress":
          bgColor = "bg-yellow-100";
          textColor = "text-yellow-800";
          break;
        case "Awaiting Parts":
          bgColor = "bg-orange-100";
          textColor = "text-orange-800";
          break;
        case "Awaiting Customer Response":
          bgColor = "bg-purple-100";
          textColor = "text-purple-800";
          break;
        case "Completed":
        case "Done":
          bgColor = "bg-green-100";
          textColor = "text-green-800";
          break;
        case "Declined":
          bgColor = "bg-red-100";
          textColor = "text-red-800";
          break;
        default:
          bgColor = "bg-gray-100";
          textColor = "text-gray-800";
      }
      
      return (
        <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
          {status}
        </div>
      )
    },
  },
  {
    accessorKey: "cells.col-9",
    header: "Total Hours",
  },
  {
    accessorKey: "cells.col-10",
    header: "Billable Hours",
  },
  {
    accessorKey: "cells.col-12",
    header: "Last Modified",
    cell: ({ row }) => {
      const date = row.original.cells["col-12"] || row.original.cells["col-2"];
      if (!date) return "";
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{formatDate(date)}</span>
        </div>
      );
    },
  },
] 