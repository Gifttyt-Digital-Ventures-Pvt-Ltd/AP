import React, { useMemo, useState } from "react";
import {
  useAcceptInvoiceMatchGroupCriterionMutation,
  useAcceptInvoiceMatchGroupOverallMutation,
  useAcceptInvoiceMatchCriterionMutation,
  useAcceptInvoiceMatchOverallMutation,
  useGetInvoiceMatchingGroupAcceptanceLogQuery,
  useGetInvoiceMatchingGroupChecklistQuery,
  useGetInvoiceMatchingAcceptanceLogQuery,
  useGetInvoiceMatchingChecklistQuery,
} from "../../../Services/apis/invoiceMatchingApi";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Progress } from "../../../components/ui/progress";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Textarea } from "../../../components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  History,
  Info,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const CRITERION_META = {
  VENDOR_NAME: {
    label: "Vendor Name",
  },
  PO_INVOICE_NUMBER: {
    label: "PO / Invoice Number",
  },
  PRE_TAX_AMOUNT: {
    label: "Pre-tax Amount",
  },
  POST_TAX_AMOUNT: {
    label: "After-tax Amount",
  },
  LINE_ITEMS: {
    label: "Line Items",
  },
  VENDOR_GSTIN: {
    label: "Vendor GST Number",
  },
  CLIENT_GSTIN: {
    label: "Client GST Number",
  },
  BILLING_ADDRESS: {
    label: "Billing Address",
  },
  SHIPPING_ADDRESS: {
    label: "Shipping Address",
  },
  GST_RATE: {
    label: "GST Rate",
  },
};

const STATUS_META = {
  MATCHED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PARTIAL_MATCH: "bg-amber-100 text-amber-700 border-amber-200",
  MISMATCH: "bg-red-100 text-red-700 border-red-200",
  RESOLVED: "bg-blue-100 text-blue-700 border-blue-200",
  EXCEPTION: "bg-slate-100 text-slate-700 border-slate-200",
};

const TERMINAL_STATUSES = ["MATCHED", "RESOLVED", "EXCEPTION"];

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const titleCase = (value) =>
  String(value || "-")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getApiErrorMessage = (error, fallback) => {
  const code = error?.data?.code || error?.data?.errorCode;
  const mapped = {
    CRITERION_ALREADY_PASSED: "This criterion already passed and does not need acceptance.",
    CRITERION_ALREADY_ACCEPTED: "This criterion was already accepted. Refreshing the scorecard.",
    ACCEPTANCE_REASON_REQUIRED: "Please enter a reason before accepting.",
    INVALID_TRANSITION: "This match is no longer open for acceptance.",
  };
  return mapped[code] || error?.data?.message || error?.error || fallback;
};

const formatPercent = (value, digits = 2) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "0.00";
};

const formatChecklistValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getChecklistPayload = (payload) => {
  if (!payload) return null;
  if (payload.data?.checklist) return payload.data.checklist;
  if (payload.data) return payload.data;
  return payload;
};

const getAcceptanceLogPayload = (payload, checklistLog = []) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(checklistLog)) return checklistLog;
  return [];
};

const ResultBadge = ({ passed, accepted }) => {
  if (passed) {
    return (
      <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Pass
      </Badge>
    );
  }

  if (accepted) {
    return (
      <Badge className="border border-blue-200 bg-blue-100 text-blue-700">
        <ShieldCheck className="mr-1 h-3 w-3" />
        Accepted
      </Badge>
    );
  }

  return (
    <Badge className="border border-red-200 bg-red-100 text-red-700">
      <XCircle className="mr-1 h-3 w-3" />
      Fail
    </Badge>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);
  return (
    <Badge className={`border ${STATUS_META[normalized] || STATUS_META.EXCEPTION}`}>
      {titleCase(normalized)}
    </Badge>
  );
};

