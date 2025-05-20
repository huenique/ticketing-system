import { useState } from "react";
import { useServerPaginatedTickets } from "@/hooks/useServerPaginatedTickets";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "@/features/tickets/components/columns";
import { convertTicketToRow } from "@/utils/ticketUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TicketsWithSearch() {
  // Use our custom hook for server-side pagination and search
  const {
    tickets,
    isLoading,
    error,
    pagination,
    refreshTickets
  } = useServerPaginatedTickets({
    initialPage: 1,
    initialPageSize: 10,
    searchField: "description" // This will search the description field
  });

  // Convert tickets to rows format for the table
  const ticketRows = tickets.map(ticket => convertTicketToRow(ticket));

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-6">
          <div>
            <CardTitle className="text-2xl font-bold">Tickets</CardTitle>
            <CardDescription>
              View and manage all tickets with server-side search and pagination
            </CardDescription>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </CardHeader>
        <CardContent className="px-6 pt-4 pb-6">
          {error && (
            <div className="border border-red-200 rounded bg-red-50 p-4 mb-4 text-red-500">
              Error: {error.message}
            </div>
          )}

          {/* Pass the columns and data to the DataTable along with pagination */}
          <DataTable
            columns={columns}
            data={ticketRows}
            pagination={pagination}
            isLoading={isLoading}
            searchPlaceholder="Search ticket descriptions..."
            searchColumn="description"
            noResultsMessage="No tickets found. Try a different search term."
          />
        </CardContent>
      </Card>
    </div>
  );
} 