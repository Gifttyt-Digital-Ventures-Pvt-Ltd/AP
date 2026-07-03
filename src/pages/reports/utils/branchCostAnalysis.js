export const BRANCH_COST_PERIOD_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
];

export const BRANCH_COST_DEFAULT_PERIOD = 'this_month';
export const BRANCH_COST_PAGE_SIZE = 10;

export const normalizeBranchCostPagination = (
  response,
  { limit = BRANCH_COST_PAGE_SIZE, offset = 0 } = {},
) => {
  const data = response && typeof response === 'object' ? response : {};
  const total = Number(
    data.total ??
      data.totalCount ??
      data.total_count ??
      data.count ??
      0,
  );
  const resolvedLimit = Number(
    data.limit ?? data.pageSize ?? data.page_size ?? limit,
  );
  const resolvedOffset = Number(
    data.offset ?? data.skip ?? offset,
  );
  const hasMore =
    data.hasMore ??
    data.has_more ??
    (total > 0
      ? resolvedOffset + resolvedLimit < total
      : false);

  const safeLimit = Number.isFinite(resolvedLimit) && resolvedLimit > 0
    ? resolvedLimit
    : limit;
  const safeOffset = Number.isFinite(resolvedOffset) && resolvedOffset >= 0
    ? resolvedOffset
    : offset;
  const currentPage = safeLimit > 0 ? Math.floor(safeOffset / safeLimit) : 0;
  const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;
  const startRecord = total === 0 ? 0 : safeOffset + 1;
  const endRecord = total === 0 ? 0 : Math.min(safeOffset + safeLimit, total);

  return {
    total,
    limit: safeLimit,
    offset: safeOffset,
    currentPage,
    totalPages,
    hasMore: Boolean(hasMore),
    startRecord,
    endRecord,
  };
};

export const getBranchCostVisiblePageNumbers = (currentPage, totalPages, maxVisible = 5) => {
  if (totalPages <= 1) return totalPages > 0 ? [0] : [];

  const safeMax = Math.max(1, maxVisible);
  let start = Math.max(0, currentPage - Math.floor(safeMax / 2));
  let end = start + safeMax - 1;

  if (end >= totalPages) {
    end = totalPages - 1;
    start = Math.max(0, end - safeMax + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};
