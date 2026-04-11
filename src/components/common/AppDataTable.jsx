import React from "react";
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
  rowKey = "id",
  emptyMessage = "No records found",
  emptyColSpan,
  tableClassName = "",
  headClassName = "",
  bodyClassName = "",
  rowClassName = "",
  getRowClassName,
  getRowProps,
  emptyTestId,
}) => {
  const resolvedEmptyColSpan = emptyColSpan || columns.length || 1;

  return (
    <Table className={tableClassName}>
      <TableHeader className={headClassName}>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key || column.header} className={column.headerClassName || ""}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className={bodyClassName}>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={resolvedEmptyColSpan} className="text-center py-8 text-muted-foreground" data-testid={emptyTestId}>
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, index) => {
            const key = typeof rowKey === "function" ? rowKey(row, index) : row?.[rowKey] ?? index;
            const computedClassName = [
              rowClassName,
              getRowClassName ? getRowClassName(row, index) : "",
            ]
              .filter(Boolean)
              .join(" ");
            const rowProps = getRowProps ? getRowProps(row, index) : {};

            return (
              <TableRow key={key} className={computedClassName} {...rowProps}>
                {columns.map((column) => (
                  <TableCell key={column.key || column.header} className={column.cellClassName || ""}>
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
