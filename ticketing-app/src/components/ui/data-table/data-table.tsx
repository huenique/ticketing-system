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
  PaginationState,
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

interface PaginationProps {
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions: number[];
  totalItems: number;
  onSearch?: (value: string) => void;
  isLoading?: boolean;
}

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
  pagination?: PaginationProps;
  noSearchBar?: boolean;
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  // Track initialPageSize changes
  useEffect(() => {
    console.log(`DataTableProvider: initialPageSize changed to ${initialPageSize}`);
    setPagination(prev => ({
      ...prev,
      pageSize: initialPageSize
    }));
  }, [initialPageSize]);

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
    initialState: {
      pagination: {
        pageSize: initialPageSize
      }
    }
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  // Update pagination when initialPageSize changes
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageSize: initialPageSize
    }));
  }, [initialPageSize]);

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
  serverSideSearch,
}: {
  table?: ReactTable<TData>;
  placeholder?: string;
  column?: string;
  serverSideSearch?: {
    onSearch: (value: string) => void;
    isLoading?: boolean;
  };
}) {
  const [value, setValue] = useState("");
  
  // Use the shared table from context if no table is provided
  const sharedTable = useContext(TableContext).tableInstance as ReactTable<TData> | null;
  const tableToUse = table || sharedTable;
  
  // Handle client-side search
  const handleClientSearch = (searchValue: string) => {
    if (tableToUse) {
      tableToUse.getColumn(column)?.setFilterValue(searchValue);
    }
  };

  // Handle search value changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // If using client-side search, filter immediately on change
    if (!serverSideSearch && tableToUse) {
      handleClientSearch(newValue);
    }
  };

  // Handle search button click for server-side search
  const handleSearchClick = () => {
    if (serverSideSearch) {
      serverSideSearch.onSearch(value);
    }
  };

  // Handle clear
  const handleClear = () => {
    setValue("");
    
    if (serverSideSearch) {
      serverSideSearch.onSearch("");
    } else if (tableToUse) {
      handleClientSearch("");
    }
  };

  if (!tableToUse && !serverSideSearch) return null;

  return (
    <div className="flex items-center mb-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            // Add Enter key support for server-side search
            if (e.key === "Enter" && serverSideSearch) {
              e.preventDefault();
              handleSearchClick();
            }
          }}
          className="pl-8 w-full"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {serverSideSearch && (
        <Button 
          onClick={handleSearchClick} 
          className="ml-2 bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={serverSideSearch.isLoading}
        >
          {serverSideSearch.isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Search
        </Button>
      )}
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
      <div className="rounded-md border relative">
        <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 font-medium">Loading...</span>
        </div>
        <div className="h-64"></div>
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

export function DataTablePagination<TData>({ 
  table,
  serverPagination
}: { 
  table?: ReactTable<TData>;
  serverPagination?: PaginationProps;
}) {
  // Use the shared table from context if no table is provided
  const sharedTable = useContext(TableContext).tableInstance as ReactTable<TData> | null;
  const tableToUse = table || sharedTable;
  
  if (!tableToUse && !serverPagination) return null;
  
  // Server-side pagination
  if (serverPagination) {
    const { 
      pageCount, 
      currentPage, 
      onPageChange, 
      pageSize,
      onPageSizeChange,
      pageSizeOptions,
      totalItems
    } = serverPagination;
    
    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {totalItems} total items
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent side="top" className="bg-white">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {currentPage} of {pageCount || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to first page</span>
              <span>{'<<'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to previous page</span>
              <span>{'<'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === pageCount}
            >
              <span className="sr-only">Go to next page</span>
              <span>{'>'}</span>
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(pageCount)}
              disabled={currentPage === pageCount}
            >
              <span className="sr-only">Go to last page</span>
              <span>{'>>'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Client-side pagination with react-table
  if (tableToUse) {
    // Use same page size options as the server-side pagination for consistency
    const pageSizes = [5, 10, 20, 50, 100];
    
    // Calculate the total number of displayed rows
    const totalDisplayed = tableToUse.getFilteredRowModel().rows.length;
    const pageSize = tableToUse.getState().pagination.pageSize;
    const currentPageIndex = tableToUse.getState().pagination.pageIndex;
    const startRow = currentPageIndex * pageSize + 1;
    const endRow = Math.min(startRow + pageSize - 1, totalDisplayed);
    
    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {startRow}-{endRow} of {totalDisplayed} row(s)
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
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
              <SelectContent side="top">
                {pageSizes.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {tableToUse.getState().pagination.pageIndex + 1} of{" "}
            {tableToUse.getPageCount() || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => tableToUse.setPageIndex(0)}
              disabled={!tableToUse.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <span>{'<<'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => tableToUse.previousPage()}
              disabled={!tableToUse.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <span>{'<'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => tableToUse.nextPage()}
              disabled={!tableToUse.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <span>{'>'}</span>
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => tableToUse.setPageIndex(tableToUse.getPageCount() - 1)}
              disabled={!tableToUse.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <span>{'>>'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Return empty if no pagination is available
  return null;
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
  pagination,
  noSearchBar = false,
}: DataTableProps<TData, TValue>) {
  
  // If server-side pagination is provided, use its pageSize as initialPageSize
  const effectiveInitialPageSize = pagination?.pageSize || initialPageSize;
  
  // If server-side pagination is provided, disable client-side pagination
  const manualPagination = !!pagination;
  
  // State for pagination
  const [paginationState, setPaginationState] = useState({
    pageIndex: manualPagination ? (pagination?.currentPage || 1) - 1 : 0,
    pageSize: effectiveInitialPageSize
  });
  
  // Create a new table instance for this component
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination,
    pageCount: pagination?.pageCount,
    state: {
      pagination: paginationState,
    },
    onPaginationChange: manualPagination ? undefined : setPaginationState,
  });

  // Update pagination state when server pagination changes
  useEffect(() => {
    if (pagination) {
      setPaginationState({
        pageIndex: (pagination.currentPage || 1) - 1,
        pageSize: pagination.pageSize || effectiveInitialPageSize
      });
    }
  }, [pagination?.currentPage, pagination?.pageSize]);

  // Create server-side search props if pagination with onSearch is provided
  const serverSideSearch = pagination?.onSearch ? {
    onSearch: pagination.onSearch,
    isLoading: pagination.isLoading
  } : undefined;

  if (renderTableOnly) {
    return <DataTableContent table={table} onRowClick={onRowClick} isLoading={isLoading} noResultsMessage={noResultsMessage} />;
  }

  if (renderPaginationOnly) {
    return <DataTablePagination table={table} serverPagination={pagination} />;
  }

  return (
    <DataTableProvider columns={columns} data={data} searchColumn={searchColumn} initialPageSize={effectiveInitialPageSize}>
      {!isLoading && !noSearchBar && (
        <DataTableSearch 
          placeholder={searchPlaceholder} 
          column={searchColumn} 
          serverSideSearch={serverSideSearch}
        />
      )}
      <DataTableContent onRowClick={onRowClick} isLoading={isLoading} noResultsMessage={noResultsMessage} />
      <DataTablePagination serverPagination={pagination} />
    </DataTableProvider>
  );
} 