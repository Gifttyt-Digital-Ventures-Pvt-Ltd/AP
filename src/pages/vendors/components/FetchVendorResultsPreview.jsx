import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import { formatRegistrationLocation } from "../utils/vendorGstRegistrations";

const FetchVendorResultsPreview = ({
  fetchMode,
  records,
  selectedGstins,
  onToggleGstin,
  onSelectAll,
  onSelectNone,
  onApply,
}) => {
  if (!records.length) return null;

  const firstRecord = records[0];
  const isPanMode = fetchMode === "pan";
  const selectedCount = selectedGstins.size;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <div className="font-semibold">{firstRecord.legalName || firstRecord.tradeName}</div>
        {firstRecord.tradeName &&
        firstRecord.legalName &&
        firstRecord.tradeName.trim().toUpperCase() !== firstRecord.legalName.trim().toUpperCase() ? (
          <div className="mt-0.5 text-xs">
            Trade name: <span className="font-medium">{firstRecord.tradeName}</span>
          </div>
        ) : null}
        <div className="mt-0.5 text-xs">
          PAN: <span className="font-mono font-medium">{firstRecord.pan || "—"}</span>
          {" · "}
          {records.length} GSTIN{records.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {isPanMode ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <span className="text-xs font-semibold text-foreground">
              GSTINs Found ({records.length})
            </span>
            <div className="flex gap-2">
              <button type="button" className="text-xs font-medium text-primary" onClick={onSelectAll}>
                All
              </button>
              <button type="button" className="text-xs text-muted-foreground" onClick={onSelectNone}>
                None
              </button>
            </div>
          </div>
            {records.map((record) => {
            const checked = selectedGstins.has(record.gstin);
            return (
              <div
                key={record.gstin}
                role="button"
                tabIndex={0}
                onClick={() => onToggleGstin(record.gstin)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggleGstin(record.gstin);
                  }
                }}
                className={`flex w-full min-w-0 cursor-pointer items-start gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 sm:items-center ${
                  checked ? "bg-primary/5" : "bg-background hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggleGstin(record.gstin)}
                  onClick={(event) => event.stopPropagation()}
                  className="mt-0.5 shrink-0 sm:mt-0"
                />
                <span className="min-w-0 shrink-0 font-mono text-xs font-semibold text-primary sm:min-w-[9.5rem]">
                  {record.gstin}
                </span>
                <span className="min-w-0 flex-1 break-words text-sm text-foreground">
                  {record.state || "—"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border text-sm">
          {[
            ["State", firstRecord.state],
            ["Address", firstRecord.address || formatRegistrationLocation(firstRecord)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-1 border-b border-border px-3 py-2 last:border-b-0 sm:flex-row sm:gap-3"
            >
              <span className="shrink-0 text-xs font-semibold text-muted-foreground sm:min-w-24">
                {label}
              </span>
              <span className="min-w-0 break-words text-foreground">{value || "—"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={selectedCount === 0}
          onClick={onApply}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isPanMode
            ? `Add ${selectedCount} Selected GSTIN${selectedCount !== 1 ? "s" : ""}`
            : "Add GSTIN"}
        </Button>
      </div>
    </div>
  );
};

export default FetchVendorResultsPreview;
