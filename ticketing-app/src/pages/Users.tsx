import { useState } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useUsersStore, { User } from "@/stores/usersStore";

function Users() {
  const { users, updateUser, deleteUser, addUser } = useUsersStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [newUserData, setNewUserData] = useState<Omit<User, "id" | "lastModified">>({
    firstName: "",
    lastName: "",
    username: "",
    userType: "Support",
    totalTickets: 0,
  });

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      userType: user.userType,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUser(userId);
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNewUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUserData((prev) => ({
      ...prev,
      [name]: name === "totalTickets" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUser(selectedUser.id, editFormData);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleSubmitNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser(newUserData);
    setIsAddDialogOpen(false);
    setNewUserData({
      firstName: "",
      lastName: "",
      username: "",
      userType: "Support",
      totalTickets: 0,
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch (error) {
      return "Invalid date";
    }
  };

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
              <TableHead>Total Tickets</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.firstName}</TableCell>
                <TableCell>{user.lastName}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.userType}</TableCell>
                <TableCell>{user.totalTickets}</TableCell>
                <TableCell>{formatDate(user.lastModified)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditClick(user)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(user.id)}
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
                <label htmlFor="firstName" className="text-sm font-medium block">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={editFormData.firstName || ""}
                  onChange={handleEditFormChange}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="lastName" className="text-sm font-medium block">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={editFormData.lastName || ""}
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
              <label htmlFor="userType" className="text-sm font-medium block">
                User Type
              </label>
              <select
                id="userType"
                name="userType"
                value={editFormData.userType || ""}
                onChange={handleEditFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white"
              >
                <option value="Admin">Admin</option>
                <option value="Support">Support</option>
                <option value="Developer">Developer</option>
                <option value="Customer">Customer</option>
                <option value="Manager">Manager</option>
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
              >
                Save Changes
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
              Fill in the user information and click add to create a new user.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitNewUser} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="newFirstName" className="text-sm font-medium block">
                  First Name
                </label>
                <input
                  id="newFirstName"
                  name="firstName"
                  type="text"
                  value={newUserData.firstName}
                  onChange={handleNewUserFormChange}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="newLastName" className="text-sm font-medium block">
                  Last Name
                </label>
                <input
                  id="newLastName"
                  name="lastName"
                  type="text"
                  value={newUserData.lastName}
                  onChange={handleNewUserFormChange}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="newUsername" className="text-sm font-medium block">
                Username
              </label>
              <input
                id="newUsername"
                name="username"
                type="text"
                value={newUserData.username}
                onChange={handleNewUserFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="newUserType" className="text-sm font-medium block">
                User Type
              </label>
              <select
                id="newUserType"
                name="userType"
                value={newUserData.userType}
                onChange={handleNewUserFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm bg-white"
              >
                <option value="Admin">Admin</option>
                <option value="Support">Support</option>
                <option value="Developer">Developer</option>
                <option value="Customer">Customer</option>
                <option value="Manager">Manager</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="newTotalTickets" className="text-sm font-medium block">
                Total Tickets
              </label>
              <input
                id="newTotalTickets"
                name="totalTickets"
                type="number"
                min="0"
                value={newUserData.totalTickets}
                onChange={handleNewUserFormChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
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
              >
                Add User
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Users;
