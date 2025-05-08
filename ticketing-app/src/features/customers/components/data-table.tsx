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
} from "@tanstack/react-table";
import { createContext, useContext, useEffect, useState } from "react";

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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  renderTableOnly?: boolean;
  renderPaginationOnly?: boolean;
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
}: {
  children: React.ReactNode;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}) {
  const [tableInstance, setTableInstance] = useState<ReactTable<TData> | null>(null);
  
  // Create the table instance
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
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
    state: {
      sorting,
      columnFilters,
      pagination,
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
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
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
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onPaginationChange: setPagination,
    manualPagination: false,
  });

  return table;
}

export function DataTableContent<TData, TValue>({
  table,
  onRowClick,
}: {
  table?: ReactTable<TData>;
  onRowClick?: (row: TData) => void;
}) {
  // Use the shared table from context if no table is provided
  const sharedTable = useContext(TableContext).tableInstance as ReactTable<TData> | null;
  const tableToUse = table || sharedTable;
  
  if (!tableToUse) return null;
  
  return (
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
              className="cursor-pointer"
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
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
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
}: DataTableProps<TData, TValue>) {
  // For backward compatibility and standalone usage
  if (renderTableOnly || renderPaginationOnly) {
    const table = useDataTable({ columns, data });
    
    if (renderTableOnly) {
      return <DataTableContent table={table} onRowClick={onRowClick} />;
    }
    
    if (renderPaginationOnly) {
      return <DataTablePagination table={table} />;
    }
  }
  
  // New context-based approach for shared state
  return (
    <DataTableProvider columns={columns} data={data}>
      <div className="space-y-4">
        <DataTableContent onRowClick={onRowClick} />
        <DataTablePagination />
      </div>
    </DataTableProvider>
  );
} 