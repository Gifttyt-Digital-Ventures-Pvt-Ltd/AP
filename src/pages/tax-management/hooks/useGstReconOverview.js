import { useMemo, useState } from 'react';
import {
  useGetReconOverviewQuery,
  useGetReconRunStatusQuery,
} from '../../../Services/apis/taxApi';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { mapReconOverviewResponse } from '../utils/gstApiMappers';
import {
  DEFAULT_GST_RECON_OVERVIEW_DATE_FILTER,
  DEFAULT_GST_RECON_OVERVIEW_SOURCE,
} from '../data/taxStaticData';

const GST_RECON_OVERVIEW_PAGE_SIZE = 20;
const GST_RECON_STATUS_FILTER_ALL = 'ALL';
const GST_RECON_RUN_POLL_MS = 5000;

/**
 * Orchestrates GST Overview filter state plus the Overview list API (B2) and run-status
 * API (B3), mapping the response via B4. Purely orchestration — no rendering here; the
 * returned values are meant to drive GstReconFilterBar / GstReconRunBanner /
 * GstReconOverviewTable (B7-B9) from wherever they're composed later.
 *
 * status/search are sent to the backend as query params (filtered server-side, across the
 * full dataset) rather than applied client-side on the current page's rows.
 *
 * `runId` is accepted as an optional argument rather than sourced internally, since neither
 * spec defines how the Overview screen itself would obtain an active run id (the run is
 * started elsewhere, on document-fetch success, per BE §10.1).
 */
export function useGstReconOverview({ runId } = {}) {
  const [dateFilter, setDateFilter] = useState(DEFAULT_GST_RECON_OVERVIEW_DATE_FILTER);
  const [source, setSource] = useState(DEFAULT_GST_RECON_OVERVIEW_SOURCE);
  const [statusFilter, setStatusFilter] = useState(GST_RECON_STATUS_FILTER_ALL);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: rawOverview,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetReconOverviewQuery({
    dateFilter,
    source,
    status: statusFilter === GST_RECON_STATUS_FILTER_ALL ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    // UI page state is 1-based; the backend's `page` param is 0-based (confirmed in the
    // backend implementation doc, §4.1: default `0`). Convert only at the API-call boundary.
    page: page - 1,
    size: GST_RECON_OVERVIEW_PAGE_SIZE,
  });

  const { data: runStatus } = useGetReconRunStatusQuery(runId, {
    skip: !runId,
    pollingInterval: runId ? GST_RECON_RUN_POLL_MS : 0,
  });

  const mapped = useMemo(() => mapReconOverviewResponse(rawOverview ?? {}), [rawOverview]);
  const rows = mapped.rows;

  const totalPages = Math.max(
    1,
    Math.ceil((mapped.total || 0) / (mapped.size || GST_RECON_OVERVIEW_PAGE_SIZE)),
  );

  const resetToFirstPage = () => setPage(1);

  return {
    // Filter state + handlers — drives GstReconFilterBar
    dateFilter,
    onDateFilterChange: (value) => {
      setDateFilter(value);
      resetToFirstPage();
    },
    source,
    onSourceChange: (value) => {
      setSource(value);
      resetToFirstPage();
    },
    statusFilter,
    onStatusFilterChange: (value) => {
      setStatusFilter(value);
      resetToFirstPage();
    },
    search,
    onSearchChange: (value) => {
      setSearch(value);
      resetToFirstPage();
    },
    onRefresh: refetch,
    refreshing: isFetching,

    // Run status — drives GstReconRunBanner
    runState: runStatus?.state ?? null,
    runCounts: runStatus?.counts ?? null,

    // Table data + pagination — drives GstReconOverviewTable
    rows,
    page,
    totalPages,
    onPreviousPage: () => setPage((current) => Math.max(1, current - 1)),
    onNextPage: () => setPage((current) => Math.min(totalPages, current + 1)),

    // Status flags
    isLoading: isLoading || isFetching,
    isError,
    error,
  };
}
