import React from 'react';
import { TableCell, TableRow } from '../../../components/ui/table';

const MatchingGroupExpandedRow = ({
  group,
  colSpan,
  formatCurrency,
  formatDate,
  formatPercent,
  renderMatchActions,
}) => {
  const invoiceMatches = group.invoiceMatches || [];
  const showGrn = invoiceMatches.some(
    (match) => match.matchType === 'THREE_WAY' || match.grnNumber || group.grnNumber,
  );

  return (
    <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="px-4 py-3">
        <div className="pl-8 md:pl-12">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Invoice Match Details
            </span>
            <span className="text-xs text-muted-foreground">
              {invoiceMatches.length} invoice{invoiceMatches.length === 1 ? '' : 's'} against PO {group.poNumber || '-'}
            </span>
          </div>

          <div className="space-y-2">
            {invoiceMatches.map((match, index) => (
              <div
                key={match.id || `${group.id}-${index}`}
                className="rounded-lg border border-border bg-background px-3 py-2"
                data-testid={`matching-row-${match.id}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(160px,1.35fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(100px,0.85fr)_minmax(140px,1fr)] md:items-center">
                    <div className="min-w-0">
                      <div
                        className="truncate text-sm font-semibold text-foreground"
                        title={match.invoiceNumber || '-'}
                      >
                        {match.invoiceNumber || '-'}
                      </div>
                      <div
                        className="truncate text-xs text-muted-foreground"
                        title={`Match ${match.matchNumber || '-'} · ${formatDate(match.createdAt)}`}
                      >
                        Match {match.matchNumber || '-'} · {formatDate(match.createdAt)}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Invoice Amt
                      </div>
                      <div className="truncate text-sm font-medium" title={formatCurrency(match.invoiceAmount)}>
                        {formatCurrency(match.invoiceAmount)}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        PO Amt
                      </div>
                      <div className="truncate text-sm" title={formatCurrency(match.poAmount || group.poAmount)}>
                        {formatCurrency(match.poAmount || group.poAmount)}
                      </div>
                    </div>

                    {showGrn ? (
                      <div className="min-w-0">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          GRN
                        </div>
                        <div className="truncate text-sm" title={match.grnNumber || group.grnNumber || '-'}>
                          {match.grnNumber || group.grnNumber || '-'}
                        </div>
                      </div>
                    ) : (
                      <div className="hidden md:block" />
                    )}

                    <div className="min-w-0">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Variance
                      </div>
                      <div
                        className="truncate text-sm"
                        title={`${formatCurrency(match.varianceAmount)} (${formatPercent(match.variancePercentage)}%)`}
                      >
                        {formatCurrency(match.varianceAmount)}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatPercent(match.variancePercentage)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 justify-start gap-1 lg:w-[104px] lg:justify-end">
                    {renderMatchActions(match)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default MatchingGroupExpandedRow;
