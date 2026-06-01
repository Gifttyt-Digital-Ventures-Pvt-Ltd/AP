import React from "react";
import { cn } from "../../lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const AppDataTable = ({
  columns = [],
  rows = [],
  tableHeader,
  tableData,
  renderRow,
  rowKey = "id",
  emptyMessage = "No records found",
  message,
  emptyColSpan,
  tableClassName = "",
  headClassName = "",
  bodyClassName = "",
  rowClassName = "",
  getRowClassName,
  getRowProps,
  emptyTestId,
  isLoading = false,
  loadingRowCount,
  length = 5,
  showCheckbox = false,
  handleCheckboxChange,
  onSelectAllChange,
  isChecked = false,
  stickyHeader = true,
  striped = true,
}) => {
  const resolvedColumns =
    tableHeader?.map((header, index) => {
      const key = header.key || header.id || header.title || `column-${index}`;
      const columnConfig = columns.find((column) => column.key === key) || {};
      return {
        ...columnConfig,
        key,
        header: header.title ?? header.header ?? header.label ?? header,
        headerClassName: header.headerClassName ?? columnConfig.headerClassName,
        cellClassName: header.cellClassName ?? columnConfig.cellClassName,
        render: header.render ?? columnConfig.render,
      };
    }) || columns;
  const resolvedRows = tableData || rows;
  const resolvedEmptyColSpan = emptyColSpan || resolvedColumns.length || 1;
  const resolvedEmptyMessage = message || emptyMessage;
  const resolvedLoadingRowCount = loadingRowCount || length || 5;
  const selectAllHandler = onSelectAllChange || handleCheckboxChange;

  return (
    <Table className={cn("border-separate border-spacing-0", tableClassName)}>
      <TableHeader
        className={cn(
          "bg-muted/70",
          stickyHeader && "sticky top-0 z-10",
          headClassName,
        )}
      >
        <TableRow>
          {resolvedColumns.map((column, index) => (
            <TableHead
              key={column.key || column.header}
              className={cn(
                "h-10 whitespace-nowrap border-0 bg-muted/70 px-3 text-xs font-medium text-foreground",
                index === 0 && "rounded-l-md",
                index === resolvedColumns.length - 1 && "rounded-r-md",
                column.headerClassName,
              )}
            >
              {showCheckbox && index === 0 ? (
                <span className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={selectAllHandler}
                    data-testid="table-select-all-checkbox"
                  />
                  {column.header}
                </span>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className={bodyClassName}>
        {isLoading ? (
          Array.from({ length: resolvedLoadingRowCount }).map((_, rowIndex) => (
            <TableRow
              key={`loading-row-${rowIndex}`}
              className={cn(
                striped && rowIndex % 2 === 1 && "bg-muted/20",
                rowClassName,
              )}
            >
              {resolvedColumns.map((column) => (
                <TableCell
                  key={column.key || column.header}
                  className={cn("px-3 py-3", column.cellClassName)}
                >
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : resolvedRows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={resolvedEmptyColSpan}
              className="px-4 py-8 text-center text-sm italic text-muted-foreground"
              data-testid={emptyTestId}
            >
              {resolvedEmptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          resolvedRows.map((row, index) => {
            if (renderRow) return renderRow(row, index, resolvedColumns);

            const key = typeof rowKey === "function" ? rowKey(row, index) : row?.[rowKey] ?? index;
            const computedClassName = [
              striped && index % 2 === 1 ? "bg-muted/20" : "",
              rowClassName,
              getRowClassName ? getRowClassName(row, index) : "",
            ]
              .filter(Boolean)
              .join(" ");
            const rowProps = getRowProps ? getRowProps(row, index) : {};

            return (
              <TableRow key={key} className={computedClassName} {...rowProps}>
                {resolvedColumns.map((column) => (
                  <TableCell
                    key={column.key || column.header}
                    className={cn("px-3 py-3", column.cellClassName)}
                  >
                    {column.render ? column.render(row, index) : row?.[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default AppDataTable;
