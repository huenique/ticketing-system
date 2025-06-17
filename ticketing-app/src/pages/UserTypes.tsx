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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useUsersStore from "@/stores/usersStore";
import { useAppwriteStatuses } from "@/hooks/useAppwriteStatuses";
import { Checkbox } from "@/components/ui/checkbox";

type UserType = {
  $id: string;
  label: string;
  allowedStatuses?: string[];
  $createdAt?: string;
  $updatedAt?: string;
};

function UserTypes() {
  const { userTypes, loading, error, fetchUserTypes, addUserType, updateUserType, deleteUserType } = useUsersStore();
  const { statuses, fetchStatuses } = useAppwriteStatuses();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [newUserTypeLabel, setNewUserTypeLabel] = useState("");
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [userTypeToDelete, setUserTypeToDelete] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUserTypes, setFilteredUserTypes] = useState<UserType[]>([]);

  // Fetch user types and statuses when component mounts
  useEffect(() => {
    fetchUserTypes();
    fetchStatuses();
  }, [fetchUserTypes, fetchStatuses]);

  // Filter user types when search query or user types change
  useEffect(() => {
    if (!userTypes) {
      setFilteredUserTypes([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredUserTypes(userTypes);
      return;
    }

    const filtered = userTypes.filter(userType => 
      userType.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userType.$id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUserTypes(filtered);
  }, [searchQuery, userTypes]);

  const handleSearch = () => {
    // This function triggers the search effect by using the current searchQuery value
    // The actual filtering happens in the useEffect above
    setSearchQuery(searchQuery.trim());
  };

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
    setSelectedStatuses(userType.allowedStatuses || []);
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
      await updateUserType(selectedUserType.$id, { 
        label: editLabel,
        allowedStatuses: selectedStatuses 
      });
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

  // Format date to match the desired format
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  if (loading && !userTypes.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Loading user types...</h2>
          <p className="text-gray-700">Please wait while we fetch the data.</p>
        </div>
      </div>
    );
  }

  if (error && !userTypes.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-700">
            Error loading user types
          </h2>
          <p className="text-gray-700 mb-4">{error.message}</p>
          <button
            onClick={() => fetchUserTypes()}
            className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-gray-900">User Types</h1>
      <p className="text-gray-700 mb-5">Manage user types for system access and permissions</p>

      <div className="flex justify-between mb-4">
        <div className="flex gap-2 w-full max-w-lg">
          <div className="w-full">
            <Input
              placeholder="Search user types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-2 border-gray-300 focus:border-blue-600 text-gray-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
            >
              Clear
            </Button>
          )}
          <Button 
            onClick={handleSearch} 
            className="bg-blue-700 text-white hover:bg-blue-800 font-medium"
          >
            Search
          </Button>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-green-700 text-white hover:bg-green-800 font-medium flex items-center gap-1"
        >
          <Plus size={16} />
          Add User Type
        </Button>
      </div>

      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-900">Label</TableHead>
              <TableHead className="font-semibold text-gray-900">Created At</TableHead>
              <TableHead className="font-semibold text-gray-900">Last Modified</TableHead>
              <TableHead className="font-semibold text-gray-900 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUserTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-gray-700 font-medium">
                  No user types found
                </TableCell>
              </TableRow>
            ) : (
              filteredUserTypes.map((userType) => (
                <TableRow key={userType.$id} className="border-t border-gray-200">
                  <TableCell className="font-medium text-gray-900">{userType.label}</TableCell>
                  <TableCell className="text-gray-800">{formatDate(userType.$createdAt)}</TableCell>
                  <TableCell className="text-gray-800">{formatDate(userType.$updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(userType)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(userType.$id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            {filteredUserTypes.length > 0 ? (
              <>1-{filteredUserTypes.length} of {filteredUserTypes.length} row(s)</>
            ) : (
              <>0 rows</>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-2">Rows per page</span>
            <select className="border border-gray-300 rounded p-1 text-sm">
              <option>10</option>
            </select>
            <div className="flex ml-4">
              <span className="text-sm text-gray-700 mr-2">Page 1 of 1</span>
              <div className="flex">
                <button className="px-2 py-1 border border-gray-300 rounded-l text-gray-500">&lt;&lt;</button>
                <button className="px-2 py-1 border-t border-b border-gray-300 text-gray-500">&lt;</button>
                <button className="px-2 py-1 border-t border-b border-gray-300 text-gray-500">&gt;</button>
                <button className="px-2 py-1 border border-gray-300 rounded-r text-gray-500">&gt;&gt;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Add New User Type</DialogTitle>
            <DialogDescription className="text-gray-700">
              Create a new user type for the system.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUserType} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="label" className="text-sm font-medium block text-gray-800">
                Label
              </label>
              <input
                id="label"
                name="label"
                type="text"
                value={newUserTypeLabel}
                onChange={(e) => setNewUserTypeLabel(e.target.value)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                placeholder="e.g. Admin, User, Manager"
              />
              <p className="text-xs text-gray-700 mt-1">
                This label will be used to identify the user type in the system
              </p>
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className="rounded-md bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Add User Type
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Edit User Type</DialogTitle>
            <DialogDescription className="text-gray-700">
              Update the user type information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateUserType} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="edit-label" className="text-sm font-medium block text-gray-800">
                Label
              </label>
              <input
                id="edit-label"
                name="edit-label"
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block text-gray-800">
                Allowed Statuses
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-gray-300 rounded-md p-2">
                {statuses.map((status) => {
                  const statusId = status.$id || status.id;
                  if (!statusId) return null;
                  
                  return (
                    <div key={statusId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${statusId}`}
                        checked={selectedStatuses.includes(statusId)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, statusId]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(id => id !== statusId));
                          }
                        }}
                      />
                      <label
                        htmlFor={`status-${statusId}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {status.label}
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-700 mt-1">
                Select which statuses this user type can access
              </p>
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-md bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Type Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Delete User Type</DialogTitle>
            <DialogDescription className="text-gray-700">
              Are you sure you want to delete this user type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm border border-yellow-200 font-medium">
            <p>Warning: Deleting a user type may affect users who are currently assigned to this type.</p>
          </div>
          <DialogFooter>
            <button 
              disabled={isDeleting} 
              className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </button>
            <button 
              disabled={isDeleting} 
              className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium ml-2"
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