import React, { useMemo } from 'react';
import AppDataTable from '../../../../components/common/AppDataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../../components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Skeleton } from '../../../../components/ui/skeleton';
import { TableCell, TableRow } from '../../../../components/ui/table';
import {
  BRANCH_COST_PERIOD_OPTIONS,
  getBranchCostVisiblePageNumbers,
} from '../../utils/branchCostAnalysis';

const tableHeader = [
  { key: 'branchName', title: 'Branch Name', cellClassName: 'font-medium' },
  { key: 'branchCode', title: 'Branch Code', cellClassName: 'text-sm' },
  { key: 'areaSqft', title: 'Area (sq ft)', cellClassName: 'text-sm text-left' },
  { key: 'totalCost', title: 'Total Cost', cellClassName: 'text-sm font-semibold text-left' },
  { key: 'costPerSqft', title: 'Cost / sq ft', cellClassName: 'text-sm text-left' },
  { key: 'invoiceCount', title: 'No. of Invoices', cellClassName: 'text-sm text-left' },
];

const normalizeBranchCostRow = (row = {}) => {
  const areaSqft = Number(
    row.areaSqft ?? row.area_sqft ?? row.areaOfBranch ?? row.area_of_branch ?? 0,
  );
  const totalCost = Number(row.totalCost ?? row.total_cost ?? row.totalAmount ?? 0);
  const costPerSqft = Number(
    row.costPerSqft ??
      row.cost_per_sqft ??
      (areaSqft > 0 ? totalCost / areaSqft : 0),
  );

  return {
    branchName: row.branchName ?? row.branch_name ?? row.name ?? '-',
    branchCode: row.branchCode ?? row.branch_code ?? row.code ?? '-',
    areaSqft,
    totalCost,
    costPerSqft,
    invoiceCount: Number(
      row.invoiceCount ?? row.invoice_count ?? row.noOfInvoices ?? row.no_of_invoices ?? 0,
    ),
  };
};

const formatArea = (value) =>
  Number.isFinite(value) && value > 0
    ? value.toLocaleString('en-IN')
    : '-';

const formatCount = (value) =>
  Number.isFinite(value) ? value.toLocaleString('en-IN') : '-';

const BranchCostAnalysisCard = ({
  branchCostData,
  isLoading = false,
  formatFullCurrency,
  period,
  onPeriodChange,
  pagination,
  onPageChange,
}) => {
  const rows = useMemo(() => {
    const source =
      branchCostData?.branches ??
      branchCostData?.branch_cost_analysis ??
      branchCostData?.items ??
      branchCostData ??
      [];
    return (Array.isArray(source) ? source : []).map(normalizeBranchCostRow);
  }, [branchCostData]);

  const costBasisLabel = useMemo(() => {
    const basis =
      branchCostData?.costBasis ??
      branchCostData?.cost_basis ??
      branchCostData?.costStatuses ??
      branchCostData?.cost_statuses;
    if (!basis) return null;
    const values = Array.isArray(basis) ? basis : String(basis).split(',');
    const labels = values
      .map((value) => String(value || '').trim().toUpperCase())
      .filter(Boolean)
      .map((value) => (value === 'PAID' ? 'Paid' : value === 'APPROVED' ? 'Approved' : value));
    return labels.length ? labels.join(' + ') : null;
  }, [branchCostData]);

  const {
    total = 0,
    currentPage = 0,
    totalPages = 0,
    startRecord = 0,
    endRecord = 0,
    hasMore = false,
  } = pagination ?? {};

  const visiblePageNumbers = useMemo(
    () => getBranchCostVisiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const renderRow = (row, rowIndex, headers) => (
    <TableRow key={`${row.branchCode}-${rowIndex}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'areaSqft':
            value = formatArea(row.areaSqft);
            break;
          case 'totalCost':
            value = formatFullCurrency(row.totalCost);
            break;
          case 'costPerSqft':
            value =
              row.areaSqft > 0 ? formatFullCurrency(row.costPerSqft) : '-';
            break;
          case 'invoiceCount':
            value = formatCount(row.invoiceCount);
            break;
          default:
            value = row[header.key] || '-';
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <Card data-testid="branch-cost-analysis-card">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">Branch Cost Analysis</CardTitle>
          <CardDescription>
            Branch-wise spend, area utilization, and invoice volume for the
            selected period
            {costBasisLabel ? ` (${costBasisLabel} invoices)` : ''}.
          </CardDescription>
        </div>
        <div className="w-full sm:w-[220px]">
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger
              className="h-9"
              data-testid="branch-cost-analysis-period-filter"
            >
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {BRANCH_COST_PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <AppDataTable
              tableHeader={tableHeader}
              tableData={rows}
              renderRow={renderRow}
              emptyMessage="No branch cost data available for the selected period."
              emptyTestId="branch-cost-analysis-empty"
            />

            {totalPages > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="branch-cost-analysis-pagination-summary"
                >
                  Showing {startRecord}-{endRecord} of {total.toLocaleString('en-IN')}
                </p>
                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          onPageChange?.(currentPage - 1);
                        }}
                        className={
                          currentPage === 0
                            ? 'pointer-events-none opacity-50'
                            : undefined
                        }
                        data-testid="branch-cost-analysis-pagination-previous"
                      />
                    </PaginationItem>
                    {visiblePageNumbers.map((pageNumber) => (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === currentPage}
                          onClick={(event) => {
                            event.preventDefault();
                            onPageChange?.(pageNumber);
                          }}
                          data-testid={`branch-cost-analysis-pagination-page-${pageNumber + 1}`}
                        >
                          {pageNumber + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          onPageChange?.(currentPage + 1);
                        }}
                        className={
                          !hasMore && currentPage >= totalPages - 1
                            ? 'pointer-events-none opacity-50'
                            : undefined
                        }
                        data-testid="branch-cost-analysis-pagination-next"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BranchCostAnalysisCard;
