import { Plus, Loader2, X } from "lucide-react";
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
import usePartsStore from "@/stores/partsStore";
import type { Part, PartInput } from "@/stores/partsStore";
import { DataTable } from "@/components/ui/data-table";
import { getPartsColumns } from "@/features/parts/components/parts-columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Import server paginated parts hook
import { useServerPaginatedParts } from "@/hooks/useServerPaginatedParts";

function Parts() {
  const { 
    parts, 
    loading, 
    error, 
    fetchParts, 
    addPart, 
    updatePart, 
    deletePart,
    page,
    limit,
    totalParts,
    totalPages,
    setPage,
    setLimit
  } = usePartsStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [newPart, setNewPart] = useState<PartInput>({
    description: "",
    quantity: "",
    price: "",
    vendor: ""
  });
  
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [editPart, setEditPart] = useState<PartInput>({
    description: "",
    quantity: "",
    price: "",
    vendor: ""
  });
  
  const [partToDelete, setPartToDelete] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for search
  const [searchValue, setSearchValue] = useState("");
  const searchValueRef = useRef(searchValue);

  // Use server paginated parts hook
  const {
    parts: serverParts,
    isLoading,
    error: serverError,
    pagination,
    searchTerm,
    refreshParts
  } = useServerPaginatedParts({
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

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
  };

  // Fetch parts when component mounts
  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.description.trim()) {
      toast.error("Part description cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      // Using the original parts store to add a new part
      const { addPart } = usePartsStore.getState();
      await addPart(newPart);
      toast.success("Part added successfully");
      setNewPart({
        description: "",
        quantity: "",
        price: "",
        vendor: ""
      });
      setIsAddDialogOpen(false);
      
      // Refresh parts using the server paginated hook
      refreshParts();
    } catch (error) {
      console.error("Error adding part:", error);
      toast.error(`Failed to add part: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (part: Part) => {
    setSelectedPart(part);
    setEditPart({
      description: part.description,
      quantity: part.quantity,
      price: part.price,
      vendor: part.vendor
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !editPart.description.trim()) {
      toast.error("Part description cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      // Using the original parts store to update a part
      const { updatePart } = usePartsStore.getState();
      await updatePart(selectedPart.$id, editPart);
      toast.success("Part updated successfully");
      setIsEditDialogOpen(false);
      setSelectedPart(null);
      
      // Refresh parts using the server paginated hook
      refreshParts();
    } catch (error) {
      console.error("Error updating part:", error);
      toast.error(`Failed to update part: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (partId: string) => {
    setPartToDelete(partId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!partToDelete) return;
    
    setIsDeleting(true);
    try {
      // Using the original parts store to delete a part
      const { deletePart } = usePartsStore.getState();
      await deletePart(partToDelete);
      toast.success("Part deleted successfully");
      
      // Refresh parts using the server paginated hook
      refreshParts();
    } catch (error) {
      console.error("Error deleting part:", error);
      toast.error(`Failed to delete part: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setPartToDelete(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const { name, value } = e.target;
    if (isEdit) {
      setEditPart(prev => ({ ...prev, [name]: value }));
    } else {
      setNewPart(prev => ({ ...prev, [name]: value }));
    }
  };

  const renderEmptyState = () => (
    <div className="rounded-lg border-2 border-gray-300 bg-white shadow-sm p-2 text-center py-8 text-gray-700 font-medium">
      No parts found. Add a new part to get started.
    </div>
  );

  if (isLoading && serverParts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Loading parts...</h2>
          <p className="text-gray-700">Please wait while we fetch the data.</p>
        </div>
      </div>
    );
  }

  if (serverError && serverParts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-700">
            Error loading parts
          </h2>
          <p className="text-gray-700 mb-4">{serverError.message}</p>
          <button
            onClick={() => refreshParts()}
            className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts</h1>
          <p className="text-gray-700">
            Manage parts inventory for your service operations
          </p>
        </div>
      </div>

      {/* Search and Add Part Button Row */}
      <div className="flex justify-between mb-4">
        <div className="flex gap-2 w-full max-w-lg">
          <div className="relative w-full">
            <Input
              placeholder="Search parts..."
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
          className="flex items-center gap-1 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          <Plus size={16} />
          <span>Add Part</span>
        </button>
      </div>

      {serverParts.length === 0 && !isLoading ? (
        renderEmptyState()
      ) : (
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
          <DataTable
            columns={getPartsColumns({
              onEdit: (item) => handleEditClick(item as any),
              onDelete: handleDeleteClick,
            })}
            data={serverParts as any}
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

      {/* Add Part Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Add New Part</DialogTitle>
            <DialogDescription className="text-gray-700">
              Create a new part in the inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPart} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium block text-gray-800">
                Description
              </label>
              <input
                id="description"
                name="description"
                type="text"
                value={newPart.description}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                placeholder="Part description"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium block text-gray-800">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="text"
                value={newPart.quantity}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                placeholder="Available quantity"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium block text-gray-800">
                Price
              </label>
              <input
                id="price"
                name="price"
                type="text"
                value={newPart.price}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                placeholder="Unit price"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="vendor" className="text-sm font-medium block text-gray-800">
                Vendor
              </label>
              <input
                id="vendor"
                name="vendor"
                type="text"
                value={newPart.vendor}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
                placeholder="Supplier/vendor name"
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(false)}
                className="rounded-md bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Part"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Edit Part</DialogTitle>
            <DialogDescription className="text-gray-700">
              Update the part information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePart} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium block text-gray-800">
                Description
              </label>
              <input
                id="edit-description"
                name="description"
                type="text"
                value={editPart.description}
                onChange={(e) => handleInputChange(e, true)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-quantity" className="text-sm font-medium block text-gray-800">
                Quantity
              </label>
              <input
                id="edit-quantity"
                name="quantity"
                type="text"
                value={editPart.quantity}
                onChange={(e) => handleInputChange(e, true)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-price" className="text-sm font-medium block text-gray-800">
                Price
              </label>
              <input
                id="edit-price"
                name="price"
                type="text"
                value={editPart.price}
                onChange={(e) => handleInputChange(e, true)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-vendor" className="text-sm font-medium block text-gray-800">
                Vendor
              </label>
              <input
                id="edit-vendor"
                name="vendor"
                type="text"
                value={editPart.vendor}
                onChange={(e) => handleInputChange(e, true)}
                required
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-md bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Part"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Part Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Delete Part</DialogTitle>
            <DialogDescription className="text-gray-700">
              Are you sure you want to delete this part? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm border border-yellow-200 font-medium">
            <p>Warning: Deleting a part will permanently remove it from inventory.</p>
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

export default Parts; 