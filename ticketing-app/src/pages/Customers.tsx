import { Loader2, UserPlus, X, Edit, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIndexCheck } from "@/components/SearchIndexCheck";

// Import server paginated customers hook
import { useServerPaginatedCustomers } from "@/hooks/useServerPaginatedCustomers";
// Import customer service for adding, updating, and deleting customers
import { customersService } from "@/services/customersService";
// Import customer columns for the data table
import { getCustomersColumns, CustomerType, CustomerActions } from "@/features/customers/components/customers-columns";
// Import DataTable component
import { DataTable } from "@/components/ui/data-table/data-table";
// Import CustomerContact type
import { CustomerContact } from "@/types/common";
// Import ColumnDef type
import { ColumnDef } from "@tanstack/react-table";

// Custom prop to create a DataTable without the search bar
const CustomDataTable = (props: any) => {
  // The isLoading is set to true to prevent rendering the search bar
  // The actual loading state is handled by the pagination property
  return <DataTable {...props} />
};

export default function Customers() {
  // State for add customer dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    address: "",
    abn: "",
  });

  // State for edit customer dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState({
    id: "",
    name: "",
    address: "",
    abn: "",
  });

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for contacts dialog
  const [isContactsDialogOpen, setIsContactsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // State for add/edit contact dialog
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    position: "",
    contact_number: "",
    email: "",
  });

  // State for search
  const [searchValue, setSearchValue] = useState("");
  const searchValueRef = useRef(searchValue);
  // Always use "all" for searching all fields and remove the dropdown
  const selectedSearchField = "all";

  // Use server paginated customers hook
  const {
    customers,
    isLoading,
    error,
    pagination,
    searchTerm,
    searchField,
    searchFields,
    goToPage,
    updateSearch,
    changePageSize,
    refresh
  } = useServerPaginatedCustomers({
    initialPage: 1,
    pageSize: 10,
    initialSearchTerm: "",
    initialSearchField: "all"
  });

  // Add handler for page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    changePageSize(newPageSize);
  };

  // Handle adding a new customer
  const handleAddCustomer = async () => {
    try {
      // Validation
      if (!newCustomer.name || !newCustomer.abn) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Add customer
      await customersService.createCustomer({
        name: newCustomer.name,
        address: newCustomer.address,
        abn: newCustomer.abn,
      });

      // Reset form and close dialog
      setNewCustomer({
        name: "",
        address: "",
        abn: "",
      });
      setIsAddDialogOpen(false);
      
      // Refresh customers
      refresh();
      
      // Show success message
      toast.success("Customer added successfully");
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer");
    }
  };

  // Function to fetch contacts for a customer
  const fetchCustomerContacts = async (customerId: string) => {
    if (!customerId) return;
    
    try {
      setIsLoadingContacts(true);
      const contacts = await customersService.getCustomerContacts(customerId);
      // Map Appwrite CustomerContact to common CustomerContact type
      const mappedContacts = contacts.map(contact => ({
        id: contact.$id,
        customer_ids: [customerId],
        first_name: contact.first_name,
        last_name: contact.last_name,
        position: contact.position || "",
        contact_number: contact.contact_number,
        email: contact.email,
        createdAt: contact.$createdAt || new Date().toISOString(),
        updatedAt: contact.$updatedAt || new Date().toISOString(),
      }));
      setCustomerContacts(mappedContacts);
    } catch (error) {
      console.error("Error fetching customer contacts:", error);
      setCustomerContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Handle adding a new contact
  const handleAddContact = async () => {
    if (!selectedCustomer) return;

    try {
      // Extract customer ID
      const appwriteCustomer = selectedCustomer as Partial<{ $id: string }>;
      const commonCustomer = selectedCustomer as Partial<{ id: string }>;
      const customerId = appwriteCustomer.$id || commonCustomer.id || "";

      // Validation
      if (!newContact.first_name || !newContact.last_name || !newContact.contact_number || !newContact.email) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Add contact
      await customersService.createCustomerContact({
        customer_ids: [customerId],
        first_name: newContact.first_name,
        last_name: newContact.last_name,
        position: newContact.position,
        contact_number: newContact.contact_number,
        email: newContact.email,
      });

      // Reset form and close dialog
      setNewContact({
        first_name: "",
        last_name: "",
        position: "",
        contact_number: "",
        email: "",
      });
      setIsContactDialogOpen(false);
      
      // Refresh contacts
      fetchCustomerContacts(customerId);
      
      // Show success message
      toast.success("Contact added successfully");
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
    }
  };

  // Handle updating a contact
  const handleUpdateContact = async () => {
    if (!editingContact || !selectedCustomer) return;

    try {
      // Extract customer ID
      const appwriteCustomer = selectedCustomer as Partial<{ $id: string }>;
      const commonCustomer = selectedCustomer as Partial<{ id: string }>;
      const customerId = appwriteCustomer.$id || commonCustomer.id || "";

      // Validation
      if (!editingContact.first_name || !editingContact.last_name || !editingContact.contact_number || !editingContact.email) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Update contact
      await customersService.updateCustomerContact(editingContact.id, {
        first_name: editingContact.first_name,
        last_name: editingContact.last_name,
        position: editingContact.position,
        contact_number: editingContact.contact_number,
        email: editingContact.email,
      });

      // Close dialog
      setIsContactDialogOpen(false);
      
      // Refresh contacts
      fetchCustomerContacts(customerId);
      
      // Show success message
      toast.success("Contact updated successfully");
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    }
  };

  // Handle deleting a contact
  const handleDeleteContact = async (contactId: string) => {
    if (!selectedCustomer) return;

    try {
      // Extract customer ID
      const appwriteCustomer = selectedCustomer as Partial<{ $id: string }>;
      const commonCustomer = selectedCustomer as Partial<{ id: string }>;
      const customerId = appwriteCustomer.$id || commonCustomer.id || "";

      // Delete contact
      await customersService.deleteCustomerContact(contactId);
      
      // Refresh contacts
      fetchCustomerContacts(customerId);
      
      // Show success message
      toast.success("Contact deleted successfully");
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    }
  };

  // Get columns for the contacts table
  const getContactColumns = (): ColumnDef<CustomerContact>[] => [
    {
      accessorKey: "first_name",
      header: "First Name",
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
    },
    {
      accessorKey: "position",
      header: "Position",
    },
    {
      accessorKey: "contact_number",
      header: "Phone",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: CustomerContact } }) => {
        const contact = row.original;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setEditingContact(contact);
                setIsContactDialogOpen(true);
              }}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Edit Contact"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleDeleteContact(contact.id)}
              className="p-1 text-red-600 hover:text-red-800"
              title="Delete Contact"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  // Handle customer actions (edit and delete)
  const customerActions: CustomerActions = {
    onEdit: (customer: CustomerType) => {
      // Set the editing customer data and open the edit dialog
      // Use type assertion to safely access properties that might exist in either type
      const appwriteCustomer = customer as Partial<{ $id: string }>;
      const commonCustomer = customer as Partial<{ id: string }>;
      
      const customerId = appwriteCustomer.$id || commonCustomer.id || "";
      setEditingCustomer({
        id: customerId,
        name: customer.name || "",
        address: customer.address || "",
        abn: customer.abn || "",
      });
      setIsEditDialogOpen(true);
    },
    onDelete: (itemId: string) => {
      setCustomerToDelete(itemId);
      setIsDeleteDialogOpen(true);
    },
    onViewContacts: (customer: CustomerType) => {
      setSelectedCustomer(customer);
      setIsContactsDialogOpen(true);
      // Extract customer ID using the same logic as onEdit
      const appwriteCustomer = customer as Partial<{ $id: string }>;
      const commonCustomer = customer as Partial<{ id: string }>;
      const customerId = appwriteCustomer.$id || commonCustomer.id || "";
      fetchCustomerContacts(customerId);
    },
  };

  // Handle customer deletion
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    setIsDeleting(true);
    try {
      await customersService.deleteCustomer(customerToDelete);
      // Refresh customers after successful deletion
      refresh();
      // Show success message
      toast.success("Customer deleted successfully");
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  // Handle updating a customer
  const handleUpdateCustomer = async () => {
    try {
      // Validation
      if (!editingCustomer.name) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Update customer
      await customersService.updateCustomer(editingCustomer.id, {
        name: editingCustomer.name,
        address: editingCustomer.address,
        abn: editingCustomer.abn,
      });

      // Close dialog
      setIsEditDialogOpen(false);
      
      // Refresh customers
      refresh();
      
      // Show success message
      toast.success("Customer updated successfully");
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer");
    }
  };

  // Get columns for the data table
  const columns = getCustomersColumns(customerActions);

  // Handle search
  const handleSearch = () => {
    if (searchValue !== searchValueRef.current) {
      updateSearch(searchValue, "all");
      searchValueRef.current = searchValue;
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Customers</h1>

      {error && (
        <div className="border-2 border-red-400 rounded bg-red-50 p-4 mb-4 text-red-700 font-medium">
          <p className="font-semibold">Error: {error.message}</p>
          {error.message.includes("search requires") && (
            <>
              <p className="mt-2 text-sm text-red-700">
                Note: For optimal search performance, create a fulltext index on the name field in your Appwrite database. 
                Currently using a fallback method with limited results.
              </p>
              
              {/* Add SearchIndexCheck component */}
              <div className="mt-4">
                <SearchIndexCheck collectionId="customers" searchField={searchField} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Search and Add Customer Button Row */}
      <div className="flex justify-between mb-4">
        <div className="flex gap-2 w-full max-w-lg">
          <div className="w-full">
            <Input
              placeholder="Search customers..."
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
                updateSearch('', "all");
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
            className="bg-blue-700 text-white hover:bg-blue-800 font-medium border-0"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>
        <Button className="bg-green-700 text-white hover:bg-green-800 font-medium" onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Data Table */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={customers}
          noSearchBar={true}
          pagination={{
            pageCount: pagination.totalPages,
            pageSize: pagination.pageSize,
            currentPage: pagination.currentPage,
            totalItems: pagination.totalItems,
            onPageChange: goToPage,
            onPageSizeChange: handlePageSizeChange,
            pageSizeOptions: [10, 20, 50],
            isLoading: isLoading,
            onSearch: updateSearch
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 font-bold">Add Customer</DialogTitle>
            <DialogDescription className="text-gray-700">
              Enter the customer details below to add a new customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right font-medium text-gray-800">
                Name*
              </label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="address" className="text-right font-medium text-gray-800">
                Address
              </label>
              <Textarea
                id="address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="abn" className="text-right font-medium text-gray-800">
                ABN
              </label>
              <Input
                id="abn"
                value={newCustomer.abn}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, abn: e.target.value })
                }
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleAddCustomer}
              className="bg-green-700 text-white hover:bg-green-800 font-medium"
            >
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 font-bold">Edit Customer</DialogTitle>
            <DialogDescription className="text-gray-700">
              Enter the customer details below to update the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right font-medium text-gray-800">
                Name*
              </label>
              <Input
                id="name"
                value={editingCustomer.name}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, name: e.target.value })
                }
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="address" className="text-right font-medium text-gray-800">
                Address
              </label>
              <Textarea
                id="address"
                value={editingCustomer.address}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, address: e.target.value })
                }
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="abn" className="text-right font-medium text-gray-800">
                ABN
              </label>
              <Input
                id="abn"
                value={editingCustomer.abn}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, abn: e.target.value })
                }
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleUpdateCustomer}
              className="bg-green-700 text-white hover:bg-green-800 font-medium"
            >
              Update Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Delete Customer</DialogTitle>
            <DialogDescription className="text-gray-700">
              Are you sure you want to delete this customer? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm border border-yellow-200 font-medium">
            <p>Warning: Deleting a customer will permanently remove them and all associated contacts.</p>
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
              onClick={handleDeleteCustomer}
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

      {/* Contacts Dialog */}
      <Dialog open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 font-bold">
              {selectedCustomer?.name} - Contacts
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              View and manage customer contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="flex justify-end mb-4">
              <Button
                className="bg-green-700 text-white hover:bg-green-800 font-medium"
                onClick={() => {
                  setEditingContact(null);
                  setIsContactDialogOpen(true);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
            {isLoadingContacts ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">Loading contacts...</span>
              </div>
            ) : customerContacts.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No contacts found for this customer.
              </div>
            ) : (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <DataTable
                  columns={getContactColumns()}
                  data={customerContacts}
                  noSearchBar={true}
                  isLoading={isLoadingContacts}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsContactsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 font-bold">
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              {editingContact ? "Update the contact details below." : "Enter the contact details below to add a new contact."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="first_name" className="text-right font-medium text-gray-800">
                First Name*
              </label>
              <Input
                id="first_name"
                value={editingContact?.first_name || newContact.first_name}
                onChange={(e) => {
                  if (editingContact) {
                    setEditingContact({ ...editingContact, first_name: e.target.value });
                  } else {
                    setNewContact({ ...newContact, first_name: e.target.value });
                  }
                }}
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="last_name" className="text-right font-medium text-gray-800">
                Last Name*
              </label>
              <Input
                id="last_name"
                value={editingContact?.last_name || newContact.last_name}
                onChange={(e) => {
                  if (editingContact) {
                    setEditingContact({ ...editingContact, last_name: e.target.value });
                  } else {
                    setNewContact({ ...newContact, last_name: e.target.value });
                  }
                }}
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="position" className="text-right font-medium text-gray-800">
                Position
              </label>
              <Input
                id="position"
                value={editingContact?.position || newContact.position}
                onChange={(e) => {
                  if (editingContact) {
                    setEditingContact({ ...editingContact, position: e.target.value });
                  } else {
                    setNewContact({ ...newContact, position: e.target.value });
                  }
                }}
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="contact_number" className="text-right font-medium text-gray-800">
                Phone*
              </label>
              <Input
                id="contact_number"
                value={editingContact?.contact_number || newContact.contact_number}
                onChange={(e) => {
                  if (editingContact) {
                    setEditingContact({ ...editingContact, contact_number: e.target.value });
                  } else {
                    setNewContact({ ...newContact, contact_number: e.target.value });
                  }
                }}
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right font-medium text-gray-800">
                Email*
              </label>
              <Input
                id="email"
                value={editingContact?.email || newContact.email}
                onChange={(e) => {
                  if (editingContact) {
                    setEditingContact({ ...editingContact, email: e.target.value });
                  } else {
                    setNewContact({ ...newContact, email: e.target.value });
                  }
                }}
                className="col-span-3 border-2 border-gray-300 focus:border-blue-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={editingContact ? handleUpdateContact : handleAddContact}
              className="bg-green-700 text-white hover:bg-green-800 font-medium"
            >
              {editingContact ? "Update Contact" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
