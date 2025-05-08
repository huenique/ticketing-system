import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useUsersStore from "@/stores/usersStore";
import { DataTable } from "@/components/ui/data-table";
import { getUserTypesColumns, UserTypeActions } from "@/features/users/components/user-types-columns";

type UserType = {
  $id: string;
  label: string;
  $createdAt?: string;
  $updatedAt?: string;
};

function UserTypes() {
  const { userTypes, loading, error, fetchUserTypes, addUserType, updateUserType, deleteUserType } = useUsersStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [newUserTypeLabel, setNewUserTypeLabel] = useState("");
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [userTypeToDelete, setUserTypeToDelete] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user types when component mounts
  useEffect(() => {
    fetchUserTypes();
  }, [fetchUserTypes]);

  const handleAddUserType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserTypeLabel.trim()) {
      toast.error("User type label cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await addUserType({ label: newUserTypeLabel });
      toast.success("User type added successfully");
      setNewUserTypeLabel("");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding user type:", error);
      toast.error(`Failed to add user type: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (userType: UserType) => {
    setSelectedUserType(userType);
    setEditLabel(userType.label);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUserType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserType || !editLabel.trim()) {
      toast.error("User type label cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserType(selectedUserType.$id, { label: editLabel });
      toast.success("User type updated successfully");
      setIsEditDialogOpen(false);
      setSelectedUserType(null);
    } catch (error) {
      console.error("Error updating user type:", error);
      toast.error(`Failed to update user type: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (userTypeId: string) => {
    setUserTypeToDelete(userTypeId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userTypeToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteUserType(userTypeToDelete);
      toast.success("User type deleted successfully");
    } catch (error) {
      console.error("Error deleting user type:", error);
      toast.error(`Failed to delete user type: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setUserTypeToDelete(null);
    }
  };

  const renderEmptyState = () => (
    <div className="rounded-lg border bg-white shadow-sm p-2 text-center py-8 text-neutral-500">
      No user types found. Add a new user type to get started.
    </div>
  );

  if (loading && userTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading user types...</h2>
          <p className="text-neutral-500">Please wait while we fetch the data.</p>
        </div>
      </div>
    );
  }

  if (error && userTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">
            Error loading user types
          </h2>
          <p className="text-neutral-500 mb-4">{error.message}</p>
          <button
            onClick={() => fetchUserTypes()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Types</h1>
          <p className="text-neutral-500">
            Manage user types for system access and permissions
          </p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          Add User Type
        </button>
      </div>

      {userTypes.length === 0 ? (
        renderEmptyState()
      ) : (
        <DataTable
          columns={getUserTypesColumns({
            onEdit: handleEditClick,
            onDelete: handleDeleteClick,
          })}
          data={userTypes}
          isLoading={loading && userTypes.length === 0}
          searchPlaceholder="Search user types..."
          searchColumn="label"
          noResultsMessage="No user types found."
        />
      )}

      {/* Add User Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Add New User Type</DialogTitle>
            <DialogDescription>
              Create a new user type for the system.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUserType} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="label" className="text-sm font-medium block">
                Label
              </label>
              <input
                id="label"
                name="label"
                type="text"
                value={newUserTypeLabel}
                onChange={(e) => setNewUserTypeLabel(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                placeholder="e.g. Admin, User, Manager"
              />
              <p className="text-xs text-neutral-500 mt-1">
                This label will be used to identify the user type in the system
              </p>
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add User Type"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Edit User Type</DialogTitle>
            <DialogDescription>
              Update the user type information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateUserType} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="edit-label" className="text-sm font-medium block">
                Label
              </label>
              <input
                id="edit-label"
                name="edit-label"
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update User Type"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Type Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete User Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
            <p>Warning: Deleting a user type may affect users who are currently assigned to this type.</p>
          </div>
          <DialogFooter>
            <button 
              disabled={isDeleting} 
              className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-md text-sm"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </button>
            <button 
              disabled={isDeleting} 
              className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm ml-2"
              onClick={confirmDelete}
            >
              {isDeleting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserTypes; 