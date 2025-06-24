import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { partsService, Part as ServicePart } from "@/services/partsService";
import { ticketsService } from "@/services/ticketsService";
import { toast } from "sonner";

interface Part {
  description: string;
  quantity?: string | number;
}

interface PartsWidgetProps {
  parts: Part[];
  ticketId?: string;
  isAdmin?: boolean;
  onPartsUpdate?: () => void; // Callback to refresh ticket data
  isPartsDialogOpen?: boolean;
  setIsPartsDialogOpen?: (open: boolean) => void;
}

export function PartsWidget({ parts, ticketId, isAdmin, onPartsUpdate, isPartsDialogOpen = false, setIsPartsDialogOpen }: PartsWidgetProps) {
  const [availableParts, setAvailableParts] = useState<ServicePart[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [partsSearchQuery, setPartsSearchQuery] = useState("");
  const [partsPage, setPartsPage] = useState(1);
  const [partsTotalPages, setPartsTotalPages] = useState(1);
  const [partsTotalItems, setPartsTotalItems] = useState(0);
  const [displayedParts, setDisplayedParts] = useState<ServicePart[]>([]);
  const partsSearchInputRef = useRef<HTMLInputElement>(null);
  const partsLimit = 20;

  // Load parts with pagination and search
  const loadParts = useCallback(async (page = 1, query = "") => {
    setIsLoadingParts(true);
    try {
      const result = await partsService.searchParts(
        query,
        "all",
        page,
        partsLimit
      );
      
      setDisplayedParts(result.parts);
      setPartsTotalItems(result.total);
      setPartsTotalPages(Math.ceil(result.total / partsLimit));
      setAvailableParts(prev => {
        const existingMap = new Map(prev.map(p => [p.$id, p]));
        result.parts.forEach(p => existingMap.set(p.$id, p));
        return Array.from(existingMap.values());
      });
    } catch (error) {
      console.error("Error loading parts:", error);
      setDisplayedParts([]);
    } finally {
      setIsLoadingParts(false);
    }
  }, []);

  // Handle part selection
  const handlePartSelection = (partId: string) => {
    setSelectedParts((prev) => {
      if (prev.includes(partId)) {
        return prev.filter((id) => id !== partId);
      }
      return [...prev, partId];
    });
  };

  // Handle adding parts to ticket
  const handleAddPartsToTicket = async () => {
    if (!ticketId || selectedParts.length === 0) return;

    try {
      // Get current ticket data
      const currentTicket = await ticketsService.getTicketWithRelationships(ticketId);
      const currentPartIds = currentTicket.part_ids || [];
      
      // Merge current parts with selected parts (avoid duplicates)
      const updatedPartIds = [...new Set([...currentPartIds, ...selectedParts])];
      
      // Update the ticket with new parts
      await ticketsService.updateTicket(ticketId, {
        part_ids: updatedPartIds
      });

      // Reset state
      setSelectedParts([]);
      setIsPartsDialogOpen?.(false);
      
      // Call refresh callback
      if (onPartsUpdate) {
        onPartsUpdate();
      }

      toast.success("Parts added successfully");
    } catch (error) {
      console.error("Error adding parts to ticket:", error);
      toast.error("Failed to add parts");
    }
  };

  // Reset pagination when search query changes
  useEffect(() => {
    setPartsPage(1);
  }, [partsSearchQuery]);

  // Load parts when page changes
  useEffect(() => {
    if (isPartsDialogOpen) {
      loadParts(partsPage, partsSearchQuery);
    }
  }, [partsPage, isPartsDialogOpen, partsSearchQuery, loadParts]);

  // Load parts when dialog first opens
  useEffect(() => {
    if (isPartsDialogOpen) {
      loadParts(1, "");
    }
  }, [isPartsDialogOpen, loadParts]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (isPartsDialogOpen && partsSearchInputRef.current) {
      setTimeout(() => {
        partsSearchInputRef.current?.focus();
      }, 100);
    }
  }, [isPartsDialogOpen]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= partsTotalPages && newPage !== partsPage) {
      setPartsPage(newPage);
    }
  };

  // Handle previous page
  const handlePreviousPage = () => {
    if (partsPage > 1) {
      setPartsPage(partsPage - 1);
    }
  };

  // Handle next page
  const handleNextPage = () => {
    if (partsPage < partsTotalPages) {
      setPartsPage(partsPage + 1);
    }
  };

  if (!parts || parts.length === 0) {
    return (
      <Card className="p-4 bg-gray-100 h-full">
        <div className="text-sm text-gray-500">No parts used</div>

        {/* Parts Selection Dialog */}
        <Dialog open={isPartsDialogOpen} onOpenChange={setIsPartsDialogOpen || (() => {})}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Parts to Ticket</DialogTitle>
              <DialogDescription>
                Search and select parts to add to this ticket.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={partsSearchInputRef}
                  placeholder="Search parts..."
                  className="pl-8"
                  value={partsSearchQuery}
                  onChange={(e) => setPartsSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      loadParts(1, partsSearchQuery);
                    }
                  }}
                />
              </div>
              <Button 
                onClick={() => loadParts(1, partsSearchQuery)}
                disabled={isLoadingParts}
              >
                Search
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto border rounded-md mb-4" style={{ maxHeight: "300px" }}>
              {isLoadingParts ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading...</span>
                </div>
              ) : displayedParts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No parts found</div>
              ) : (
                <div className="divide-y">
                  {displayedParts.map((part) => (
                    <div
                      key={part.$id}
                      className={`p-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                        selectedParts.includes(part.$id || "") ? 'bg-green-50' : ''
                      }`}
                      onClick={() => handlePartSelection(part.$id || "")}
                    >
                      <div className="flex items-center">
                        <Check
                          className={
                            selectedParts.includes(part.$id || "")
                              ? "mr-2 h-4 w-4"
                              : "mr-2 h-4 w-4 invisible"
                          }
                        />
                        <span>{part.description}</span>
                      </div>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {part.quantity} | ${part.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Pagination control */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {partsTotalItems > 0 ? (
                    <>
                      Showing page {partsPage} of {partsTotalPages}
                      <span className="mx-1">·</span>
                      {partsTotalItems} total
                    </>
                  ) : (
                    "No results"
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={partsPage <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(3, partsTotalPages) }, (_, i) => {
                    let pageToShow;
                    if (partsTotalPages <= 3) {
                      pageToShow = i + 1;
                    } else if (partsPage === 1) {
                      pageToShow = i + 1;
                    } else if (partsPage === partsTotalPages) {
                      pageToShow = partsTotalPages - 2 + i;
                    } else {
                      pageToShow = partsPage - 1 + i;
                    }
                    
                    return (
                      <Button
                        key={i}
                        variant={pageToShow === partsPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageToShow)}
                        className="h-8 w-8 p-0"
                      >
                        {pageToShow}
                      </Button>
                    );
                  })}
                  {partsTotalPages > 3 && partsPage < partsTotalPages - 1 && (
                    <span className="text-gray-500">...</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={partsPage >= partsTotalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPartsDialogOpen?.(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddPartsToTicket}
                disabled={selectedParts.length === 0}
                className="bg-green-500 text-white hover:bg-green-600"
              >
                Add {selectedParts.length} Part{selectedParts.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gray-100">
      {/* Compact list for multiple parts */}
      <div className="space-y-1">
        {parts.map((part, index) => {
          const description = typeof part === "object" && part !== null && part.description
            ? part.description
            : String(part);
          const quantity = typeof part === "object" && part !== null && part.quantity
            ? part.quantity
            : "";

          return (
            <div
              key={index}
              className="flex items-center justify-between py-1 text-sm"
            >
              <span className="text-gray-900 truncate">{description}</span>
              {quantity && (
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">({quantity})</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Parts Selection Dialog */}
      <Dialog open={isPartsDialogOpen} onOpenChange={setIsPartsDialogOpen || (() => {})}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Parts to Ticket</DialogTitle>
            <DialogDescription>
              Search and select parts to add to this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={partsSearchInputRef}
                placeholder="Search parts..."
                className="pl-8"
                value={partsSearchQuery}
                onChange={(e) => setPartsSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    loadParts(1, partsSearchQuery);
                  }
                }}
              />
            </div>
            <Button 
              onClick={() => loadParts(1, partsSearchQuery)}
              disabled={isLoadingParts}
            >
              Search
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto border rounded-md mb-4" style={{ maxHeight: "300px" }}>
            {isLoadingParts ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            ) : displayedParts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No parts found</div>
            ) : (
              <div className="divide-y">
                {displayedParts.map((part) => (
                  <div
                    key={part.$id}
                    className={`p-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                      selectedParts.includes(part.$id || "") ? 'bg-green-50' : ''
                    }`}
                    onClick={() => handlePartSelection(part.$id || "")}
                  >
                    <div className="flex items-center">
                      <Check
                        className={
                          selectedParts.includes(part.$id || "")
                            ? "mr-2 h-4 w-4"
                            : "mr-2 h-4 w-4 invisible"
                        }
                      />
                      <span>{part.description}</span>
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {part.quantity} | ${part.price}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Pagination control */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {partsTotalItems > 0 ? (
                  <>
                    Showing page {partsPage} of {partsTotalPages}
                    <span className="mx-1">·</span>
                    {partsTotalItems} total
                  </>
                ) : (
                  "No results"
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={partsPage <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(3, partsTotalPages) }, (_, i) => {
                  let pageToShow;
                  if (partsTotalPages <= 3) {
                    pageToShow = i + 1;
                  } else if (partsPage === 1) {
                    pageToShow = i + 1;
                  } else if (partsPage === partsTotalPages) {
                    pageToShow = partsTotalPages - 2 + i;
                  } else {
                    pageToShow = partsPage - 1 + i;
                  }
                  
                  return (
                    <Button
                      key={i}
                      variant={pageToShow === partsPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageToShow)}
                      className="h-8 w-8 p-0"
                    >
                      {pageToShow}
                    </Button>
                  );
                })}
                {partsTotalPages > 3 && partsPage < partsTotalPages - 1 && (
                  <span className="text-gray-500">...</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={partsPage >= partsTotalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPartsDialogOpen?.(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddPartsToTicket}
              disabled={selectedParts.length === 0}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              Add {selectedParts.length} Part{selectedParts.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 