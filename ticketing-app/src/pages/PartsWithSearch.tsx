import { useState } from "react";
import { useServerPaginatedParts } from "@/hooks/useServerPaginatedParts";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef } from "@tanstack/react-table";
import { Part } from "@/services/partsService";

export default function PartsWithSearch() {
  // Use our custom hook for server-side pagination and search
  const {
    parts,
    isLoading,
    error,
    pagination,
    refreshParts
  } = useServerPaginatedParts({
    initialPage: 1,
    initialPageSize: 10,
    searchField: "description" // Search the description field
  });

  // Define columns for parts table
  const columns: ColumnDef<Part>[] = [
    {
      accessorKey: "$id",
      header: "ID",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "price",
      header: "Price",
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
    },
    {
      accessorKey: "$updatedAt",
      header: "Last Update",
      cell: ({ row }) => {
        const date = new Date(row.getValue("$updatedAt"));
        return <span>{date.toLocaleDateString()}</span>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const part = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => console.log("Edit", part)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => console.log("Delete", part)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  // Callback when a row is clicked
  const handleRowClick = (part: Part) => {
    console.log("Part clicked:", part);
    // Add your row click logic here
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6">
          <div>
            <CardTitle className="text-2xl font-bold">Parts</CardTitle>
            <CardDescription>
              View and manage all parts with server-side search and pagination
            </CardDescription>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Part
          </Button>
        </CardHeader>
        <CardContent className="px-6 pt-4 pb-6">
          {error && (
            <div className="border border-red-200 rounded bg-red-50 p-4 mb-4 text-red-500">
              Error: {error.message}
            </div>
          )}

          {/* Pass the columns and data to the DataTable along with pagination */}
          <DataTable
            columns={columns}
            data={parts}
            pagination={pagination}
            isLoading={isLoading}
            searchPlaceholder="Search part descriptions..."
            searchColumn="description"
            noResultsMessage="No parts found. Try a different search term."
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    </div>
  );
} 