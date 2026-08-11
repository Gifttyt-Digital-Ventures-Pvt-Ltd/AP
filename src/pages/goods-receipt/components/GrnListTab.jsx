import { useEffect, useMemo, useState } from 'react';
import { Edit, Eye, Plus, CheckCircle2, Search, Unlock } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import TableSortButton from '../../../components/common/TableSortButton';
import GrnStatusBadge from './GrnStatusBadge';
import GrnSourceBadge from './GrnSourceBadge';
import { GRN_PAGE_SIZE, GRN_STATUS } from '../constants';
import { formatDate } from '../utils';
import {
  getAccountingUnlockRequestStatus,
  isAccountingReadyLocked,
} from '../../../utils/accountingLock';

const grnSortOptions = [
  { value: 'created_at', label: 'Upload date', defaultDirection: 'desc' },
];

const GrnListTab = ({
  grns = [],
  canCreate = false,
  canApprove = false,
  search = '',
  setSearch,
  grnSort = { value: 'created_at', direction: 'desc' },
  setGrnSort,
  onCreate,
  onView,
  onEdit,
  onReview,
  onRequestUnlock,
  requestingUnlock = false,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, grnSort]);

  const grnQuickFilters = useMemo(
    () => [
      { value: 'all', label: 'All', count: grns.length },
      {
        value: GRN_STATUS.PENDING_APPROVAL,
        label: 'Pending Approval',
        count: grns.filter((grn) => grn.status === GRN_STATUS.PENDING_APPROVAL).length,
      },
      {
        value: GRN_STATUS.APPROVED,
        label: 'Approved',
        count: grns.filter((grn) => grn.status === GRN_STATUS.APPROVED).length,
      },
      {
        value: GRN_STATUS.DRAFT,
        label: 'Draft',
        count: grns.filter((grn) => grn.status === GRN_STATUS.DRAFT).length,
      },
    ],
    [grns],
  );

  // Search and sort are now applied server-side (see GoodsReceipt.jsx's grnQueryParams).
  // Status stays a client-side filter on the already-fetched page so the quick-filter
  // counts above stay stable regardless of which status button is active — sending
  // status to the server would narrow `grns` itself and collapse the other counts,
  // the same bug fixed for the Vendors page's quick filters.
  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? grns
        : grns.filter((grn) => grn.status === statusFilter),
    [grns, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / GRN_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * GRN_PAGE_SIZE, (safePage + 1) * GRN_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {grnQuickFilters.map(({ value, label, count }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={statusFilter === value ? 'default' : 'outline'}
              onClick={() => setStatusFilter(value)}
              data-testid={`grn-filter-${value}`}
            >
              {label} ({count})
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GRN number or vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="search-grn-input"
            />
          </div>
          <TableSortButton
            options={grnSortOptions}
            value={grnSort.value}
            direction={grnSort.direction}
            onChange={setGrnSort}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table className="border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="border border-table-border text-foreground">GRN Number</TableHead>
              <TableHead className="border border-table-border text-foreground">Date</TableHead>
              <TableHead className="border border-table-border text-foreground">Vendor</TableHead>
              <TableHead className="border border-table-border text-foreground">PO Reference</TableHead>
              <TableHead className="border border-table-border text-foreground">Source</TableHead>
              <TableHead className="border border-table-border text-foreground">Status</TableHead>
              <TableHead className="border border-table-border text-center text-foreground">Lines</TableHead>
              <TableHead className="border border-table-border text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="border border-table-border py-12 text-center text-muted-foreground">
                  No goods receipts found.{' '}
                  {canCreate && (
                    <Button variant="link" className="px-1" onClick={onCreate}>
                      Create a GRN
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((grn) => (
                <TableRow
                  key={grn.id}
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => onView(grn)}
                  data-testid={`grn-row-${grn?.id ?? 'unknown'}`}
                >
                  <TableCell className="border border-table-border font-semibold text-primary">{grn.grn_number}</TableCell>
                  <TableCell className="border border-table-border text-muted-foreground">{formatDate(grn.receipt_date)}</TableCell>
                  <TableCell className="border border-table-border">{grn.vendor_name || '—'}</TableCell>
                  <TableCell className="border border-table-border">
                    {grn.po_number ? (
                      <span className="font-medium text-blue-600">{grn.po_number}</span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="border border-table-border">
                    <GrnSourceBadge source={grn.source_type} />
                  </TableCell>
                  <TableCell className="border border-table-border">
                    <GrnStatusBadge status={grn.status} />
                  </TableCell>
                  <TableCell className="border border-table-border text-center">
                    <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {grn.line_items?.length || 0}
                    </span>
                  </TableCell>
                  <TableCell className="border border-table-border">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onView(grn);
                        }}
                        data-testid={`view-grn-${grn?.id ?? 'unknown'}`}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      {[GRN_STATUS.DRAFT, GRN_STATUS.SENT_BACK].includes(grn.status) &&
                        !isAccountingReadyLocked(grn) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(grn);
                          }}
                          data-testid={`edit-grn-${grn?.id ?? 'unknown'}`}
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {onRequestUnlock &&
                        isAccountingReadyLocked(grn) &&
                        String(getAccountingUnlockRequestStatus(grn) || '').toUpperCase() !== 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRequestUnlock?.(grn);
                          }}
                          disabled={requestingUnlock}
                          title="Request accounting unlock"
                          data-testid={`request-unlock-grn-${grn?.id ?? 'unknown'}`}
                        >
                          <Unlock className="h-4 w-4 text-amber-700" />
                        </Button>
                      )}
                      {canApprove && grn.status === GRN_STATUS.PENDING_APPROVAL && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onReview(grn);
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Review
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filtered.length > GRN_PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {safePage + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {canCreate && (
        <div className="flex justify-end lg:hidden">
          <Button onClick={onCreate} data-testid="create-grn-btn-mobile">
            <Plus className="mr-2 h-4 w-4" />
            Create GRN
          </Button>
        </div>
      )}
    </div>
  );
};

export default GrnListTab;
