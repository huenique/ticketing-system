import { Loader2, UserPlus, X } from "lucide-react";
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
    primary_contact_name: "",
    primary_contact_number: "",
    primary_email: "",
    abn: "",
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
    refresh
  } = useServerPaginatedCustomers({
    initialPage: 1,
    pageSize: 10,
    initialSearchTerm: "",
    initialSearchField: "all"
  });

  // Handle adding a new customer
  const handleAddCustomer = async () => {
    try {
      // Validation
      if (!newCustomer.name || !newCustomer.primary_contact_name || !newCustomer.primary_email) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Add customer
      await customersService.createCustomer({
        name: newCustomer.name,
        address: newCustomer.address,
        primary_contact_name: newCustomer.primary_contact_name,
        primary_contact_number: newCustomer.primary_contact_number,
        primary_email: newCustomer.primary_email,
        abn: newCustomer.abn,
      });

      // Reset form and close dialog
      setNewCustomer({
        name: "",
        address: "",
        primary_contact_name: "",
        primary_contact_number: "",
        primary_email: "",
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

  // Handle customer actions (edit and delete)
  const customerActions: CustomerActions = {
    onEdit: (customer: CustomerType) => {
      // Navigate or open edit dialog
      console.log("Edit customer:", customer);
    },
    onDelete: (itemId: string) => {
      try {
        // Delete customer using the ID directly
        customersService.deleteCustomer(itemId)
          .then(() => {
            // Refresh customers after successful deletion
            refresh();
            // Show success message
            toast.success("Customer deleted successfully");
          })
          .catch((error) => {
            console.error("Error deleting customer:", error);
            toast.error("Failed to delete customer");
          });
      } catch (error) {
        console.error("Error deleting customer:", error);
        toast.error("Failed to delete customer");
      }
    },
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
      <h1 className="text-2xl font-bold mb-6">Customers</h1>

      {error && (
        <div className="border border-red-200 rounded bg-red-50 p-4 mb-4 text-red-500">
          <p className="font-semibold">Error: {error.message}</p>
          {error.message.includes("search requires") && (
            <>
              <p className="mt-2 text-sm">
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
              className="w-full"
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
              className="px-3 flex items-center gap-1 border border-gray-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
          <Button 
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
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
        <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Data Table */}
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
          onPageSizeChange: () => {}, // Not used in this implementation
          pageSizeOptions: [10, 20, 50], // Default options
          isLoading: isLoading,
          onSearch: updateSearch
        }}
        isLoading={isLoading}
      />

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>
              Enter the customer details below to add a new customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Name*
              </label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="address" className="text-right">
                Address
              </label>
              <Textarea
                id="address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="contact_name" className="text-right">
                Contact Name*
              </label>
              <Input
                id="contact_name"
                value={newCustomer.primary_contact_name}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    primary_contact_name: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="contact_number" className="text-right">
                Contact Number
              </label>
              <Input
                id="contact_number"
                value={newCustomer.primary_contact_number}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    primary_contact_number: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right">
                Email*
              </label>
              <Input
                id="email"
                type="email"
                value={newCustomer.primary_email}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    primary_email: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="abn" className="text-right">
                ABN
              </label>
              <Input
                id="abn"
                value={newCustomer.abn}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, abn: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleAddCustomer}
            >
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