const SimilarityCell = ({ criterion }) => {
  const pct = Math.max(0, Math.min(100, Number(criterion.similarityPct || 0)));
  const exact = criterion.comparisonType === "NUMERIC_EXACT";

  if (exact) {
    return (
      <span className="text-sm font-medium text-foreground">
        {pct === 100 ? "Exact" : "Differs"}
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Progress
          value={pct}
          role="meter"
          aria-label={`${CRITERION_META[criterion.criterionType]?.label || "Criterion"} similarity`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 min-w-0 flex-1"
        />
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatPercent(pct, 1)}%
        </span>
      </div>
      {criterion.thresholdApplied !== null && criterion.thresholdApplied !== undefined ? (
        <div className="mt-1 text-right text-[11px] text-muted-foreground">
          Threshold {formatPercent(criterion.thresholdApplied, 0)}%
        </div>
      ) : null}
    </div>
  );
};

const LineItemsDetail = ({ detail }) => {
  const mismatches = Array.isArray(detail?.mismatchedLines) ? detail.mismatchedLines : [];
  const statClass = (ok) =>
    ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid gap-2 md:grid-cols-4">
        <div className={`rounded-md border px-3 py-2 text-sm ${statClass(detail?.lineCountMatch)}`}>
          <div className="text-xs font-medium uppercase tracking-wide">Line Count</div>
          <div className="font-semibold">{detail?.lineCountMatch ? "Matched" : "Differs"}</div>
        </div>
        <div className={`rounded-md border px-3 py-2 text-sm ${statClass(Number(detail?.rateScore) === 100)}`}>
          <div className="text-xs font-medium uppercase tracking-wide">Rate Match</div>
          <div className="font-semibold">{formatPercent(detail?.rateScore)}%</div>
        </div>
        <div className={`rounded-md border px-3 py-2 text-sm ${statClass(Number(detail?.qtyScore) === 100)}`}>
          <div className="text-xs font-medium uppercase tracking-wide">Qty Match</div>
          <div className="font-semibold">{formatPercent(detail?.qtyScore)}%</div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paired Lines</div>
          <div className="font-semibold">{Number(detail?.pairedLines || 0)}</div>
        </div>
      </div>

      {mismatches.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border bg-background">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[38%]">Item</TableHead>
                <TableHead className="w-[22%]">Field</TableHead>
                <TableHead className="w-[20%]">Invoice</TableHead>
                <TableHead className="w-[20%]">PO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatches.map((mismatch, index) => (
                <TableRow key={`${mismatch.matchKey}-${mismatch.field}-${index}`}>
                  <TableCell className="truncate font-medium" title={mismatch.matchKey || "-"}>
                    {mismatch.matchKey || "-"}
                  </TableCell>
                  <TableCell className="truncate" title={titleCase(mismatch.field)}>
                    {titleCase(mismatch.field)}
                  </TableCell>
                  <TableCell className="truncate tabular-nums" title={formatChecklistValue(mismatch.invoice)}>
                    {formatChecklistValue(mismatch.invoice)}
                  </TableCell>
                  <TableCell className="truncate tabular-nums" title={formatChecklistValue(mismatch.po)}>
                    {formatChecklistValue(mismatch.po)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No line-level mismatches returned.</p>
      )}
    </div>
  );
};

const AcceptMismatchDialog = ({
  open,
  onOpenChange,
  targetId,
  scopeType = "MATCH",
  criterion,
  scope,
  onAccepted,
}) => {
  const [reason, setReason] = useState("");
  const [acceptCriterion, criterionState] = useAcceptInvoiceMatchCriterionMutation();
  const [acceptOverall, overallState] = useAcceptInvoiceMatchOverallMutation();
  const [acceptGroupCriterion, groupCriterionState] = useAcceptInvoiceMatchGroupCriterionMutation();
  const [acceptGroupOverall, groupOverallState] = useAcceptInvoiceMatchGroupOverallMutation();
  const loading =
    criterionState.isLoading ||
    overallState.isLoading ||
    groupCriterionState.isLoading ||
    groupOverallState.isLoading;
  const isOverall = scope === "OVERALL";
  const isGroupScope = scopeType === "GROUP";
  const criterionLabel = CRITERION_META[criterion?.criterionType]?.label || titleCase(criterion?.criterionType);

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;

    try {
      if (isOverall) {
        if (isGroupScope) {
          await acceptGroupOverall({ groupId: targetId, reason: trimmedReason }).unwrap();
        } else {
          await acceptOverall({ matchId: targetId, reason: trimmedReason }).unwrap();
        }
        toast.success("Overall mismatch accepted");
      } else {
        if (isGroupScope) {
          await acceptGroupCriterion({
            groupId: targetId,
            criterionType: criterion.criterionType,
            reason: trimmedReason,
          }).unwrap();
        } else {
          await acceptCriterion({
            matchId: targetId,
            criterionType: criterion.criterionType,
            reason: trimmedReason,
          }).unwrap();
        }
        toast.success(`${criterionLabel} mismatch accepted`);
      }
      setReason("");
      onOpenChange(false);
      onAccepted?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to accept mismatch"));
      if (error?.status === 409) onAccepted?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isOverall ? "Accept overall mismatch" : `Accept mismatch: ${criterionLabel}`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {isOverall
            ? "This resolves the match and logs the decision with your reason."
            : "This acknowledges this criterion mismatch without changing the raw pass/fail score."}
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Reason <span className="text-red-500">*</span>
          </label>
          <Textarea
            autoFocus
            value={reason}
            maxLength={500}
            rows={4}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Add the business reason for accepting this mismatch."
          />
          <div className="text-right text-xs text-muted-foreground">{reason.length}/500</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || loading}
            className={isOverall ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isOverall ? "Accept & Resolve" : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MatchChecklistPanel = ({ matchId, groupId, group, scope = "MATCH" }) => {
  const [expandedCriterion, setExpandedCriterion] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const isGroupScope = scope === "GROUP";
  const targetId = isGroupScope ? groupId : matchId;

  const {
    data: matchChecklistResponse,
    isFetching: matchChecklistFetching,
    isError: matchChecklistError,
    refetch: refetchMatchChecklist,
  } = useGetInvoiceMatchingChecklistQuery(matchId, { skip: isGroupScope || !matchId });

  const {
    data: groupChecklistResponse,
    isFetching: groupChecklistFetching,
    isError: groupChecklistError,
    refetch: refetchGroupChecklist,
  } = useGetInvoiceMatchingGroupChecklistQuery(groupId, { skip: !isGroupScope || !groupId });

  const checklistResponse = isGroupScope ? groupChecklistResponse : matchChecklistResponse;
  const isFetching = isGroupScope ? groupChecklistFetching : matchChecklistFetching;
  const isError = isGroupScope ? groupChecklistError : matchChecklistError;
  const refetch = isGroupScope ? refetchGroupChecklist : refetchMatchChecklist;

  const checklist = useMemo(() => getChecklistPayload(checklistResponse), [checklistResponse]);

  const {
    data: matchLogResponse,
    isFetching: matchLogFetching,
    refetch: refetchMatchLog,
  } = useGetInvoiceMatchingAcceptanceLogQuery(matchId, {
    skip: isGroupScope || !matchId || checklist?.checklistAvailable === false,
  });

  const {
    data: groupLogResponse,
    isFetching: groupLogFetching,
    refetch: refetchGroupLog,
  } = useGetInvoiceMatchingGroupAcceptanceLogQuery(groupId, {
    skip: !isGroupScope || !groupId || checklist?.checklistAvailable === false,
  });

  const logResponse = isGroupScope ? groupLogResponse : matchLogResponse;
  const logFetching = isGroupScope ? groupLogFetching : matchLogFetching;
  const refetchLog = isGroupScope ? refetchGroupLog : refetchMatchLog;

  const criteria = useMemo(() => {
    const list = Array.isArray(checklist?.criteria) ? checklist.criteria : [];
    return [...list].sort((left, right) => Number(left.displayOrder || 0) - Number(right.displayOrder || 0));
  }, [checklist?.criteria]);

  const acceptanceLog = useMemo(
    () => getAcceptanceLogPayload(logResponse, checklist?.acceptanceLog),
    [logResponse, checklist?.acceptanceLog],
  );

  if (!targetId) return null;

  if (isFetching && !checklist) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Checklist Scorecard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50/60">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Unable to load checklist scorecard</p>
              <p className="text-sm text-red-700">
                Retry once the {isGroupScope ? "group matching" : "matching"} service is available.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={refetch}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (checklist?.checklistAvailable === false) {
    return (
      <Card className="border-blue-200 bg-blue-50/60">
        <CardContent className="flex gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <p className="font-semibold text-blue-900">Checklist scorecard is not available</p>
            <p className="text-sm text-blue-800">
              {isGroupScope
                ? "This PO group does not have a cumulative checklist yet. Re-run matching after the backend migration."
                : "This match was created before checklist matching. Edit and resubmit the match to generate a scorecard."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checklist) return null;

  const status = normalizeStatus(checklist.status);
  const isTerminal = TERMINAL_STATUSES.includes(status);
  const passedCount = Number(checklist.passedCriteriaCount || 0);
  const totalCount = Number(checklist.totalCriteriaCount || criteria.length || 10);
  const overallPct = Number(checklist.overallMatchPct || 0);
  const hasMinorTextDifferences =
    status === "PARTIAL_MATCH" && totalCount > 0 && passedCount === totalCount && overallPct < 100;
  const failingOpenCount = criteria.filter((item) => !item.passed && !item.isAccepted).length;
  const canAcceptOverall = !isTerminal && (status === "PARTIAL_MATCH" || status === "MISMATCH");

  const refreshChecklist = () => {
    refetch();
    refetchLog();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Checklist Scorecard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <Badge variant="outline">{checklist.matchType === "THREE_WAY" ? "3-Way" : "2-Way"}</Badge>
                {isGroupScope ? (
                  <Badge variant="outline">
                    {Number(checklist.invoiceCount ?? group?.invoiceMatches?.length ?? 0)} invoice
                    {Number(checklist.invoiceCount ?? group?.invoiceMatches?.length ?? 0) === 1 ? "" : "s"}
                  </Badge>
                ) : null}
                {hasMinorTextDifferences ? (
                  <Badge className="border border-amber-200 bg-amber-50 text-amber-700">
                    All criteria passed with minor text differences
                  </Badge>
                ) : null}
              </div>
              <div className="mt-2 truncate text-sm text-muted-foreground">
                {isGroupScope
                  ? `${checklist.poNumber || group?.poNumber || "PO"} · cumulative invoices against PO`
                  : `${checklist.matchNumber || "Match"} · ${checklist.vendorName || "-"} · ${
                      checklist.invoiceNumber || "-"
                    } against ${checklist.poNumber || "-"}`}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Match Score</div>
              <div className="text-2xl font-semibold tabular-nums">{formatPercent(overallPct)}%</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Criteria Passed</div>
              <div className="text-2xl font-semibold tabular-nums">
                {passedCount}/{totalCount}
              </div>
            </div>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">Criterion</TableHead>
                  <TableHead className="w-[18%]">Invoice Value</TableHead>
                  <TableHead className="w-[18%]">PO Value</TableHead>
                  <TableHead className="w-[21%]">Similarity</TableHead>
                  <TableHead className="w-[11%]">Result</TableHead>
                  <TableHead className="w-[10%] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.map((criterion) => {
                  const meta = CRITERION_META[criterion.criterionType] || {
                    label: titleCase(criterion.criterionType),
                    hint: "",
                  };
                  const isLineItems = criterion.criterionType === "LINE_ITEMS";
                  const isExpanded = expandedCriterion === criterion.criterionType;
                  const invoiceValue = formatChecklistValue(criterion.invoiceValue);
                  const poValue = formatChecklistValue(criterion.poValue);

                  return (
                    <React.Fragment key={criterion.criterionType}>
                      <TableRow>
                        <TableCell className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isLineItems ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                  setExpandedCriterion(isExpanded ? null : criterion.criterionType)
                                }
                                aria-label={isExpanded ? "Collapse line item checks" : "Expand line item checks"}
                              >
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                />
                              </Button>
                            ) : null}
                            <div className="min-w-0">
                              <div className="truncate font-medium" title={meta.label}>
                                {meta.label}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="truncate" title={invoiceValue}>
                          {invoiceValue}
                        </TableCell>
                        <TableCell className="truncate" title={poValue}>
                          {poValue}
                        </TableCell>
                        <TableCell className="min-w-0">
                          <SimilarityCell criterion={criterion} />
                        </TableCell>
                        <TableCell className="min-w-0">
                          <ResultBadge passed={criterion.passed} accepted={criterion.isAccepted} />
                        </TableCell>
                        <TableCell className="min-w-0 text-right">
                          {!isTerminal && !criterion.passed && !criterion.isAccepted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-2"
                              onClick={() => setAcceptTarget({ scope: "CRITERION", criterion })}
                            >
                              Accept
                            </Button>
                          ) : criterion.isAccepted ? (
                            <span
                              className="text-xs text-muted-foreground"
                              title={criterion.acceptanceReason || "Accepted"}
                            >
                              Accepted
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {isLineItems && isExpanded ? (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={6}>
                            <LineItemsDetail detail={criterion.subDetail || {}} />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {canAcceptOverall ? (
            <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-red-800">
                <p className="font-semibold">Accept overall mismatch</p>
                <p>
                  {failingOpenCount > 0
                    ? `${failingOpenCount} criterion(s) still need review.`
                    : "All failing criteria have been individually accepted."}{" "}
                  This will resolve the match and log your decision.
                </p>
              </div>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setAcceptTarget({ scope: "OVERALL" })}
              >
                Accept Overall Mismatch
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            Acceptance Log
          </CardTitle>
          {logFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </CardHeader>
        <CardContent>
          {acceptanceLog.length > 0 ? (
            <div className="space-y-2">
              {acceptanceLog.map((entry, index) => (
                <div
                  key={entry.id || `${entry.scope}-${entry.acceptedAt}-${index}`}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">
                      {entry.scope === "OVERALL"
                        ? "Overall mismatch accepted"
                        : `${CRITERION_META[entry.criterionType]?.label || titleCase(entry.criterionType)} accepted`}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(entry.acceptedAt)}</div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.reason || "-"}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    By {entry.acceptedByName || entry.acceptedBy || "-"}
                    {entry.previousStatus || entry.newStatus
                      ? ` · ${titleCase(entry.previousStatus)} → ${titleCase(entry.newStatus)}`
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No mismatch acceptances recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <AcceptMismatchDialog
        open={Boolean(acceptTarget)}
        onOpenChange={(open) => {
          if (!open) setAcceptTarget(null);
        }}
        targetId={targetId}
        scopeType={scope}
        scope={acceptTarget?.scope}
        criterion={acceptTarget?.criterion}
        onAccepted={refreshChecklist}
      />
    </div>
  );
};

export default MatchChecklistPanel;
