import React, { useState } from "react";
import { CheckCircle2, ChevronDown, HelpCircle, XCircle } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../../components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import AppDataTable from "../../../../components/common/AppDataTable";
import { cn } from "../../../../lib/utils";

// FE §3.2 — the 8 checklist criteria + G09 (internal, surfaced per BE §5/B4).
const CRITERION_LABELS = {
  G01: "Invoice number",
  G02: "Taxable amount",
  G03: "GST rate",
  G04: "Total GST amount",
  G05: "Total amount",
  G06: "Cess amount",
  G07: "GST number",
  G08: "Invoice date",
  // G09: "Tax split consistency",
};

const OUTCOME_CONFIG = {
  PASS: { icon: CheckCircle2, className: "text-green-600" },
  FAIL: { icon: XCircle, className: "text-red-600" },
  NOT_APPLICABLE: { icon: HelpCircle, className: "text-slate-400" },
};

// The backend stores criterion values as JSONB and serializes them as JSON-encoded strings
// (e.g. platformValue arrives as the string `"INV-001"`, quotes included) — unwrap that before
// display so scalars don't render with literal quote marks.
const formatCriterionValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed === null || parsed === undefined || parsed === "") return "-";
      return typeof parsed === "object"
        ? JSON.stringify(parsed)
        : String(parsed);
    } catch {
      return value;
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const parseJsonValue = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const formatDeltaScalar = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  return text.replace(/^(-?)0\.(\d+)$/, "$1.$2");
};

const formatDeltaValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = parseJsonValue(value);
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    ("abs" in parsed || "tolerance" in parsed)
  ) {
    if (parsed.abs !== null && parsed.abs !== undefined) {
      return formatDeltaScalar(parsed.abs);
    }
    return "-";
  }
  return formatDeltaScalar(parsed);
};

const OutcomeCell = ({ outcome, reason }) => {
  const config = OUTCOME_CONFIG[outcome] ?? OUTCOME_CONFIG.NOT_APPLICABLE;
  const Icon = config.icon;
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        config.className,
      )}
    >
      <Icon className="h-4 w-4" />
      {outcome === "NOT_APPLICABLE"
        ? "N/A"
        : outcome === "PASS"
          ? "Pass"
          : "Fail"}
    </span>
  );

  if (!reason) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-default">
          {badge}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
};

const checklistColumns = [
  {
    key: "criterion",
    header: "Criterion",
    cellClassName: "font-medium",
    render: (row) => CRITERION_LABELS[row.code] ?? row.label ?? row.code,
  },
  {
    key: "platformValue",
    header: "Platform value",
    render: (row) => formatCriterionValue(row.platformValue),
  },
  {
    key: "gstValue",
    header: "GST value",
    render: (row) => formatCriterionValue(row.gstValue),
  },
  {
    key: "delta",
    header: "Delta",
    render: (row) => formatDeltaValue(row.delta),
  },
  {
    key: "outcome",
    header: "Outcome",
    render: (row) => <OutcomeCell outcome={row.outcome} reason={row.reason} />,
  },
];

const getChecklistRowClassName = (row) =>
  row.outcome === "FAIL" ? "bg-red-50/40" : undefined;

/** FE §3.2 — two-column checklist comparison table (E1), one row per criterion. */
export const GstReconChecklistTable = ({ criteria = [] }) => (
  <AppDataTable
    columns={checklistColumns}
    rows={criteria}
    rowKey={(row) => row.code}
    getRowClassName={getChecklistRowClassName}
    emptyMessage="No checklist results for this invoice."
    bordered
  />
);

const SPLIT_ROWS = [
  { key: "igst", label: "IGST" },
  { key: "cgst", label: "CGST" },
  { key: "sgst", label: "SGST" },
  { key: "cess", label: "Cess" },
];

const formatAmount = (value) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

/** FE §3.3 — tax-split comparison table (B4) plus a collapsible rate-slab drill-down. */
export const GstReconSplitPanel = ({ split, slabs }) => {
  const [slabsOpen, setSlabsOpen] = useState(false);
  // const hasSlabs = Boolean(slabs?.platform?.length || slabs?.gst?.length);

  return (
    <div className="space-y-3">
      {split ? (
        <AppDataTable
          columns={[
            {
              key: "component",
              header: "Component",
              cellClassName: "font-medium",
            },
            {
              key: "platform",
              header: "Platform",
              render: (row) => formatAmount(split?.platform?.[row.key]),
            },
            {
              key: "gst",
              header: "GST",
              render: (row) => formatAmount(split?.gst?.[row.key]),
            },
          ]}
          rows={SPLIT_ROWS.map((row) => ({ ...row, component: row.label }))}
          rowKey={(row) => row.key}
          bordered
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          No tax-split data available for this invoice.
        </p>
      )}
    </div>
  );
};

/** FE §3.1 — `passed / evaluated` score pill. */
export const GstReconScorePill = ({ passed, evaluated }) => (
  <Badge
    variant="outline"
    className="gap-1 border-primary/30 bg-primary/5 font-semibold text-primary"
  >
    {passed ?? 0}/{evaluated ?? 0}
  </Badge>
);
