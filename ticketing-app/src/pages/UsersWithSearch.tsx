import { useState } from "react";
import { useServerPaginatedUsers } from "@/hooks/useServerPaginatedUsers";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/services/usersService";

export default function UsersWithSearch() {
  // Use our custom hook for server-side pagination and search
  const {
    users,
    isLoading,
    error,
    pagination,
    refreshUsers
  } = useServerPaginatedUsers({
    initialPage: 1,
    initialPageSize: 10,
    searchField: "first_name" // Search by first name
  });

  // Define columns for users table
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "$id",
      header: "ID",
    },
    {
      accessorKey: "first_name",
      header: "First Name",
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
    },
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "user_type_id",
      header: "User Type",
      cell: ({ row }) => {
        const userType = row.original.user_type_id;
        return <span>{userType && typeof userType === 'object' ? userType.label : 'Unknown'}</span>;
      }
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
        const user = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => console.log("Edit", user)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => console.log("Delete", user)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  // Callback when a row is clicked
  const handleRowClick = (user: User) => {
    console.log("User clicked:", user);
    // Add your row click logic here
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6">
          <div>
            <CardTitle className="text-2xl font-bold">Users</CardTitle>
            <CardDescription>
              View and manage all users with server-side search and pagination
            </CardDescription>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New User
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
            data={users}
            pagination={pagination}
            isLoading={isLoading}
            searchPlaceholder="Search by first name..."
            searchColumn="first_name"
            noResultsMessage="No users found. Try a different search term."
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    </div>
  );
} 