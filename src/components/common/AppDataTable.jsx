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

const formatCellValue = (value) => {
  if (value == null || value === "") return "-";
  return value;
};

const safeRenderCell = (render, row, index) => {
  try {
    return render(row ?? {}, index);
  } catch (error) {
    console.error("Table cell render failed", error);
    return "-";
  }
};

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
  emptyCellClassName,
  isLoading = false,
  loadingRowCount,
  length = 5,
  showCheckbox = false,
  handleCheckboxChange,
  onSelectAllChange,
  isChecked = false,
  stickyHeader = true,
  striped = true,
  tableContainerClassName = "",
  bordered = false,
}) => {
  const resolvedColumns =
    tableHeader?.map((header, index) => {
      const isObjectHeader = header && typeof header === "object" && !React.isValidElement(header);
      const key = isObjectHeader ? header.key || header.id || `column-${index}` : header || `column-${index}`;
      const columnConfig = columns.find((column) => column.key === key) || {};
      return {
        ...columnConfig,
        key,
        header: isObjectHeader
          ? header.title ?? header.header ?? header.label ?? ""
          : header,
        headerClassName: isObjectHeader ? header.headerClassName ?? columnConfig.headerClassName : columnConfig.headerClassName,
        cellClassName: isObjectHeader ? header.cellClassName ?? columnConfig.cellClassName : columnConfig.cellClassName,
        render: isObjectHeader ? header.render ?? columnConfig.render : columnConfig.render,
      };
    }) || columns;
  const resolvedRows = Array.isArray(tableData)
    ? tableData
    : Array.isArray(rows)
      ? rows
      : [];
  const resolvedEmptyColSpan = emptyColSpan || resolvedColumns.length || 1;
  const resolvedEmptyMessage = message || emptyMessage;
  const resolvedLoadingRowCount = loadingRowCount || length || 5;
  const selectAllHandler = onSelectAllChange || handleCheckboxChange;

  return (
    <Table
      className={cn("border-separate border-spacing-0", tableClassName)}
      containerClassName={tableContainerClassName}
    >
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
                "h-10 whitespace-nowrap bg-muted/100 px-3 text-xs font-medium text-foreground",
                bordered ? "border border-border" : "border-0",
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
                  className={cn(
                    "px-3 py-3",
                    bordered && "border border-border",
                    column.cellClassName,
                  )}
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
              className={cn(
                "px-4 py-8 text-center text-sm italic text-muted-foreground",
                emptyCellClassName,
              )}
              data-testid={emptyTestId}
            >
              {resolvedEmptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          resolvedRows.map((row, index) => {
            if (renderRow) {
              try {
                return renderRow(row ?? {}, index, resolvedColumns);
              } catch (error) {
                console.error("Table row render failed", error);
                return (
                  <TableRow key={`row-error-${index}`}>
                    <TableCell
                      colSpan={resolvedColumns.length || 1}
                      className="px-3 py-3 text-sm text-muted-foreground"
                    >
                      Unable to display this row
                    </TableCell>
                  </TableRow>
                );
              }
            }

            const key =
              typeof rowKey === "function"
                ? rowKey(row, index)
                : (row?.[rowKey] ?? index);
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
                    className={cn(
                      "px-3 py-3",
                      bordered && "border border-border",
                      column.cellClassName,
                    )}
                  >
                    {column.render
                      ? safeRenderCell(column.render, row, index)
                      : formatCellValue(row?.[column.key])}
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
