"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Table as ReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { createContext, useContext, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, X } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  renderTableOnly?: boolean;
  renderPaginationOnly?: boolean;
  searchPlaceholder?: string;
  searchColumn?: string;
  isLoading?: boolean;
  noResultsMessage?: string;
  initialPageSize?: number;
}

// Create a context to share the table instance
const TableContext = createContext<{
  tableInstance: ReactTable<any> | null;
  setTableInstance: (table: ReactTable<any>) => void;
}>({
  tableInstance: null,
  setTableInstance: () => {},
});

// Hook to create and provide a table instance
export function DataTableProvider<TData, TValue>({
  children,
  columns,
  data,
  searchColumn,
  initialPageSize = 10,
}: {
  children: React.ReactNode;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  initialPageSize?: number;
}) {
  const [tableInstance, setTableInstance] = useState<ReactTable<TData> | null>(null);
  
  // Create the table instance
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    manualPagination: false,
  });
  
  // Update the context with the latest table instance
  useEffect(() => {
    setTableInstance(table);
  }, [table]);

  return (
    <TableContext.Provider value={{ tableInstance: table, setTableInstance }}>
      {children}
    </TableContext.Provider>
  );
}

// Hook to use the shared table instance
export function useSharedTable<TData>() {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error("useSharedTable must be used within a DataTableProvider");
  }
  return context.tableInstance as ReactTable<TData>;
}

// Original hook is kept for backward compatibility
export function useDataTable<TData, TValue>({
  columns,
  data,
  initialPageSize = 10,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialPageSize?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    manualPagination: false,
  });

  return table;
}

export function DataTableSearch<TData>({
  table,
  placeholder = "Search...",
  column = "name",
}: {
  table?: ReactTable<TData>;
  placeholder?: string;
  column?: string;
}) {
  const [value, setValue] = useState("");
  
  // Use the shared table from context if no table is provided
  const sharedTable = useContext(TableContext).tableInstance as ReactTable<TData> | null;
  const tableToUse = table || sharedTable;
  
  if (!tableToUse) return null;

  return (
    <div className="flex items-center mb-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            tableToUse.getColumn(column)?.setFilterValue(e.target.value);
          }}
          className="pl-8 w-full"
        />
        {value && (
          <button
            onClick={() => {
              setValue("");
              tableToUse.getColumn(column)?.setFilterValue("");
            }}
            className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DataTableContent<TData, TValue>({
  table,
  onRowClick,
  isLoading,
  noResultsMessage = "No results.",
}: {
  table?: ReactTable<TData>;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  noResultsMessage?: string;
}) {
  // Use the shared table from context if no table is provided
  const sharedTable = useContext(TableContext).tableInstance as ReactTable<TData> | null;
  const tableToUse = table || sharedTable;
  
  if (!tableToUse) return null;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {tableToUse.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {tableToUse.getRowModel().rows?.length ? (
            tableToUse.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => onRowClick && onRowClick(row.original)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={tableToUse.getAllColumns().length} className="h-24 text-center">
                {noResultsMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataTablePagination<TData>({ table }: { table?: ReactTable<TData> }) {
  // Use the shared table from context if no table is provided
  const sharedTable = useContext(TableContext).tableInstance as ReactTable<TData> | null;
  const tableToUse = table || sharedTable;
  
  if (!tableToUse) return null;

  return (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">Rows per page</p>
        <Select
          value={`${tableToUse.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            tableToUse.setPageSize(Number(value));
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={tableToUse.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top" className="bg-white">
            {[5, 10, 20, 50, 100].map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <div className="text-sm text-muted-foreground">
          Page {tableToUse.getState().pagination.pageIndex + 1} of{" "}
          {tableToUse.getPageCount() || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => tableToUse.previousPage()}
          disabled={!tableToUse.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => tableToUse.nextPage()}
          disabled={!tableToUse.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// Updated DataTable with context-based sharing
export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  renderTableOnly,
  renderPaginationOnly,
  searchPlaceholder,
  searchColumn = "name",
  isLoading,
  noResultsMessage,
  initialPageSize = 10,
}: DataTableProps<TData, TValue>) {
  // For backward compatibility and standalone usage
  if (renderTableOnly || renderPaginationOnly) {
    const table = useDataTable({ columns, data, initialPageSize });
    
    if (renderTableOnly) {
      return <DataTableContent table={table} onRowClick={onRowClick} isLoading={isLoading} noResultsMessage={noResultsMessage} />;
    }
    
    if (renderPaginationOnly) {
      return <DataTablePagination table={table} />;
    }
  }
  
  // New context-based approach for shared state
  return (
    <DataTableProvider columns={columns} data={data} searchColumn={searchColumn} initialPageSize={initialPageSize}>
      <div className="space-y-4">
        {searchPlaceholder && <DataTableSearch placeholder={searchPlaceholder} column={searchColumn} />}
        <DataTableContent onRowClick={onRowClick} isLoading={isLoading} noResultsMessage={noResultsMessage} />
        <DataTablePagination />
      </div>
    </DataTableProvider>
  );
} 