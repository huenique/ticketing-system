"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Calendar, FileText, Image, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { storage } from "@/lib/appwrite";
import { storageService } from "@/services/storageService";
import { Row } from "@/types/tickets";

// Helper function to format dates
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Invalid date format:", dateStr, error);

    return dateStr;
  }
};

// Helper function to get a better display name for attachments
const getAttachmentDisplayName = (fileId: string) => {
  // If fileId contains a file name or type pattern, extract it
  // Otherwise, display a generic file name with the ID
  if (fileId.includes("_") && fileId.length > 10) {
    // Some file IDs might contain original filename information
    const parts = fileId.split("_");
    if (parts.length > 1) {
      return parts[parts.length - 1]; // Get the last part
    }
  }

  // Default to a formatted ID
  return `File-${fileId.substring(0, 6)}`;
};

// File attachment component with info fetching
const FileAttachment = ({
  fileId,
  fileName,
}: {
  fileId: string;
  fileName: string | null;
}) => {
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to fetch the file info to get the actual file name
  useEffect(() => {
    let isMounted = true;
    const fetchFileInfo = async () => {
      try {
        setIsLoading(true);
        const info = await storageService.getFileInfo(fileId);

        if (isMounted && info) {
          setFileInfo(info);
        }
      } catch (err) {
        console.log("Could not fetch file info:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFileInfo();
    return () => {
      isMounted = false;
    };
  }, [fileId]);

  // Determine what name to display
  let displayName = "Loading...";

  if (!isLoading) {
    if (fileInfo && fileInfo.name) {
      // Use the real file name from metadata if available
      displayName = fileInfo.name;
    } else if (fileName) {
      // Use the provided fileName if available
      displayName = fileName;
    } else {
      // Fall back to generated name
      displayName = getAttachmentDisplayName(fileId);
    }
  }

  return (
    <a
      href={storageService.getFileView(fileId)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      title={`Open attachment: ${fileId}`}
    >
      {fileInfo && fileInfo.mimeType && fileInfo.mimeType.startsWith("image/") ? (
        <Image className="w-3 h-3 mr-1" />
      ) : (
        <FileText className="w-3 h-3 mr-1" />
      )}
      {displayName}
    </a>
  );
};

export const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "cells.col-1",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Ticket ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "cells.col-2",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      // Access the date directly from cells object to avoid accessor issues
      const date = row.original.cells["col-2"];
      if (!date) return "";
      return formatDate(date);
    },
  },
  {
    accessorKey: "cells.col-3",
    header: "Customer Name",
    cell: ({ row }) => {
      const customerName = row.original.cells["col-3"];
      
      // Access the raw customer data from the rawData property
      const rawData = row.original.rawData || {};
      const customer = rawData.customer || rawData.customer_id || {};
      
      const primaryContactName = customer?.primary_contact_name || "N/A";
      const primaryContactNumber = customer?.primary_contact_number || "N/A";
      const primaryEmail = customer?.primary_email || "N/A";
      
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{customerName}</span>
            </TooltipTrigger>
            <TooltipContent className="p-3 max-w-sm bg-white text-black">
              <div className="space-y-1">
                <p><strong>Contact:</strong> {primaryContactName}</p>
                <p><strong>Phone:</strong> {primaryContactNumber}</p>
                <p><strong>Email:</strong> {primaryEmail}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "cells.col-4",
    header: "Work Description",
  },
  {
    accessorKey: "cells.col-5",
    header: "Assign To",
  },
  {
    accessorKey: "cells.col-6",
    header: "Parts Used",
    cell: ({ row }) => {
      const parts = row.original.cells["col-6"];
      if (!parts) return "-";

      // If we have raw data, try to get part descriptions from it
      const rawTicket = row.original.rawData;
      if (rawTicket && rawTicket.part_ids && Array.isArray(rawTicket.part_ids)) {
        return (
          <div className="flex flex-wrap gap-2">
            {rawTicket.part_ids.map((part: any, index: number) => {
              let description = "";
              // Check if it's an object with description
              if (typeof part === "object" && part !== null && part.description) {
                description = `${part.description}${part.quantity ? ` (${part.quantity})` : ""}`;
              } else {
                // Otherwise just show the ID or string representation
                description = String(typeof part === "object" ? part.$id || part.id || "Unknown Part" : part);
              }
              
              return (
                <div key={index} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-chart-4/20 text-chart-4">
                  {description}
                </div>
              );
            })}
          </div>
        );
      }

      // If no parts are found, just return a dash
      return "-";
    },
  },
  {
    id: "cells.col-7",
    accessorFn: (row) => row.cells["col-7"],
    header: "Status",
    cell: ({ row }) => {
      // Access status directly from cells object for reliability
      const status = row.original.cells["col-7"];

      if (!status) return "N/A";

      let statusClass = "";

      switch (status) {
        case "New":
          statusClass = "bg-indigo-500/20 text-indigo-500";
          break;
        case "Open":
          statusClass = "bg-blue-500/20 text-blue-500";
          break;
        case "In Progress":
          statusClass = "bg-orange-500/20 text-orange-500";
          break;
        case "Awaiting for Parts":
          statusClass = "bg-amber-500/20 text-amber-500";
          break;
        case "Awaiting Customer Response":
          statusClass = "bg-yellow-500/20 text-yellow-500";
          break;
        case "Completed":
        case "Done":
          statusClass = "bg-green-500/20 text-green-500";
          break;
        case "Declined":
          statusClass = "bg-primary/20 text-primary";
          break;
        default:
          statusClass = "bg-muted/20 text-muted-foreground";
      }

      return (
        <div
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
        >
          {status}
        </div>
      );
    },
  },
  {
    accessorKey: "cells.col-8",
    header: "Total Hours",
    cell: ({ row }) => {
      // Return the hours as-is without date formatting
      return row.original.cells["col-8"] || "0";
    },
  },
  {
    accessorKey: "cells.col-9",
    header: "Billable Hours",
    cell: ({ row }) => {
      // Return the hours as-is without date formatting
      return row.original.cells["col-9"] || "0";
    },
  },
  {
    accessorKey: "cells.col-10",
    header: "Last Modified",
    cell: ({ row }) => {
      const date = row.original.cells["col-10"];
      if (!date) return "";
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDate(date)}</span>
        </div>
      );
    },
  },
];
