import { AlertTriangle, Info } from "lucide-react";
import { PAYABLE_WARNING_COPY, RELEASE_BLOCKER_COPY } from "../constants/payables";

const normalizeItems = (items) => (Array.isArray(items) ? items : items ? [items] : []);

const ReleaseBlockerList = ({ blockers = [], warnings = [], disabledReason = "" }) => {
  const normalizedBlockers = normalizeItems(blockers);
  const normalizedWarnings = normalizeItems(warnings);
  const hasDisabledReason = disabledReason && normalizedBlockers.length === 0;

  if (!normalizedBlockers.length && !normalizedWarnings.length && !hasDisabledReason) return null;

  return (
    <div className="min-w-0 space-y-1">
      {hasDisabledReason ? (
        <div className="flex min-w-0 items-start gap-1 text-[11px] text-amber-700">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="truncate" title={disabledReason}>{disabledReason}</span>
        </div>
      ) : null}
      {normalizedBlockers.map((blocker, index) => {
        const code = blocker?.code || blocker?.blockerCode || blocker;
        const message = blocker?.message || RELEASE_BLOCKER_COPY[code] || String(code || "Blocked");
        return (
          <div key={`${code}-${index}`} className="flex min-w-0 items-start gap-1 text-[11px] text-amber-700">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="truncate" title={message}>{message}</span>
          </div>
        );
      })}
      {normalizedWarnings.map((warning, index) => {
        const code = warning?.code || warning?.warningCode || warning;
        const message = warning?.message || PAYABLE_WARNING_COPY[code] || String(code || "Warning");
        return (
          <div key={`${code}-${index}`} className="flex min-w-0 items-start gap-1 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="truncate" title={message}>{message}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ReleaseBlockerList;

