"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { getUsersColumns, User, UserActions } from "@/features/users/components/users-columns";
import { Button } from "@/components/ui/button";

// This is just a sample implementation to demonstrate how to use the reusable DataTable
function UsersExample() {
  // Sample data
  const [users, setUsers] = useState<User[]>([
    {
      $id: "1",
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      user_type_id: "admin",
      $updatedAt: new Date().toISOString(),
    },
    {
      $id: "2",
      first_name: "Jane",
      last_name: "Smith",
      username: "janesmith",
      user_type_id: "user",
      $updatedAt: new Date().toISOString(),
    },
    {
      $id: "3",
      first_name: "Robert",
      last_name: "Johnson",
      username: "rjohnson",
      user_type_id: "manager",
      $updatedAt: new Date().toISOString(),
    },
  ]);

  const [loading, setLoading] = useState(false);

  // Handlers for user actions
  const handleEditUser = (user: User) => {
    console.log("Edit user:", user);
    // Implement edit logic
  };

  const handleDeleteUser = (userId: string) => {
    console.log("Delete user:", userId);
    // Filter out the deleted user
    setUsers(users.filter(user => user.$id !== userId));
  };

  const handleViewUserDetails = (user: User) => {
    console.log("View user details:", user);
    // Implement view details logic
  };

  // Configure the actions to pass to the columns
  const userActions: UserActions = {
    onEdit: handleEditUser,
    onDelete: handleDeleteUser,
    onViewDetails: handleViewUserDetails,
  };

  // Get columns configuration
  const userColumns = getUsersColumns(userActions);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-neutral-500">
            Manage users and their permissions
          </p>
        </div>
        <Button className="flex items-center gap-1">
          <Plus size={16} />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-lg border bg-white shadow-sm p-2 text-center py-8 text-neutral-500">
          No users found. Add a new user to get started.
        </div>
      ) : (
        <DataTable
          columns={userColumns}
          data={users}
          onRowClick={handleViewUserDetails}
          isLoading={loading}
          searchPlaceholder="Search users..."
          searchColumn="username"
          noResultsMessage="No users found."
        />
      )}
    </div>
  );
}

export default UsersExample; 