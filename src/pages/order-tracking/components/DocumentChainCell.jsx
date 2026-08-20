import React from "react";
import { CheckCircle2, Circle, Minus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { documentChainStateMeta } from "../constants";

const STATE_ICONS = {
  PRESENT: CheckCircle2,
  PARTIAL: Circle,
  NOT_RECEIVED: Minus,
  NOT_APPLICABLE: X,
};

/**
 * One GRN/PI/TI segment — icon-over-label, matching the reference design.
 * A single document opens directly on click; multiple documents open a
 * short list instead (spec §7: "Where multiple GRNs or TIs exist, show a
 * short list"). TI also shows received-vs-order value on hover when
 * partial, per spec §7's explicit callout.
 */
const ChainSegment = ({ label, type, slot, onOpenDocument }) => {
  const meta = documentChainStateMeta[slot.state] || documentChainStateMeta.NOT_RECEIVED;
  const Icon = STATE_ICONS[slot.state] || Minus;
  const isClickable = slot.documents.length > 0;
  const title =
    type === "TI" && slot.state === "PARTIAL"
      ? `${label}: ${meta.label} — received ${slot.receivedValue ?? 0} of ${slot.orderValue ?? 0}`
      : `${label}: ${meta.label}`;

  const content = (
    <div
      className={`flex flex-col items-center gap-1 ${meta.className} ${isClickable ? "cursor-pointer hover:opacity-75" : ""}`}
      title={title}
      data-testid={`document-chain-${type.toLowerCase()}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );

  if (!isClickable) return content;

  if (slot.documents.length === 1) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenDocument?.({ type, ...slot.documents[0] });
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(event) => event.stopPropagation()}>
        {content}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" onClick={(event) => event.stopPropagation()}>
        <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">{label} documents</p>
        <div className="space-y-0.5">
          {slot.documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className="block w-full rounded px-1.5 py-1 text-left text-sm hover:bg-muted"
              onClick={() => onOpenDocument?.({ type, ...doc })}
              data-testid={`document-chain-${type.toLowerCase()}-item-${doc.id}`}
            >
              {doc.number}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DocumentChainCell = ({ documentChain, onOpenDocument }) => (
  <div className="flex w-full items-start justify-start gap-6" data-testid="document-chain-cell">
    <ChainSegment label="GRN" type="GRN" slot={documentChain.grn} onOpenDocument={onOpenDocument} />
    <ChainSegment label="PI" type="PI" slot={documentChain.pi} onOpenDocument={onOpenDocument} />
    <ChainSegment label="TI" type="TI" slot={documentChain.ti} onOpenDocument={onOpenDocument} />
  </div>
);

export default DocumentChainCell;
