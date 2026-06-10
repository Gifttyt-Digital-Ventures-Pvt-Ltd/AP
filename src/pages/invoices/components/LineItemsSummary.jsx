import React from 'react';

const SummaryRow = ({ label, value, bold = false }) => (
  <div className={`flex justify-between text-xs ${bold ? 'font-semibold' : ''}`}>
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

const LineItemsSummary = ({
  summary,
  formatAmount,
  isInvoiceLevelTax = false,
  className = '',
}) => {
  if (!summary || summary.itemCount === 0) {
    return (
      <div className={`rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground ${className}`}>
        No line items to summarize.
      </div>
    );
  }

  const itemLabel = `${summary.itemCount} item${summary.itemCount !== 1 ? 's' : ''}`;

  return (
    <div className={`rounded-lg border bg-gray-50 p-3 space-y-1.5 ${className}`}>
      <p className="text-xs font-medium text-gray-700 mb-2">Line Items Summary</p>
      <SummaryRow label="Items" value={itemLabel} />
      <SummaryRow label="Sub Total" value={formatAmount(summary.subTotal)} />
      {!isInvoiceLevelTax && summary.lineTaxTotal > 0 && (
        <SummaryRow label="Line Tax" value={formatAmount(summary.lineTaxTotal)} />
      )}
      <SummaryRow
        label={isInvoiceLevelTax ? 'Lines Net Amount' : 'Lines Total'}
        value={formatAmount(summary.linesNetTotal)}
        bold
      />
    </div>
  );
};

export const LineItemsSectionHeader = ({
  showLineItems,
  onToggle,
  itemCount = 0,
}) => (
  <div className="flex items-center justify-between gap-2">
    <h3 className="text-sm font-semibold text-gray-800">
      Line Items
      {itemCount > 0 ? (
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          ({itemCount})
        </span>
      ) : null}
    </h3>
    <button
      type="button"
      onClick={onToggle}
      className="text-xs text-blue-600 hover:text-blue-800 hover:underline shrink-0"
      data-testid="toggle-line-items-visibility"
    >
      {showLineItems ? 'Hide details' : 'Show details'}
    </button>
  </div>
);

export default LineItemsSummary;
