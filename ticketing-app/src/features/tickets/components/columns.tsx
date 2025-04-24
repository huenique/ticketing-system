"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Calendar, FileText, Image, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Row } from "@/types/tickets";
import { storageService } from "@/services/storageService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { storage } from "@/lib/appwrite";

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

// File attachment component with info fetching
const FileAttachment = ({ fileId }: { fileId: string }) => {
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        setLoading(true);
        // Using the client SDK to get file info
        const info = await storage.getFile(
          import.meta.env.VITE_APPWRITE_BUCKET_ID,
          fileId
        );
        setFileInfo(info);
        setError(null);
      } catch (err) {
        console.error("Error fetching file info:", err);
        setError("Failed to load file info");
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, [fileId]);

  if (loading) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700">
        <Paperclip className="w-3 h-3 mr-1" />
        Loading...
      </span>
    );
  }

  if (error || !fileInfo) {
    return (
      <a
        href={storageService.getFileDownload(fileId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <FileText className="w-3 h-3 mr-1" />
        {fileId.substring(0, 6)}
      </a>
    );
  }

  const isImage = fileInfo.mimeType && fileInfo.mimeType.startsWith('image/');
  const fileName = fileInfo.name || `File-${fileId.substring(0, 6)}`;
  const fileSize = fileInfo.sizeOriginal 
    ? `${(fileInfo.sizeOriginal / 1024).toFixed(1)} KB` 
    : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={storageService.getFileDownload(fileId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            {isImage ? (
              <Image className="w-3 h-3 mr-1" />
            ) : (
              <FileText className="w-3 h-3 mr-1" />
            )}
            {fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName}
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fileName}</p>
          {fileSize && <p className="text-xs text-gray-500">{fileSize}</p>}
          {isImage && (
            <img 
              src={storageService.getFilePreview(fileId, 200, 200)} 
              alt={fileName}
              className="mt-2 max-w-[200px] max-h-[200px] rounded"
            />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      const attachments = row.original.cells["col-6"];
      if (!attachments) return "-";

      // Split attachments string into an array of file IDs
      const fileIds = attachments.split(", ");

      return (
        <div className="flex flex-wrap gap-2">
          {fileIds.map((fileId, index) => (
            <FileAttachment key={index} fileId={fileId} />
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "cells.col-7",
    header: "Status",
    cell: ({ row }) => {
      // Access status directly from cells object for reliability
      const status = row.original.cells["col-7"];

      if (!status) return "N/A";

      let bgColor = "";
      let textColor = "";

      switch (status) {
        case "New":
          bgColor = "bg-blue-100";
          textColor = "text-blue-800";
          break;
        case "Open":
          bgColor = "bg-indigo-100";
          textColor = "text-indigo-800";
          break;
        case "In Progress":
          bgColor = "bg-yellow-100";
          textColor = "text-yellow-800";
          break;
        case "Awaiting Parts":
          bgColor = "bg-orange-100";
          textColor = "text-orange-800";
          break;
        case "Awaiting Customer Response":
          bgColor = "bg-purple-100";
          textColor = "text-purple-800";
          break;
        case "Completed":
        case "Done":
          bgColor = "bg-green-100";
          textColor = "text-green-800";
          break;
        case "Declined":
          bgColor = "bg-red-100";
          textColor = "text-red-800";
          break;
        default:
          bgColor = "bg-gray-100";
          textColor = "text-gray-800";
      }

      return (
        <div
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
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
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{formatDate(date)}</span>
        </div>
      );
    },
  },
];
