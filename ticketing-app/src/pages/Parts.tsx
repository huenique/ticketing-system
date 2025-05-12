import { Edit, Plus, Trash2, Loader2 } from "lucide-react";
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
import usePartsStore from "@/stores/partsStore";
import type { Part, PartInput } from "@/stores/partsStore";
import { DataTable } from "@/components/ui/data-table";
import { getPartsColumns, PartActions } from "@/features/parts/components/parts-columns";

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
      await addPart(newPart);
      toast.success("Part added successfully");
      setNewPart({
        description: "",
        quantity: "",
        price: "",
        vendor: ""
      });
      setIsAddDialogOpen(false);
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
      await updatePart(selectedPart.$id, editPart);
      toast.success("Part updated successfully");
      setIsEditDialogOpen(false);
      setSelectedPart(null);
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
      await deletePart(partToDelete);
      toast.success("Part deleted successfully");
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
    <div className="rounded-lg border bg-white shadow-sm p-2 text-center py-8 text-neutral-500">
      No parts found. Add a new part to get started.
    </div>
  );

  if (loading && parts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading parts...</h2>
          <p className="text-neutral-500">Please wait while we fetch the data.</p>
        </div>
      </div>
    );
  }

  if (error && parts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">
            Error loading parts
          </h2>
          <p className="text-neutral-500 mb-4">{error.message}</p>
          <button
            onClick={() => fetchParts()}
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
          <h1 className="text-3xl font-bold">Parts</h1>
          <p className="text-neutral-500">
            Manage parts inventory for your service operations
          </p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          Add Part
        </button>
      </div>

      {parts.length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        <div>
          <DataTable
            columns={getPartsColumns({
              onEdit: (item) => handleEditClick(item as any),
              onDelete: handleDeleteClick,
            })}
            data={parts as any}
            isLoading={loading && parts.length === 0}
            searchPlaceholder="Search parts..."
            searchColumn="description"
            noResultsMessage="No parts found."
            pagination={{
              pageCount: totalPages,
              currentPage: page,
              onPageChange: handlePageChange,
              pageSize: limit,
              onPageSizeChange: handleLimitChange,
              pageSizeOptions: [10, 20, 50, 100],
              totalItems: totalParts
            }}
          />
          {loading && parts.length > 0 && (
            <div className="flex justify-center my-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          )}
        </div>
      )}

      {/* Add Part Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Add New Part</DialogTitle>
            <DialogDescription>
              Create a new part in the inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPart} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium block">
                Description
              </label>
              <input
                id="description"
                name="description"
                type="text"
                value={newPart.description}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                placeholder="Part description"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium block">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="text"
                value={newPart.quantity}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                placeholder="Available quantity"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium block">
                Price
              </label>
              <input
                id="price"
                name="price"
                type="text"
                value={newPart.price}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                placeholder="Unit price"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="vendor" className="text-sm font-medium block">
                Vendor
              </label>
              <input
                id="vendor"
                name="vendor"
                type="text"
                value={newPart.vendor}
                onChange={(e) => handleInputChange(e)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                placeholder="Supplier/vendor name"
              />
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
                {isSubmitting ? "Adding..." : "Add Part"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Part Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white p-6 rounded-lg border shadow-md max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Edit Part</DialogTitle>
            <DialogDescription>
              Update the part information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePart} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium block">
                Description
              </label>
              <input
                id="edit-description"
                name="description"
                type="text"
                value={editPart.description}
                onChange={(e) => handleInputChange(e, true)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-quantity" className="text-sm font-medium block">
                Quantity
              </label>
              <input
                id="edit-quantity"
                name="quantity"
                type="text"
                value={editPart.quantity}
                onChange={(e) => handleInputChange(e, true)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-price" className="text-sm font-medium block">
                Price
              </label>
              <input
                id="edit-price"
                name="price"
                type="text"
                value={editPart.price}
                onChange={(e) => handleInputChange(e, true)}
                required
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-vendor" className="text-sm font-medium block">
                Vendor
              </label>
              <input
                id="edit-vendor"
                name="vendor"
                type="text"
                value={editPart.vendor}
                onChange={(e) => handleInputChange(e, true)}
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
                {isSubmitting ? "Updating..." : "Update Part"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Part Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Part</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this part? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
            <p>Warning: Deleting a part will permanently remove it from inventory.</p>
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

export default Parts; 