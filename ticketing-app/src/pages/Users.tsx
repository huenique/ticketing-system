import { format } from "date-fns";
import { Edit, Plus, Trash2, Loader2, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
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
import { authService } from "@/lib/appwrite";
import useUsersStore, { User, UserInput } from "@/stores/usersStore";
import { DataTable } from "@/components/ui/data-table";
import { getUsersColumns, UserActions } from "@/features/users/components/users-columns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/ui/change-password-dialog";

// Import server paginated users hook
import { useServerPaginatedUsers } from "@/hooks/useServerPaginatedUsers";

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
  
  // State for search
  const [searchValue, setSearchValue] = useState("");
  const searchValueRef = useRef(searchValue);
  // Always use "all" for searching all fields and remove the dropdown
  const selectedSearchField = "all";

  // Use server paginated users hook
  const {
    users: serverUsers,
    isLoading,
    error: serverError,
    pagination,
    searchTerm,
    refreshUsers
  } = useServerPaginatedUsers({
    initialPage: 1,
    initialPageSize: 10,
    initialSearchTerm: "",
    searchField: "all"
  });

  // Handle search
  const handleSearch = () => {
    if (searchValue !== searchValueRef.current) {
      pagination.onSearch(searchValue);
      searchValueRef.current = searchValue;
    }
  };
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserInput>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Add state for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add state for change password dialog
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(null);

  // Define a simpler type for the new user form data
  type NewUserFormData = {
    first_name: string;
    last_name: string;
    username: string;
    user_type_id: string;
    email: string;
    password: string;
    confirmPassword: string;
  };

  const [newUserData, setNewUserData] = useState<NewUserFormData>({
    first_name: "",
    last_name: "",
    username: "",
    user_type_id: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Fetch users and user types when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user types first
        await fetchUserTypes();
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    loadData();
  }, [fetchUserTypes]);

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

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteDialogOpen(true);
  };

  const handleChangePasswordClick = (user: any) => {
    // Only allow password change for users with auth_user_id
    if (!user.auth_user_id) {
      toast.error("Cannot change password: User is not linked to an authentication account");
      return;
    }
    setUserToChangePassword(user as User);
    setIsChangePasswordDialogOpen(true);
  };

  const handleChangePasswordClose = () => {
    setIsChangePasswordDialogOpen(false);
    setUserToChangePassword(null);
  };
  
  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteUser(userToDelete);
      toast.success("User deleted successfully");
      refreshUsers(); // Refresh the server-side users list
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
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
      refreshUsers(); // Refresh the server-side users list
    }
  };

  const handleSubmitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);

    // Clear any potentially conflicting localStorage data
    try {
      // Clear all user-related localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('user') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      console.log("Cleared localStorage user data before creating new user");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }

    try {
      // Password validation
      if (newUserData.password !== newUserData.confirmPassword) {
        toast.error("Passwords do not match");
        setIsCreatingUser(false);
        return;
      }

      // User type validation
      const selectedUserType = userTypes.find(
        (type) => type.$id === newUserData.user_type_id,
      );

      if (!selectedUserType) {
        toast.warning("Please select a valid user type");
        setIsCreatingUser(false);
        return;
      }

      // Step 1: Create auth user
      console.log("Preparing to create auth user with email:", newUserData.email);
      
      // Add a unique timestamp to email to test if it's an email conflict or something else
      const timestamp = Date.now();
      const testEmail = `${newUserData.email.split('@')[0]}_${timestamp}@${newUserData.email.split('@')[1]}`;
      console.log(`Using test email with timestamp: ${testEmail}`);
      
      try {
        // First try with the test email to diagnose if it's an email conflict or something else
        const authUser = await authService.createAccount(
          newUserData.email, // Use actual email after testing
          newUserData.password,
          `${newUserData.first_name} ${newUserData.last_name}`
        );

        if (!authUser || !authUser.$id) {
          throw new Error("Failed to create authentication account");
        }

        console.log("Auth user created with ID:", authUser.$id);

        // Step 2: Create database user linked to the auth user
        await addUser({
          first_name: newUserData.first_name,
          last_name: newUserData.last_name,
          username: newUserData.username,
          user_type_id: newUserData.user_type_id,
          auth_user_id: authUser.$id // Set the auth user ID from the newly created auth user
        });

        toast.success(`User created successfully and linked to new auth account: ${authUser.$id}`);
        
        setIsAddDialogOpen(false);
        setNewUserData({
          first_name: "",
          last_name: "",
          username: "",
          user_type_id: "",
          email: "",
          password: "",
          confirmPassword: ""
        });
        
        refreshUsers(); // Refresh the server-side users list
      } catch (error: any) {
        console.error("Failed to add user:", error);
        
        // Detailed error logging
        if (error.code && error.message) {
          console.error(`Appwrite error: Code ${error.code} - ${error.message}`);
          
          // Special handling for common errors
          if (error.code === 409 && error.type === "user_already_exists") {
            toast.error(
              <div>
                <p>User creation failed due to a conflict in Appwrite.</p>
                <p className="mt-2 font-bold">Try these steps:</p>
                <ol className="list-decimal pl-5 mt-1">
                  <li>Try a different email address</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Try using incognito/private browsing mode</li>
                  <li>Contact system administrator - this might be an Appwrite console issue</li>
                </ol>
              </div>,
              { duration: 8000 }
            );
          } else {
            toast.error(`Failed to add user: ${error.message} (Code: ${error.code})`);
          }
        } else {
          toast.error(`Failed to add user: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        
        // Log additional diagnostic info
        console.log("Browser info:", navigator.userAgent);
        console.log("LocalStorage keys:", Object.keys(localStorage).join(", "));
      }
    } catch (error) {
      console.error("Outer error during user creation:", error);
      toast.error(`Failed to add user: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreatingUser(false);
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

  // Update the renderEmptyState function and the main render return
  const renderEmptyState = () => (
    <div className="rounded-lg border-2 border-gray-300 bg-white shadow-sm p-2 text-center py-8 text-gray-700 font-medium">
      No users found. Add a new user to get started.
    </div>
  );

  // Define search fields
  const searchFields = [
    { id: "first_name", label: "First Name" },
    { id: "last_name", label: "Last Name" },
    { id: "username", label: "Username" },
  ];

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
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5 text-gray-900">User Management</h1>

      {/* Actions Row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 w-full max-w-lg">
          <div className="relative w-full">
            <Input
              placeholder="Search users..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full border-2 border-gray-300 focus:border-blue-600 text-gray-900"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
          {searchValue && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchValue('');
                // Reset the search
                pagination.onSearch('');
                searchValueRef.current = '';
              }}
              className="px-3 flex items-center gap-1 border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-100"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
          <Button 
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-700 text-white hover:bg-blue-800 font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>

        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1 bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 font-medium"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Server error display */}
      {serverError && (
        <div className="mb-6 bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded font-medium">
          <p className="font-medium">Error: {serverError.message}</p>
        </div>
      )}

      {/* Users table */}
      {serverUsers.length === 0 && !isLoading ? (
        renderEmptyState()
      ) : (
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
          <DataTable
            columns={getUsersColumns({
              onEdit: (item: any) => handleEditClick(item),
              onDelete: handleDeleteClick,
              onChangePassword: handleChangePasswordClick
            })}
            data={serverUsers as any}
            isLoading={isLoading}
            noSearchBar={true}
            pagination={{
              pageCount: pagination.pageCount,
              currentPage: pagination.currentPage,
              onPageChange: pagination.onPageChange,
              pageSize: pagination.pageSize,
              onPageSizeChange: pagination.onPageSizeChange,
              pageSizeOptions: pagination.pageSizeOptions,
              totalItems: pagination.totalItems,
              isLoading: isLoading
            }}
          />
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Edit User</DialogTitle>
            <DialogDescription className="text-gray-700">
              Make changes to the user information here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="first_name" className="text-sm font-medium block text-gray-800">
                  First Name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={editFormData.first_name || ""}
                  onChange={handleEditFormChange}
                  className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="last_name" className="text-sm font-medium block text-gray-800">
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={editFormData.last_name || ""}
                  onChange={handleEditFormChange}
                  className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium block text-gray-800">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={editFormData.username || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="user_type_id" className="text-sm font-medium block text-gray-800">
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
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm bg-white text-gray-900"
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

            {selectedUser?.auth_user_id && (
              <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-200 font-medium">
                This user is linked to authentication ID: {selectedUser.auth_user_id}
              </div>
            )}

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

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Add New User</DialogTitle>
            <DialogDescription className="text-gray-700">
              Fill out the form to create a new user account and system user record.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitNewUser} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium block text-gray-800">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={newUserData.email}
                onChange={handleNewUserFormChange}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                placeholder="user@example.com"
              />
              <p className="text-xs text-gray-700 mt-1">
                This email will be used for authentication login
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium block text-gray-800">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={newUserData.password}
                  onChange={handleNewUserFormChange}
                  required
                  minLength={8}
                  className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium block text-gray-800">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={newUserData.confirmPassword}
                  onChange={handleNewUserFormChange}
                  required
                  minLength={8}
                  className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="first_name" className="text-sm font-medium block text-gray-800">
                  First Name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={newUserData.first_name}
                  onChange={handleNewUserFormChange}
                  required
                  className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="last_name" className="text-sm font-medium block text-gray-800">
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={newUserData.last_name}
                  onChange={handleNewUserFormChange}
                  required
                  className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium block text-gray-800">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={newUserData.username}
                onChange={handleNewUserFormChange}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />
              <p className="text-xs text-gray-700 mt-1">
                Username for the user within the system
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="user_type_id" className="text-sm font-medium block text-gray-800">
                User Type
              </label>
              <select
                id="user_type_id"
                name="user_type_id"
                value={newUserData.user_type_id}
                onChange={handleNewUserFormChange}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm bg-white text-gray-900"
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

            <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-200 font-medium">
              <p className="font-medium">This will create:</p>
              <ol className="list-decimal ml-5 mt-1">
                <li>A new authentication user with the provided email/password</li>
                <li>A new system user record linked to that authentication account</li>
              </ol>
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className="rounded-md bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                disabled={isCreatingUser}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                disabled={isCreatingUser}
              >
                {isCreatingUser ? "Creating User..." : "Add User"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Delete User</DialogTitle>
            <DialogDescription className="text-gray-700">
              Are you sure you want to delete this user?
            </DialogDescription>
          </DialogHeader>
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

      {/* Change Password Dialog */}
      {userToChangePassword && (
        <ChangePasswordDialog
          isOpen={isChangePasswordDialogOpen}
          onClose={handleChangePasswordClose}
          userEmail={userToChangePassword.auth_user_id || ""}
          userName={`${userToChangePassword.first_name} ${userToChangePassword.last_name}`}
          authUserId={userToChangePassword.auth_user_id || ""}
        />
      )}
    </div>
  );
}

export default Users;
