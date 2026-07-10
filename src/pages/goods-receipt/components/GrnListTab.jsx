import { useMemo, useState } from 'react';
import { Edit, Eye, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import GrnStatsCards from './GrnStatsCards';
import GrnStatusBadge from './GrnStatusBadge';
import GrnSourceBadge from './GrnSourceBadge';
import { GRN_PAGE_SIZE, GRN_SOURCE, GRN_STATUS } from '../constants';
import { formatDate } from '../utils';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: GRN_STATUS.DRAFT, label: 'Draft' },
  { value: GRN_STATUS.PENDING_APPROVAL, label: 'Pending Approval' },
  { value: GRN_STATUS.SENT_BACK, label: 'Sent Back' },
  { value: GRN_STATUS.APPROVED, label: 'Approved' },
  { value: GRN_STATUS.REJECTED, label: 'Rejected' },
  { value: GRN_STATUS.CANCELLED, label: 'Cancelled' },
];

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: GRN_SOURCE.PO, label: 'PO' },
  { value: GRN_SOURCE.STANDALONE, label: 'Standalone' },
  { value: GRN_SOURCE.UPLOAD, label: 'Uploaded' },
  { value: GRN_SOURCE.FROM_PI, label: 'From PI' },
];

const GrnListTab = ({
  grns = [],
  pendingPoCount = 0,
  canCreate = false,
  canApprove = false,
  onCreate,
  onView,
  onEdit,
  onReview,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [page, setPage] = useState(0);

  const vendors = useMemo(
    () => [...new Set(grns.map((grn) => grn.vendor_name).filter(Boolean))].sort(),
    [grns],
  );

  const filtered = useMemo(
    () =>
      grns.filter((grn) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          grn.grn_number?.toLowerCase().includes(query) ||
          grn.po_number?.toLowerCase().includes(query) ||
          grn.vendor_name?.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'all' || grn.status === statusFilter;
        const matchesSource = sourceFilter === 'all' || grn.source_type === sourceFilter;
        const matchesVendor = vendorFilter === 'all' || grn.vendor_name === vendorFilter;
        return matchesSearch && matchesStatus && matchesSource && matchesVendor;
      }),
    [grns, search, statusFilter, sourceFilter, vendorFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / GRN_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * GRN_PAGE_SIZE, (safePage + 1) * GRN_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <GrnStatsCards grns={grns} pendingPoCount={pendingPoCount} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search GRN, PO, vendor…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="max-w-xs"
            data-testid="search-grn-input"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(value) => {
              setSourceFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={vendorFilter}
            onValueChange={(value) => {
              setVendorFilter(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((vendor) => (
                <SelectItem key={vendor} value={vendor}>
                  {vendor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} GRN{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>PO Reference</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Lines</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
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
                <TableRow key={grn.id} data-testid={`grn-row-${grn?.id ?? 'unknown'}`}>
                  <TableCell className="font-semibold text-primary">{grn.grn_number}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(grn.receipt_date)}</TableCell>
                  <TableCell>{grn.vendor_name || '—'}</TableCell>
                  <TableCell>
                    {grn.po_number ? (
                      <span className="font-medium text-blue-600">{grn.po_number}</span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <GrnSourceBadge source={grn.source_type} />
                  </TableCell>
                  <TableCell>
                    <GrnStatusBadge status={grn.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {grn.line_items?.length || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onView(grn)} data-testid={`view-grn-${grn?.id ?? 'unknown'}`}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      {[GRN_STATUS.DRAFT, GRN_STATUS.SENT_BACK].includes(grn.status) && (
                        <Button variant="outline" size="sm" onClick={() => onEdit(grn)} data-testid={`edit-grn-${grn?.id ?? 'unknown'}`}>
                          <Edit className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {canApprove && grn.status === GRN_STATUS.PENDING_APPROVAL && (
                        <Button variant="outline" size="sm" onClick={() => onReview(grn)}>
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
