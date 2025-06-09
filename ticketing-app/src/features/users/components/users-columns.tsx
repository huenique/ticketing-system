"use client";

import { ColumnDef } from "@tanstack/react-table";
import { 
  createActionsColumn, 
  createIdColumn, 
  createStandardColumn, 
  createUpdatedAtColumn,
  DataTableActions
} from "@/components/ui/data-table";

// Update the User interface to match the actual User type from the store
export interface User {
  $id: string;
  first_name: string;
  last_name: string;
  username: string;
  auth_user_id?: string;
  user_type_id: any; // This can be either a string or an object with $id and label
  $createdAt: string;
  $updatedAt: string;
  // Add additional Appwrite document properties
  $permissions: string[];
  $databaseId: string;
  $collectionId?: string;
}

export interface UserActions extends DataTableActions<User> {
  onViewDetails?: (user: User) => void;
}

export const getUsersColumns = (actions: UserActions): ColumnDef<User>[] => {
  // Create an array of columns
  const columns: ColumnDef<User>[] = [
    createStandardColumn<User>("username", "Username"),
    {
      accessorFn: (user) => `${user.first_name} ${user.last_name}`,
      header: "Full Name",
      id: "fullName",
    },
    createStandardColumn<User>("first_name", "First Name"),
    createStandardColumn<User>("last_name", "Last Name"),
    {
      accessorFn: (user) => {
        if (typeof user.user_type_id === 'string') {
          return user.user_type_id;
        } else if (user.user_type_id && typeof user.user_type_id === 'object' && 'label' in user.user_type_id) {
          return user.user_type_id.label;
        }
        return 'Unknown';
      },
      header: "User Type",
      id: "userType",
    },
    {
      accessorFn: (user) => user.auth_user_id ? "Linked" : "Not linked",
      header: "Auth Link",
      id: "authLink",
      cell: ({ getValue }) => {
        const value = getValue();
        if (value === "Linked") {
          return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Linked</span>;
        }
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Not linked</span>;
      }
    },
    createUpdatedAtColumn<User>(),
  ];

  // Add the actions column
  const actionsColumn = createActionsColumn<User>({
    onEdit: actions.onEdit,
    onDelete: actions.onDelete,
    onView: actions.onViewDetails
  });

  return [...columns, actionsColumn];
}; 