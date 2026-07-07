import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { formatCurrency } from '../../../utils/currency';
import { PI_MATCH_LABELS } from '../constants/proformaInvoice';

const MatchRow = ({ label, value, ok }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={`inline-flex items-center gap-1 font-medium ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {value}
    </span>
  </div>
);

const PiLinkValidationCard = ({ validation, selectedPi, currency = 'INR', loading = false }) => {
  if (!selectedPi) return null;

  if (loading && !validation) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Selected Proforma Invoice</CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedPi.invoiceNumber} · {selectedPi.vendorName}
          </p>
        </CardHeader>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validating PI link...
        </CardContent>
      </Card>
    );
  }

  if (!validation) return null;

  const statusLabel = PI_MATCH_LABELS[validation.statusLabel] || validation.statusLabel;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Selected Proforma Invoice</CardTitle>
        <p className="text-sm text-muted-foreground">
          {selectedPi.invoiceNumber} · {selectedPi.vendorName}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <MatchRow label="Vendor" value={validation.vendorMatch ? 'Match' : 'Mismatch'} ok={validation.vendorMatch} />
        <MatchRow label="PO" value={validation.poMatch ? 'Match' : 'No match'} ok={validation.poMatch} />
        <MatchRow
          label="Line items"
          value={`${validation.lineItemMatchPercent ?? 0}% match`}
          ok={(validation.lineItemMatchPercent ?? 0) >= 80}
        />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Invoice amount</span>
          <span className="font-medium">
            {formatCurrency(validation.invoiceAmount ?? 0, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Remaining PI balance</span>
          <span className="font-medium">
            {formatCurrency(validation.piRemainingBalance ?? 0, currency)}
          </span>
        </div>
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm font-medium">
          {statusLabel}
          {loading ? (
            <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin align-text-bottom" />
          ) : null}
        </div>
        {validation.warnings?.length > 0 && (
          <div className="space-y-1 text-sm text-amber-700">
            {validation.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PiLinkValidationCard;
