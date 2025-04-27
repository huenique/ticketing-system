import { format } from "date-fns";
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
import useUsersStore, { User, UserInput, UserType } from "@/stores/usersStore";

function Users() {
  const {
    users,
    userTypes,
    loading,
    error,
    fetchUsers,
    fetchUserTypes,
    updateUser,
    deleteUser,
    addUser,
  } = useUsersStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserInput>>({});

  // Define a simpler type for the new user form data
  type NewUserFormData = {
    first_name: string;
    last_name: string;
    username: string;
    user_type_id: string; // Just store the ID as a string in the form
  };

  const [newUserData, setNewUserData] = useState<NewUserFormData>({
    first_name: "",
    last_name: "",
    username: "",
    user_type_id: "", // Just the ID string
  });

  // Fetch users and user types when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user types first
        await fetchUserTypes();
        // Then load users
        await fetchUsers();
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    loadData();
  }, [fetchUsers, fetchUserTypes]);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      user_type_id: user.user_type_id, // This will be the actual user_type_id object
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await deleteUser(userId);
    }
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "user_type_id") {
      // For user_type_id, we store the ID directly
      setEditFormData((prev) => ({
        ...prev,
        user_type_id: value, // Store just the ID
      }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleNewUserFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setNewUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      await updateUser(selectedUser.$id, editFormData);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleSubmitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // For the API call, we need to convert the form data to the format expected by Appwrite
      const selectedUserType = userTypes.find(
        (type) => type.$id === newUserData.user_type_id,
      );

      if (!selectedUserType) {
        toast.warning("Please select a valid user type");
        return;
      }

      console.log("Selected user type:", selectedUserType);

      // Submit the form with the user type ID
      await addUser({
        first_name: newUserData.first_name,
        last_name: newUserData.last_name,
        username: newUserData.username,
        user_type_id: newUserData.user_type_id, // Send the ID string
      });

      setIsAddDialogOpen(false);
      setNewUserData({
        first_name: "",
        last_name: "",
        username: "",
        user_type_id: "",
      });
    } catch (error) {
      console.error("Failed to add user:", error);
      toast.error("Failed to add user. Please check the console for details.");
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "No date";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Get user type label by ID
  const getUserTypeLabel = (userType: any) => {
    // Check if userType exists
    if (!userType) return "Unknown";

    // If userType is a string, try to find the label from userTypes
    if (typeof userType === "string") {
      const foundType = userTypes.find((ut) => ut.$id === userType);
      return foundType?.label || "Unknown";
    }

    // If userType is an object with a label property
    if (typeof userType === "object" && userType.label) {
      return String(userType.label);
    }

    return "Unknown";
  };

  // Ensure the empty state has a key
  const renderEmptyState = () => (
    <TableRow key="empty-state">
      <TableCell colSpan={7} className="text-center py-4 text-neutral-500">
        No users found. Add a new user to get started.
      </TableCell>
    </TableRow>
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading users...</h2>
          <p className="text-neutral-500">Please wait while we fetch the data.</p>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">
            Error loading users
          </h2>
          <p className="text-neutral-500 mb-4">{error.message}</p>
          <button
            onClick={() => fetchUsers()}
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
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-neutral-500">
            Manage your team members and user permissions
          </p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>User Type</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0
              ? renderEmptyState()
              : users.map((user) => (
                  <TableRow key={user.$id || `user-${Math.random()}`}>
                    <TableCell>{user.$id}</TableCell>
                    <TableCell>{user.first_name}</TableCell>
                    <TableCell>{user.last_name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{getUserTypeLabel(user.user_type_id)}</TableCell>
                    <TableCell>{formatDate(user.$updatedAt)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user.$id)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user information here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="first_name" className="text-sm font-medium block">
                  First Name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={editFormData.first_name || ""}
                  onChange={handleEditFormChange}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="last_name" className="text-sm font-medium block">
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={editFormData.last_name || ""}
                  onChange={handleEditFormChange}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium block">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={editFormData.username || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="user_type_id" className="text-sm font-medium block">
                User Type
              </label>
              <select
                id="user_type_id"
                name="user_type_id"
                value={
                  typeof editFormData.user_type_id === "string"
                    ? editFormData.user_type_id
                    : editFormData.user_type_id?.$id || ""
                }
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white"
              >
                <option value="">Select a user type</option>
                {userTypes && userTypes.length > 0 ? (
                  userTypes.map((type) => (
                    <option
                      key={type.$id || `type-${Math.random()}`}
                      value={type.$id || ""}
                    >
                      {type.label ? String(type.label) : "Unknown type"}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No user types available
                  </option>
                )}
              </select>
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Add New User</DialogTitle>
            <DialogDescription>
              Fill out the form below to add a new user to the system.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitNewUser} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="first_name" className="text-sm font-medium block">
                  First Name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={newUserData.first_name}
                  onChange={handleNewUserFormChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="last_name" className="text-sm font-medium block">
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={newUserData.last_name}
                  onChange={handleNewUserFormChange}
                  required
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium block">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={newUserData.username}
                onChange={handleNewUserFormChange}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="user_type_id" className="text-sm font-medium block">
                User Type
              </label>
              <select
                id="user_type_id"
                name="user_type_id"
                value={newUserData.user_type_id}
                onChange={handleNewUserFormChange}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white"
              >
                <option value="">Select a user type</option>
                {userTypes && userTypes.length > 0 ? (
                  userTypes.map((type) => (
                    <option
                      key={type.$id || `type-${Math.random()}`}
                      value={type.$id || ""}
                    >
                      {type.label ? String(type.label) : "Unknown type"}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No user types available
                  </option>
                )}
              </select>
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add User"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Users;
