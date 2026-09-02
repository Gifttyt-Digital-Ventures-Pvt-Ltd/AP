import React from "react";
import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../utils/currency";
import { documentChainStateMeta } from "../constants";
import { formatDate } from "../utils";

const CHAIN_TYPE_LABELS = { PO: "Purchase Order", GRN: "Goods Receipt", PI: "Proforma Invoice", TI: "Tax Invoice" };

/**
 * One row per document type — PO, GRN, PI, TI (spec §12.2), each showing
 * state plus number/date/value, multi-document safe (no assumption of
 * exactly one GRN/TI per order). Document numbers are clickable.
 */
const OrderTrackingDocumentChainSection = ({
  documentChain,
  currency,
  onOpenDocument,
  canUseGrn = true,
  canUsePi = true,
  canUseTi = true,
}) => (
  <div className="space-y-2" data-testid="order-tracking-document-chain-section">
    {documentChain.filter((entry) => {
      if (entry.type === "GRN") return canUseGrn;
      if (entry.type === "PI") return canUsePi;
      if (entry.type === "TI") return canUseTi;
      return true;
    }).map((entry) => {
      const documents = (entry.documents || []).filter(
        (doc) => doc.state !== "UNLINKED"
      );
      return (
        <div key={entry.type} className="rounded-md border border-border p-2.5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{CHAIN_TYPE_LABELS[entry.type] || entry.type}</p>
          {documents.length === 0 ? (
            <Badge variant="outline" className={`border-0 ${documentChainStateMeta.NOT_RECEIVED.className}`}>
              Not received
            </Badge>
          ) : (
            <div className="space-y-1.5">
              {documents.map((doc) => {
                const meta = documentChainStateMeta[doc.state] || documentChainStateMeta.PRESENT;
                return (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      className="font-medium text-button-primary underline-offset-2 hover:underline"
                      onClick={() => onOpenDocument?.({ type: entry.type, ...doc })}
                      data-testid={`order-tracking-drawer-doc-${doc.id}`}
                    >
                      {doc.number}
                    </button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(doc.date)}</span>
                      {doc.value != null ? <span>{formatCurrency(doc.value, currency)}</span> : null}
                      <Badge variant="outline" className={`border-0 font-medium ${meta.className}`}>
                        {meta.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default OrderTrackingDocumentChainSection;
